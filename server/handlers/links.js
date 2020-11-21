const isbot = require('isbot');
const URL = require('url');
const bcrypt = require("bcryptjs");

const validators = require('./validators');
const queries = require('../queries');
const queues = require('../queues');
const utils = require('../utils');
const {env} = require('../env');
const {CustomError} = require('../utils');


exports.redirect = (app) => async (req, res, next) => {
    const isBot = isbot(req.headers["user-agent"]);
    const isPreservedUrl = validators.preservedUrls.some(item => item === req.path.replace('/', ''));

    if (isPreservedUrl) return next();

    // 1. If custom domain, get domain info
    const { host } = req.headers;
    const domain = host !== env.DEFAULT_DOMAIN ? await queries.default.domain.find({address: host}) : null;

    // 2. Get link
    const address = req.params.id.replace('+', '');
    const link = await queries.default.link.find({address, domain_id: domain ? domain.id : null})

    // 3. When no link, if has domain redirect to domain's homepage otherwise redirect to 404
    if (!link) {
        return res.redirect(301, domain ? domain.homepage : '/404')
    }

    // 4. If link is banned, redirect to banned page.
    if (link.banned) {
        return res.redirect('/banned');
    }

    // 5. If wants to see link info, then redirect
    const doesRequestInfo = /.*\+$/gi.test(req.params.id);
    if (doesRequestInfo && !link.password) {
        return app.render(req, res, '/url-info', { target: link.target });
    }

    // 6. If link is protected, redirect to password page
    if (link.password) {
        return res.redirect(`/${link.uuid}/protected`);
    }

    // 7. Create link visit
    if (link.user_id && !isBot) {
        queues.default.visit.add({
            headers: req.headers,
            realIP: req.realIP,
            referrer: req.get('Referrer')
        })
    };

    // TODO Google Analytics
    // 8. Create Google Analytics visit
    // if (env.GOOGLE_ANALYTICS_UNIVERSAL && !isBot) {
    //     ua(env.GOOGLE_ANALYTICS_UNIVERSAL)
    //         .pageview({
    //             dp: `/${address}`,
    //             ua: req.headers["user-agent"],
    //             uip: req.realIP,
    //             aip: 1
    //         })
    //         .send();
    // }

    // 9. Redirect to target
    return res.redirect(link.target);
}

exports.redirectCustomDomain = async (req, res, next) => {
    const { headers: {host}, path } = req;
    if (host == env.DEFAULT_DOMAIN) {
        return next();
    }

    if (path === '/' || validators.preservedUrls.filter(l => l !=="url-password").some(item => item === path.replace('/', ''))) {
        const domain = await queries.default.domain.find({address: host});
        const redirectURL = domain ? domain.homepage : `https://${env.DEFAULT_DOMAIN + path}`;
        return res.redirect(301, redirectURL);

    }

    return next();
};

exports.create = async (req, res) => {
    const {reuse, password, customurl, description, target, domainObject, expire_in} = req.body;
    const domain_id = domainObject ? domainObject.id : null;

    const targetDomain = URL.parse(target).hostname;
    const checks = await Promise.all([
        validators.cooldown(req.user),
        validators.malware(req.user, target),
        validators.linksCount(req.user),
        reuse && queries.default.link.find({target, user_id: req.user.id, domain_id}),
        customurl && queries.default.link.find({address: customurl, domain_id}),
        !customurl && utils.generateId(domain_id),
        validators.bannedDomain(targetDomain),
        validators.bannedHost(targetDomain)
    ]);

    // if "reuse" is true, try to return
    // the existent URL without creating one
    if (checks[3]) {
        return res.json(utils.sanitize.link(checks[3]));
    }

    // Check if custom link already exists
    if (checks[4]) {
        throw new CustomError("Custom URL is already in use.");
    }

    //Create new link
    const address = customurl || checks[5];
    const link = await queries.default.link.create({password, address, domain_id, description, target, expire_in, user_id: req.user && req.user.id});

    if (!req.user && env.NON_USER_COOLDOWN) {
        // TODO: ip queries
        // queries.default.ip.add(req.realIP);
    }

    return res.status(201).send(utils.sanitize.link({...link, domain: domainObject?.address}))
};


exports.get = async (req, res) => {
    const { limit, skip, search, all } = req.query;
    const userId = req.user.id;

    const match = {
        ...(!all && { user_id: userId })
    };

    const [links, total] = await Promise.all([
        queries.default.link.get(match, { limit, search, skip }),
        queries.default.link.total(match, { search })
    ]);

    const data = links.map(utils.sanitize.link);

    return res.send({total, limit, skip, data});
};

exports.edit = async (req, res) => {
    const { address, target, description, expire_in } = req.body;

    if (!address && !target) {
        throw new CustomError("Should at least update one field.");
    };

    const link = await queries.default.link.find({uuid: req.params.id, ...(!req.user.admin && { user_id: req.user.id })});

    if (!link) {
        throw new CustomError("Link was not found.");
    }

    const targetDomain = URL.parse(target).hostname;
    const domain_id = link.domain_id || null;

    const checks = await Promise.all([
        validators.cooldown(req.user),
        validators.malware(req.user, target),
        address !== link.address && queries.default.link.find({address, user_id: req.user.id, domain_id}),
        validators.bannedDomain(targetDomain),
        validators.bannedHost(targetDomain)
    ]);

    // Check if custom link already exists
    if (checks[2]) {
        throw new CustomError("Custom URL is already in use.");
    }

    // Update link
    const [updatedLink] = await queries.default.link.update(
        {id: link.id},
        {
            ...(address && { address }),
            ...(description && { description }),
            ...(target && { target }),
            ...(expire_in && { expire_in })
        }
    );

    return res.status(200).send(utils.sanitize.link({ ...link, ...updatedLink }));
};


exports.remove = async (req, res) => {
    const link = await queries.default.link.remove({
        uuid: req.params.id,
        ...(!req.user.admin && { user_id: null })
    });

    if (!link) {
        throw new CustomError("Could not delete the link");
    }

    return res
        .status(200)
        .send({ message: "Link has been deleted successfully." });
};

exports.stats =  async (req, res) => {
    const { user } = req;
    const uuid = req.params.id;

    const link = await queries.default.link.find({...(!user.admin && { user_id: user.id }), uuid});

    if (!link) {
        throw new CustomError("Link could not be found.");
    };

    const stats = await queries.default.visit.find({ link_id: link.id }, link.visit_count);

    if (!stats) {
        throw new CustomError("Could not get the short link stats.");
    }

    return res.status(200).send({...stats, ...utils.sanitize.link(link)});
};

exports.redirectProtected = async (req, res) => {
    // 1. Get link
    const uuid = req.params.id;
    const link = await queries.default.link.find({ uuid });

    // 2. Throw error if no link
    if (!link || !link.password) {
        throw new CustomError("Couldn't find the link.", 400);
    }

    // 3. Check if password matches
    const matches = await bcrypt.compare(req.body.password, link.password);

    if (!matches) {
        throw new CustomError("Password is not correct.", 401);
    }

    // 4. Create visit
    if (link.user_id) {
        queues.default.visit.add({
            headers: req.headers,
            realIP: req.realIP,
            referrer: req.get("Referrer"),
            link
        });
    }

    // 6. Send target
    return res.status(200).send({ target: link.target });
};

exports.report = async (req, res) => {
    const { link } = req.body;

    // TODO email
    // const mail = await transporter.sendMail({
    //     from: env.MAIL_FROM || env.MAIL_USER,
    //     to: env.REPORT_EMAIL,
    //     subject: "[REPORT]",
    //     text: link,
    //     html: link
    // });

    // if (!mail.accepted.length) {
    //     throw new CustomError("Couldn't submit the report. Try again later.");
    // }

    return res.status(200).send({ message: "Thanks for the report, we'll take actions shortly." });
}

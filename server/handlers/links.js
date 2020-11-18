const isbot = require('isbot');
const URL = require('url');

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
        return res.redirect(`/protected/${link.uuid}`);
    }

    // 7. Create link visit
    if (link.user_id && !isBot) {
        queues.default.visit.add({
            headers: req.headers,
            realIP: req.realIP,
            referrer: req.get('Referrer')
        })
    };

    console.log("HERE: ", link.target);
    // 8. Redirect to target
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
    const {reuse, password, customurl, description, target, domain, expire_in} = req.body;
    const domain_id = domain ? domain.id : null;

    const targetDomain = URL.parse(target).hostname;

    //Create new link
    const address = customurl;

    const link = await queries.default.link.create({password, address, domain_id, description, target, expire_in, user_id: req.user && req.user.id})

    return res.status(201).send(utils.sanitize.link({...link, domain: domain?.address}))
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
}

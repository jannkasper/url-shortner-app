const isbot = require('isbot');

const validators = require('./validators');
const queries = require('../queries');
const queues = require('../queues');
const {env} = require('../env');


exports.redirect = (app) => async (req, res, next) => {
    const isBot = isbot(req.headers["user-agent"]);
    const isPreservedUrl = validators.preservedUrls.some(item => item === req.path.replace('/', ''));

    if (isPreservedUrl) return next();

    // 1. If custom domain, get domain info
    const { host } = req.headers;
    // const domain = host !== env.DEFAULT_DOMAIN ? await queries.default.domain.find({address: host}) : null;

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

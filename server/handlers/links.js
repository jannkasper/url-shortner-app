const validators = require('./validators');
const queries = require('../queries');
const {env} = require('../env');


exports.redirectCustomDomain = async (req,res,next) => {
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
}

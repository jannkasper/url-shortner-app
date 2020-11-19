const {addDays} = require("date-fns");

const {env} = require('../env');
const jwt = require('jsonwebtoken');

class CustomError extends Error {
    constructor(message, statusCode = 500, data) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.data = data;
    }
}

exports.isAdmin = (email) => {
    return env.ADMIN_EMAILS.split(",").map(e => e.trim()).includes(email);
}

exports.CustomError = CustomError;

exports.generateShortLink = (id, domain) => {
    const protocol = env.CUSTOM_DOMAIN_USE_HTTPS || !domain ? "https://" : "http://";
    return `${protocol}${domain || env.DEFAULT_DOMAIN}/${id}`;
}

exports.sanitize = {
    domain: (domain) => ({
        ...domain,
        id: domain.uuid,
        uuid: undefined,
        user_id: undefined,
        banned_by_id: undefined
    }),
    link: (link) => ({
        ...link,
        banned_by_id: undefined,
        domain_id: undefined,
        user_id: undefined,
        uuid: undefined,
        id: link.uuid,
        password: !!link.password,
        link: exports.generateShortLink(link.address, link.domain)
    })
};

exports.addProtocol = (url) => {
    const hasProtocol = /^\w+:\/\//.test(url);
    return hasProtocol ? url : `http://${url}`;
};

exports.signToken = (user) => {
    return jwt.sign(
        {
            iss: "ApiAuth",
            sub: user.email,
            domain: user.domain || "",
            admin: exports.isAdmin(user.email),
            iat: parseInt((new Date().getTime() / 1000).toFixed(0)),
            exp: parseInt((addDays(new Date(), 7).getTime() / 1000).toFixed(0))
        },
        env.JWT_SECRET
    );
};

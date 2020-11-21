const {differenceInDays, differenceInHours, differenceInMonths, addDays} = require("date-fns");
const {customRandom} = require("nanoid");
const ms = require("ms");

const {env} = require('../env');
const queries = require("../queries");
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

exports.generateId = async (domain_id) => {
    const address = customRandom(
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
        env.LINK_LENGTH
    );
    const link = await queries.default.link.find({ address, domain_id });
    if (!link) return address;
    return generateId(domain_id);
}

exports.getInitStats = () => {
    return Object.create({
        browser: {
            chrome: 0,
            edge: 0,
            firefox: 0,
            ie: 0,
            opera: 0,
            other: 0,
            safari: 0
        },
        os: {
            android: 0,
            ios: 0,
            linux: 0,
            macos: 0,
            other: 0,
            windows: 0
        },
        country: {},
        referrer: {}
    });
};

exports.getUTCDate = (dateString) => {
    const date = new Date(dateString || Date.now());
    return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours()
    );
};

exports.STATS_PERIODS = [
    [1, "lastDay"],
    [7, "lastWeek"],
    [30, "lastMonth"]
];

exports.getDifferenceFunction = (type) => {
    if (type === "lastDay") return differenceInHours;
    if (type === "lastWeek") return differenceInDays;
    if (type === "lastMonth") return differenceInDays;
    if (type === "allTime") return differenceInMonths;
    throw new Error("Unknown type.");
};

exports.statsObjectToArray = (obj) => {
    const objToArr = key =>
        Array.from(Object.keys(obj[key]))
            .map(name => ({name, value: obj[key][name]}))
            .sort((a, b) => b.value - a.value);

    return {
        browser: objToArr("browser"),
        os: objToArr("os"),
        country: objToArr("country"),
        referrer: objToArr("referrer")
    };
};

exports.getStatsCacheTime = (total) => {
    return (total > 50000 ? ms("5 minutes") : ms("1 minutes")) / 1000;
};

exports.getStatsLimit = () =>
    env.DEFAULT_MAX_STATS_PER_LINK || 100000000;

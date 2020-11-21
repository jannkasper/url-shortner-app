const { isAfter, subDays, subHours, addMilliseconds } = require("date-fns");
const {promisify} = require("util");
const express_validator = require("express-validator");
const URL = require("url");
const axios = require("axios");
const urlRegex = require("url-regex");
const bcrypt = require("bcryptjs");
const ms = require("ms");
const dns = require("dns");

const {CustomError, addProtocol} = require("../utils");
const queries = require('../queries');
const knex = require("../knex");
const {env} = require("../env");

const dnsLookup = promisify(dns.lookup);

exports.preservedUrls = [
    "login",
    "logout",
    "signup",
    "reset-password",
    "resetpassword",
    "url-password",
    "url-info",
    "settings",
    "stats",
    "verify",
    "api",
    "404",
    "static",
    "images",
    "banned",
    "terms",
    "privacy",
    "protected",
    "report",
    "pricing"
];

exports.deleteUser = [
    express_validator.body("password", "Password is not valid")
        .exists({checkFalsy: true, checkNull: true})
        .isLength({min:8, max:64})
        .custom( async(password, { req }) => {
            const isMatch = await bcrypt.compare(password, req.user.password);
            if (!isMatch) {
                return Promise.reject();
            }
        })
];

exports.checkUser = (value, { req }) => !!req.user;

exports.createLink = [
    express_validator.body("target")
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage("Target is missing.")
        .isString()
        .trim()
        .isLength({ min: 1, max: 2040 })
        .withMessage("Maximum URL length is 2040.")
        .customSanitizer(addProtocol)
        .custom(
            value => urlRegex({exact: true, strict: false}).test(value) || /^(?!https?)(\w+):\/\//.test(value)
        )
        .withMessage("URL is not valid.")
        .custom(value => URL.parse(value).host !== env.DEFAULT_DOMAIN)
        .withMessage(`${env.DEFAULT_DOMAIN} URLs are not allowed.`),
    express_validator.body("password")
        .optional({ nullable: true, checkFalsy: true })
        .custom(exports.checkUser)
        .withMessage("Only users can use this field.")
        .isString()
        .isLength({ min: 3, max: 64 })
        .withMessage("Password length must be between 3 and 64."),
    express_validator.body("customurl")
        .optional({ nullable: true, checkFalsy: true })
        .custom(exports.checkUser)
        .withMessage("Only users can use this field.")
        .isString()
        .trim()
        .isLength({ min: 1, max: 64 })
        .withMessage("Custom URL length must be between 1 and 64.")
        .custom(value => /^[a-zA-Z0-9-_]+$/g.test(value))
        .withMessage("Custom URL is not valid")
        .custom(value => !exports.preservedUrls.some(url => url.toLowerCase() === value))
        .withMessage("You can't use this custom URL."),
    express_validator.body("reuse")
        .optional({ nullable: true })
        .custom(exports.checkUser)
        .withMessage("Only users can use this field.")
        .isBoolean()
        .withMessage("Reuse must be boolean."),
    express_validator.body("description")
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 0, max: 2040 })
        .withMessage("Description length must be between 0 and 2040."),
    express_validator.body("expire_in")
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .custom(value => {
            try {
                return !!ms(value);
            } catch {
                return false;
            }
        })
        .withMessage("Expire format is invalid. Valid examples: 1m, 8h, 42 days.")
        .customSanitizer(ms)
        .custom(value => value >= ms("1m"))
        .withMessage("Minimum expire time should be '1 minute'.")
        .customSanitizer(value => addMilliseconds(new Date(), value).toISOString()),
    express_validator.body("domain")
        .optional({ nullable: true, checkFalsy: true })
        .custom(exports.checkUser)
        .withMessage("Only users can use this field.")
        .isString()
        .withMessage("Domain should be string.")
        .customSanitizer(value => value.toLowerCase())
        .customSanitizer(value => URL.parse(value).hostname || value)
        .custom(async (address, { req }) => {
            if (address === env.DEFAULT_DOMAIN) {
                req.body.domain = null;
                return;
            }

            const domain = await queries.default.domain.find({
                address,
                user_id: req.user.id
            });
            // TODO problem to overwrite domain param
            req.body.domainObject = domain || null;

            if (!domain) return Promise.reject();
        })
        .withMessage("You can't use this domain.")

];

exports.editLink = [
    express_validator.body("target")
        .optional({ checkFalsy: true, nullable: true })
        .isString()
        .trim()
        .isLength({ min: 1, max: 2040 })
        .withMessage("Maximum URL length is 2040.")
        .customSanitizer(addProtocol)
        .custom(
            value =>
                urlRegex({ exact: true, strict: false }).test(value) ||
                /^(?!https?)(\w+):\/\//.test(value)
        )
        .withMessage("URL is not valid.")
        .custom(value => URL.parse(value).host !== env.DEFAULT_DOMAIN)
        .withMessage(`${env.DEFAULT_DOMAIN} URLs are not allowed.`),
    express_validator.body("address")
        .optional({ checkFalsy: true, nullable: true })
        .isString()
        .trim()
        .isLength({ min: 1, max: 64 })
        .withMessage("Custom URL length must be between 1 and 64.")
        .custom(value => /^[a-zA-Z0-9-_]+$/g.test(value))
        .withMessage("Custom URL is not valid")
        .custom(value => !exports.preservedUrls.some(url => url.toLowerCase() === value))
        .withMessage("You can't use this custom URL."),
    express_validator.body("expire_in")
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .custom(value => {
            try {
                return !!ms(value);
            } catch {
                return false;
            }
        })
        .withMessage("Expire format is invalid. Valid examples: 1m, 8h, 42 days.")
        .customSanitizer(ms)
        .custom(value => value >= ms("1m"))
        .withMessage("Minimum expire time should be '1 minute'.")
        .customSanitizer(value => addMilliseconds(new Date(), value).toISOString()),
    express_validator.body("description")
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 0, max: 2040 })
        .withMessage("Description length must be between 0 and 2040."),
    express_validator.param("id", "ID is invalid.")
        .exists({ checkFalsy: true, checkNull: true })
        .isLength({ min: 36, max: 36 })
];

exports.deleteLink = [
    express_validator.param("id", "ID is invalid.")
        .exists({
            checkFalsy: true,
            checkNull: true
        })
        .isLength({ min: 36, max: 36 })
];

exports.getStats = [
    express_validator.param("id", "ID is invalid.")
        .exists({
            checkFalsy: true,
            checkNull: true
        })
        .isLength({ min: 36, max: 36 })
];

exports.login = [
    express_validator.body("password", "Password is not valid.")
        .exists({ checkFalsy: true, checkNull: true })
        .isLength({ min: 8, max: 64 })
        .withMessage("Password length must be between 8 and 64."),
    express_validator.body("email", "Email is not valid.")
        .exists({ checkFalsy: true, checkNull: true })
        .trim()
        .isEmail()
        .isLength({ min: 0, max: 255 })
        .withMessage("Email length must be max 255.")
];


exports.signup = [
    express_validator.body("password", "Password is not valid.")
        .exists({ checkFalsy: true, checkNull: true })
        .isLength({ min: 8, max: 64 })
        .withMessage("Password length must be between 8 and 64."),
    express_validator.body("email", "Email is not valid.")
        .exists({ checkFalsy: true, checkNull: true })
        .trim()
        .isEmail()
        .isLength({ min: 0, max: 255 })
        .withMessage("Email length must be max 255.")
        .custom(async (value, { req }) => {
            const user = await queries.default.user.find({ email: value });

            if (user) {
                req.user = user;
            }

            if (user?.verified) return Promise.reject();
        })
        .withMessage("You can't use this email address.")
];

exports.changePassword = [
    express_validator.body("password", "Password is not valid.")
        .exists({ checkFalsy: true, checkNull: true })
        .isLength({ min: 8, max: 64 })
        .withMessage("Password length must be between 8 and 64.")
];

exports.addDomain = [
    express_validator.body("address", "Domain is not valid")
        .exists({ checkFalsy: true, checkNull: true })
        .isLength({ min: 3, max: 64 })
        .withMessage("Domain length must be between 3 and 64.")
        .trim()
        .customSanitizer(value => {
            const parsed = URL.parse(value);
            return parsed.hostname || parsed.href;
        })
        .custom(value => urlRegex({ exact: true, strict: false }).test(value))
        .custom(value => value !== env.DEFAULT_DOMAIN)
        .withMessage("You can't use the default domain.")
        .custom(async value => {
            const domain = await queries.default.domain.find({ address: value });
            if (domain?.user_id || domain?.banned) return Promise.reject();
        })
        .withMessage("You can't add this domain."),
    express_validator.body("homepage")
        .optional({ checkFalsy: true, nullable: true })
        .customSanitizer(addProtocol)
        .custom(value => urlRegex({ exact: true, strict: false }).test(value))
        .withMessage("Homepage is not valid.")
];

exports.removeDomain = [
    express_validator.param("id", "ID is invalid.")
        .exists({
            checkFalsy: true,
            checkNull: true
        })
        .isLength({ min: 36, max: 36 })
];

exports.cooldown = (user) => {
    if (!env.GOOGLE_SAFE_BROWSING_KEY || !user || !user.cooldowns) return;

    // If has active cooldown then throw error
    const hasCooldownNow = user.cooldowns.some(cooldown =>
        isAfter(subHours(new Date(), 12), new Date(cooldown))
    );

    if (hasCooldownNow) {
        throw new CustomError("Cooldown because of a malware URL. Wait 12h");
    }
};

exports.malware = async (user, target) => {
    if (!env.GOOGLE_SAFE_BROWSING_KEY) return;

    const isMalware = await axios.post(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.GOOGLE_SAFE_BROWSING_KEY}`,
        {
            client: {
                clientId: env.DEFAULT_DOMAIN.toLowerCase().replace(".", ""),
                clientVersion: "1.0.0"
            },
            threatInfo: {
                threatTypes: [
                    "THREAT_TYPE_UNSPECIFIED",
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                    "POTENTIALLY_HARMFUL_APPLICATION"
                ],
                platformTypes: ["ANY_PLATFORM", "PLATFORM_TYPE_UNSPECIFIED"],
                threatEntryTypes: [
                    "EXECUTABLE",
                    "URL",
                    "THREAT_ENTRY_TYPE_UNSPECIFIED"
                ],
                threatEntries: [{ url: target }]
            }
        }
    );

    if (!isMalware.data || !isMalware.data.matches) return;

    if (user) {
        const [updatedUser] = await queries.default.user.update(
            { id: user.id },
            {cooldowns: knex.raw("array_append(cooldowns, ?)", [new Date().toISOString()])}
        );

        // Ban if too many cooldowns
        if (updatedUser.cooldowns.length > 2) {
            await queries.default.user.update({ id: user.id }, { banned: true });
            throw new CustomError("Too much malware requests. You are now banned.");
        }
    }

    throw new CustomError(
        user ? "Malware detected! Cooldown for 12h." : "Malware detected!"
    );
};

exports.bannedDomain = async (domain) => {
    const isBanned = await queries.default.domain.find({address: domain, banned: true});

    if (isBanned) {
        throw new CustomError("URL is containing malware/scam.", 400);
    }
};

exports.bannedHost = async (domain) => {
    let isBanned;

    try {
        const dnsRes = await dnsLookup(domain);

        if (!dnsRes || !dnsRes.address) return;
        // TODO: Host queries
        // isBanned = await queries.default.host.find({address: dnsRes.address, banned: true});
    } catch (error) {
        isBanned = null;
    }

    if (isBanned) {
        throw new CustomError("URL is containing malware/scam.", 400);
    }
};

exports.linksCount = async (user) => {
    if (!user) return;

    const count = await queries.default.link.total({user_id: user.id, created_at: [">", subDays(new Date(), 1).toISOString()]});

    if (count > env.USER_LIMIT_PER_DAY) {
        throw new CustomError(
            `You have reached your daily limit (${env.USER_LIMIT_PER_DAY}). Please wait 24h.`
        );
    }
};


exports.redirectProtected = [
    express_validator.body("password", "Password is invalid.")
        .exists({ checkFalsy: true, checkNull: true })
        .isString()
        .isLength({ min: 3, max: 64 })
        .withMessage("Password length must be between 3 and 64."),
    express_validator.param("id", "ID is invalid.")
        .exists({ checkFalsy: true, checkNull: true })
        .isLength({ min: 36, max: 36 })
];

exports.reportLink = [
    express_validator.body("link", "No link has been provided.")
        .exists({
            checkFalsy: true,
            checkNull: true
        })
        .customSanitizer(addProtocol)
        .custom(value => URL.parse(value).hostname === env.DEFAULT_DOMAIN)
        .withMessage(`You can only report a ${env.DEFAULT_DOMAIN} link.`)
];

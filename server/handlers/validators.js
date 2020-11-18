const express_validator = require("express-validator");
const URL = require("url");
const urlRegex = require("url-regex");
const {bcrypt} = require("bcryptjs");
const ms = require("ms");
const { isAfter, subDays, subHours, addMilliseconds } = require("date-fns");

const {addProtocol} = require("../utils");
const {env} = require("../env");

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
        // .custom(exports.checkUser) ???
        // .withMessage("Only users can use this field.")
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

            const domain = await query.domain.find({
                address,
                user_id: req.user.id
            });
            req.body.domain = domain || null;

            if (!domain) return Promise.reject();
        })
        .withMessage("You can't use this domain.")

];

exports.deleteLink = [
    param("id", "ID is invalid.")
        .exists({
            checkFalsy: true,
            checkNull: true
        })
        .isLength({ min: 36, max: 36 })
]

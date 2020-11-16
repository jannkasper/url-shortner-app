const express_validator = require('express-validator');
const {bcrypt} = require('bcryptjs');

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
]

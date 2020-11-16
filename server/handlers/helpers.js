const {validationResult} = require('express-validator');
const signale = require('signale');
const Sentry = require('@sentry/node');

const {env} = require('../env');
const {CustomError} = require('../utils');

exports.ip = (req, res, next) => {
    req.realIP = (req.headers['x-real-ip'] || req.connection.remoteAddress || "");
    return next();
};


exports.error = (error, req, res, next) => {
    if (env.isDev) {
        signale.fatal(error);
    }

    if (error instanceof CustomError) {
        return res.status(error.statusCode || 500).json({error: error.message});
    }

    if (env.SENTRY_PRIVATE_DSN) {
        Sentry.captureException(error);
    }

    return res.status(500).json({error: 'An error occured.'});
};

exports.verify = (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new CustomError(message, 400);
    }
    return next();
};

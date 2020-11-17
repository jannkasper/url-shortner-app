const passport = require('passport');
const axios = require('axios');

const {CustomError} = require('../utils');
const utils = require('../utils');
const {env} = require('../env');

const authenticate = (type, error, isStrict = true) => async function auth(req, res , next) {
    if (req.user) {
        return next();
    }

    await passport.authenticate(type, { session: false },(err, user) => {
        if (err) {
            return next(err);
        }
        if (!user && isStrict) {
            throw new CustomError(error, 401)
        }
        if (user && isStrict && !user.verified) {
            throw new CustomError( "Your email address is not verified. Click on signup to get the verification link again.", 400)
        }
        if (user && user.banned) {
            throw new CustomError("You're banned from using this website.", 403);
        }
        if (user) {
            req.user = {...user, admin: utils.isAdmin(user.email)};
            return next()
        }
        return next();

    })(req, res, next);
}


exports.apikey = authenticate("localapikey", "API key is not correct", false);
exports.jwt = authenticate("jwt", "Unauthorized.");
exports.jwtLoose = authenticate("jwt", "Unauthorized.", false);


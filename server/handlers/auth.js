const passport = require('passport');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const queries = require('../queries');
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

exports.local = authenticate("local", "Login credentials are wrong.");
exports.apikey = authenticate("localapikey", "API key is not correct", false);
exports.jwt = authenticate("jwt", "Unauthorized.");
exports.jwtLoose = authenticate("jwt", "Unauthorized.", false);


exports.token = async (req, res) => {
    const token = utils.signToken(req.user);
    return res.status(200).send({ token });
};

exports.signupAccess = (req, res, next) => {
    if (!env.DISALLOW_REGISTRATION) return next();
    return res.status(403).send({ message: "Registration is not allowed." });
};

exports.signup = async (req, res) => {
    const salt = await  bcrypt.genSalt(12);
    const password = await bcrypt.hash(req.body.password, salt);

    const user = await queries.default.user.add(
        { email: req.body.email, password },
        req.user
    );

    // TODO
    // await mail.verification(user);

    return res.status(201).send({ message: "Verification email has been sent." });

};

exports.verify = async (req, res, next) => {
    if (!req.params.verificationToken) return next();

    const [user] = await queries.default.user.update(
        {
            verification_token: req.params.verificationToken,
            verification_expires: [">", new Date().toISOString()]
        },
        {
            verified: true,
            verification_token: null,
            verification_expires: null
        }
    );

    // TODO Check it later
    if (user) {
        const token = utils.signToken(user);
        req.token = token;
    }

    return next();

};


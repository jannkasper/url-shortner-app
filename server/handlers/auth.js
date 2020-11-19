const passport = require('passport');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const {uuid} = require("uuidv4");
const {nanoid} = require("nanoid");
const {addMinutes} =  require("date-fns");

const queries = require('../queries');
const redis = require('../redis');
const {CustomError} = require('../utils');
const utils = require('../utils');
const {env} = require('../env');

const authenticate = (type, error, isStrict = true) => async function auth(req, res , next) {
    if (req.user) {
        return next();
    }

    await passport.authenticate(type,{},(err, user) => {
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

    if (user) {
        const token = utils.signToken(user);
        req.token = token;
    }

    return next();

};

exports.changePassword = async (req, res) => {
    const salt = await bcrypt.genSalt(12);
    const password = await bcrypt.hash(req.body.password, salt);

    const [user] = await queries.default.user.update({id: req.user.id}, {password});

    if (!user) {
        throw new CustomError("Couldn't change the password. Try again later.");
    }

    return res.status(200).send({ message: "Your password has been changed successfully." });
};

exports.changeEmailRequest = async (req, res) => {
    const { email, password } = req.body;

    const isMatch = await bcrypt.compare(password, req.user.password);

    if (!isMatch) {
        throw new CustomError("Password is wrong.", 400);
    }

    const currentUser = await queries.default.user.find({ email });

    if (currentUser) {
        throw new CustomError("Can't use this email address.", 400);
    }

    const [updatedUser] = await queries.default.user.update(
        { id: req.user.id },
        {
            change_email_address: email,
            change_email_token: uuid(),
            change_email_expires: addMinutes(new Date(), 30).toISOString()
        }
    );

    redis.remove.user(updatedUser);

    if (updatedUser) {
        // TODO mail
        // await mail.changeEmail({ ...updatedUser, email });
    }
    return res.status(200).send({message: "If email address exists, an email with a verification link has been sent."});
};

exports.changeEmail = async (req, res, next) => {
    const { changeEmailToken } = req.params;

    if (changeEmailToken) {
        const foundUser = await queries.default.user.find({change_email_token: changeEmailToken});

        if (!foundUser) return next();

        const [user] = await queries.default.user.update(
            {
                change_email_token: changeEmailToken,
                change_email_expires: [">", new Date().toISOString()]
            },
            {
                change_email_token: null,
                change_email_expires: null,
                change_email_address: null,
                email: foundUser.change_email_address
            }
        );

        redis.remove.user(foundUser);

        if (user) {
            const token = utils.signToken(user);
            req.token = token;
        }
    }
    return next();
};

exports.generateApiKey = async (req, res) => {
    const apikey = nanoid(40);

    redis.remove.user(req.user);

    const [user] = await queries.default.user.update({ id: req.user.id }, { apikey });

    if (!user) {
        throw new CustomError("Couldn't generate API key. Please try again later.");
    }

    return res.status(201).send({ apikey });
};

exports.resetPasswordRequest = async (req, res) => {
    const [user] = await queries.default.user.update(
        { email: req.body.email },
        {
            reset_password_token: uuid(),
            reset_password_expires: addMinutes(new Date(), 30).toISOString()
        }
    );

    if (user) {
        // TODO mail
        // await mail.resetPasswordToken(user);
    }

    return res.status(200).send({message: "If email address exists, a reset password email has been sent."});
};

exports.resetPassword = async (req, res, next) => {
    const { resetPasswordToken } = req.params;

    const [user] = await queries.default.user.update(
        {
            reset_password_token: resetPasswordToken,
            reset_password_expires: [">", new Date().toISOString()]
        },
        { reset_password_expires: null, reset_password_token: null }
    );

    if (user) {
        const token = utils.signToken(user);
        req.token = token;
    }
    return next();
};


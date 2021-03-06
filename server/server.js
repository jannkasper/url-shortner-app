
const asyncHandler = require('express-async-handler');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const passport = require('passport');
const Sentry = require('@sentry/node');
const cookieParser = require('cookie-parser');

const helpers = require('./handlers/helpers');
const auth = require('./handlers/auth');
const links = require('./handlers/links');
const routes = require('./routes');


const {env} = require('./env');
const nextApp = require('next');

require('./passport');
require("./cron");

const port = process.env.PORT || env.PORT;
const app = nextApp({dir: "./client", dev: env.isDev});
const handle = app.getRequestHandler();


app.prepare().then(async() => {
    const server = express();

    server.set("trust proxy", true);
    if(env.isDev) {
        server.use(morgan('dev'))
    } else if (env.SENTRY_PRIVATE_DSN) {
        Sentry.init({
            dsn: env.SENTRY_PRIVATE_DSN,
            environment: process.env.NODE_ENV
        });

        server.use(Sentry.Handlers.requestHandler({
            ip: true,
            user: ['id', 'email']
        }))
    };
    server.use(helmet());
    server.use(cookieParser());
    server.use(express.json());
    server.use(express.urlencoded({extended: true}));
    server.use(passport.initialize());
    server.use(express.static('static'));
    server.use(helpers.ip);

    server.use(asyncHandler(links.redirectCustomDomain));

    server.use('/api', routes);

    server.get("/reset-password/:resetPasswordToken?",
        asyncHandler(auth.resetPassword),
        // (req, res) => res.status(200).send(`${req.token}`)
        (req, res) => app.render(req, res, "/reset-password", { token: req.token })
    );

    server.get("/verify/:verificationToken?",
        asyncHandler(auth.verify),
        // (req, res) => res.status(200).send(`${req.token}`)
        (req, res) => app.render(req, res, "/verify", { token: req.token })
    );

    server.get("/verify-email/:changeEmailToken",
        asyncHandler(auth.changeEmail),
        // (req, res) => res.status(200).send(`${req.token}`)
        (req, res) => app.render(req, res, "/verify-email", { token: req.token })
    );

    server.get('/:id',asyncHandler(links.redirect(app)));


    // Error handler
    server.use(helpers.error);

    // Handler everything else by Next.js
    server.get("*", (req, res) => handle(req, res));

    server.listen(port, err => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });



});


const express = require('express');
const asyncHandler = require('express-async-handler');

const validators = require('../handlers/validators');
const link = require('../handlers/links');
const helpers = require('../handlers/helpers');
const auth = require('../handlers/auth');
const {env} = require('../env');


const router = express.Router();

router.post("/",
    asyncHandler(auth.apikey),
    asyncHandler(env.DISALLOW_ANONYMOUS_LINKS ? auth.jwt : auth.jwtLoose),
    validators.createLink,
    asyncHandler(helpers.verify),
    asyncHandler(link.create)
    );



module.exports = router;

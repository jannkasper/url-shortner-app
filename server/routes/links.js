const express = require('express');
const asyncHandler = require('express-async-handler');
const cors = require('cors');

const validators = require('../handlers/validators');
const link = require('../handlers/links');
const helpers = require('../handlers/helpers');
const auth = require('../handlers/auth');
const {env} = require('../env');


const router = express.Router();

router.get("/",
    asyncHandler(auth.apikey),
    asyncHandler(auth.jwt),
    helpers.query,
    asyncHandler(link.get)
    )

router.post("/",
    cors(),
    asyncHandler(auth.apikey),
    asyncHandler(env.DISALLOW_ANONYMOUS_LINKS ? auth.jwt : auth.jwtLoose),
    validators.createLink,
    asyncHandler(helpers.verify),
    asyncHandler(link.create)
    );

router.delete("/:id",
    asyncHandler(auth.apikey),
    asyncHandler(auth.jwt),
    validators.deleteLink,
    asyncHandler(helpers.verify),
    asyncHandler(link.remove)
    );



module.exports = router;

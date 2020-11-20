const express = require('express');
const asyncHandler = require('express-async-handler');

const validators = require('../handlers/validators');
const helpers = require('../handlers/helpers');
const domains = require('../handlers/domains');
const auth = require('../handlers/auth');

const router = express.Router();

router.post("/",
    asyncHandler(auth.apikey),
    asyncHandler(auth.jwt),
    validators.addDomain,
    asyncHandler(helpers.verify),
    asyncHandler(domains.add)
    );

router.delete("/:id",
    asyncHandler(auth.apikey),
    asyncHandler(auth.jwt),
    validators.removeDomain,
    asyncHandler(helpers.verify),
    asyncHandler(domains.remove)
    );

module.exports = router;

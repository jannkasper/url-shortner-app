var express = require('express');
const asyncHandler = require('express-async-handler');

const helpers = require('../handlers/helpers');
const validators = require('../handlers/validators');
const user = require('../handlers/users');
const auth = require('../handlers/auth');

const router = express.Router();

router.get('/',
    asyncHandler(auth.apikey),
    asyncHandler(auth.jwt),
    asyncHandler(user.get)
);

router.post('/delete',
    asyncHandler(auth.apikey),
    asyncHandler(auth.jwt),
    validators.deleteUser,
    asyncHandler(helpers.verify),
    asyncHandler(user.remove)
);

module.exports = router;

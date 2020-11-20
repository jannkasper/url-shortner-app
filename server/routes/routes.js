const express = require('express');

const domains = require('./domains');
const links = require('./links');
const users = require('./users');
const auth = require('./auth');
const health = require('./health');

const router = express.Router();

router.use('/domains', domains);
router.use('/links', links);
router.use('/users', users);
router.use('/auth', auth);
router.use('/health', health);


module.exports = router;

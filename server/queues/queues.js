const bull = require('bull');
const path = require('path');

const {env} = require('../env');

const redis = {
    port: env.REDIS_PORT,
    host: env.REDIS_HOST,
    ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD })
};

const removeJob = job => job.remove();

const visit = new bull('visit', {redis});

visit.clean(5000, 'completed');

visit.process(8, path.resolve(__dirname, 'visit.js'));

visit.on('completed', removeJob);

module.exports = visit;

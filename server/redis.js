const util = require('util');
const redis = require('redis');

const {env} = require('./env');

const client = redis.createClient({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    ...(env.REDIS_PASSWORD && {password: env.REDIS_PASSWORD})
});

exports.get = util.promisify(client.get).bind(client);

exports.set = util.promisify(client.set).bind(client);

exports.key = {
    link: (address, domain_id, user_id) => `${address}-${domain_id || ""}-${user_id || ""}`,
    domain: (address) => `d-${address}`,
    stats: (link_id) => `s-${link_id}`,
    host: (address) => `h-${address}`,
    user: (emailOrKey) => `u-${emailOrKey}`
};

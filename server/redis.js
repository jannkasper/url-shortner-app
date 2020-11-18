const util = require('util');
const redis = require('redis');

const {env} = require('./env');

const client = redis.createClient({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    ...(env.REDIS_PASSWORD && {password: env.REDIS_PASSWORD})
});

client.flushall( function (err, succeeded) {
    console.log(succeeded); // will be true if successfull
});

exports.get = util.promisify(client.get).bind(client);

exports.set = util.promisify(client.set).bind(client);

exports.del = util.promisify(client.del).bind(client);

exports.key = {
    link: (address, domain_id, user_id) => `${address}-${domain_id || ""}-${user_id || ""}`,
    domain: (address) => `d-${address}`,
    stats: (link_id) => `s-${link_id}`,
    host: (address) => `h-${address}`,
    user: (emailOrKey) => `u-${emailOrKey}`
};
// ?????
exports.remove = {
    user: (user) => {
        if (!user) return;
        del(key.user(user.email));
        del(key.user(user.apikey));
    },
    link: (link) => {
        if (!link) return;
        del(key.link(link.address, link.domain_id));
    },
};

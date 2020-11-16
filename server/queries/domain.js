const redis = require('../redis');
const knex = require('../knex');

exports.find = async (match) => {
    if (match.address) {
        const cachedDomain = await redis.get(redis.key.domain(match.address));
        if (cachedDomain) return JSON.parse(cachedDomain);
    }

    const domain = await knex.db("domains").where(match)
        .first();

    if (domain) {
        redis.set(redis.key.domain(domain.address), JSON.stringify(domain), "EX", 60 * 60 * 6)
    }

    return domain;
};

exports.get = async (match) => {
    return knex.db("domains").where(match);
}

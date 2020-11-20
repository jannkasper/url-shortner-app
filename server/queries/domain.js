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
};

exports.add = async (params) => {
    params.address = params.address.toLowerCase();

    const exists = await knex.db("domains")
        .where("address", params.address)
        .first();

    const newDomain = {
        address: params.address,
        homepage: params.homepage || null,
        user_id: params.user_id || null,
        banned:  !!params.banned
    };

    let domain;
    if (exists) {
        const [response] = await knex.db("domains")
            .where("id", exists.id)
            .update({...newDomain, update_at: params.update_at || new Date().toISOString}, "*");
        domain = response;
    } else {
        const [response] = await knex.db("domains").insert(newDomain, "*");
        domain = response;
    }

    redis.remove.domain(domain);

    return domain;
};


exports.update = async (match, update) => {
    const domains = await knex.db("domains")
        .where(match)
        .update({...update, updated_at: new Date().toISOString()}, "*");

    domains.forEach(redis.remove.domain);

    return domains;
};

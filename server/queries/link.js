const knex = require('../knex');
const redis = require('../redis');

const selectable = [
    "links.id",
    "links.address",
    "links.banned",
    "links.created_at",
    "links.domain_id",
    "links.updated_at",
    "links.password",
    "links.description",
    "links.expire_in",
    "links.target",
    "links.visit_count",
    "links.user_id",
    "links.uuid",
    "domains.address as domain"
];

const normalizeMatch = (match) => {
    const newMatch = {...match};

    if (newMatch.address) {
        newMatch['links.address'] = newMatch.address;
        delete newMatch.address;
    }

    if (newMatch.user_id) {
        newMatch['links.user_id'] = newMatch.user_id;
        delete newMatch.user_id;
    }

    if (newMatch.uuid) {
        newMatch['links.uuid'] = newMatch.uuid;
        delete newMatch.uuid;
    }

    return newMatch;

}

exports.find = async (match) => {
    if (match.address && match.domain_id) {
        const key = redis.key.link(match.address, match.domain_id);
        const cachedLink = await redis.get(key);
        if (cachedLink) {
            return JSON.stringify(cachedLink);
        }
    }

    const link = await knex.db('links')
        .select(...selectable)
        .where(normalizeMatch(match))
        .leftJoin('domains', 'links.domain_id', 'domains.id')
        .first();

    if (link) {
        const key = redis.key.link(link.address, link.domain_id);
        redis.set(key, JSON.stringify(link), 'EX', 60*60*2);
    }

    return link;
};

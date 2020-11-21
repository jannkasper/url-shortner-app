const knex = require("../knex");
const redis = require("../redis");
const bcrypt = require('bcryptjs');

const {CustomError} = require('../utils');

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
        newMatch["links.address"] = newMatch.address;
        delete newMatch.address;
    }

    if (newMatch.user_id) {
        newMatch["links.user_id"] = newMatch.user_id;
        delete newMatch.user_id;
    }

    if (newMatch.uuid) {
        newMatch["links.uuid"] = newMatch.uuid;
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

    const link = await knex.db("links")
        .select(...selectable)
        .where(normalizeMatch(match))
        .leftJoin("domains", "links.domain_id", "domains.id")
        .first();

    if (link) {
        const key = redis.key.link(link.address, link.domain_id);
        redis.set(key, JSON.stringify(link), "EX", 60*60*2);
    }

    return link;
};


exports.create = async (params) => {
    let encryptedPassword = null;

    if (params.password) {
        const salt = await bcrypt.genSalt(12);
        encryptedPassword = await bcrypt.hash(params.password, salt);
    }

    const [link] = await knex.db("links").insert({
        password: encryptedPassword,
        domain_id: params.domain_id || null,
        user_id: params.user_id || null,
        address: params.address,
        description: params.description || null,
        expire_in: params.expire_in || null,
        target: params.target
    }, "*");

    return link;
};


exports.total = async (match, params= {}) => {
    const query = knex.db("links");

    Object.entries(match).forEach(([key, value]) => {
        query.andWhere(key, ...(Array.isArray(value) ? value : [value]));
    });

    if (params.search) {
        query.andWhereRaw(
            "concat_ws(' ', description, links.address, target) ILIKE '%' || ? || '%'",
            [params.search]
        );
    }

    const [{ count }] = await query.count("id");

    return typeof count === "number" ? count : parseInt(count);
}


exports.get = async (match, params) => {
    const query = knex.db("links")
        .select(...selectable)
        .where(normalizeMatch(match))
        .offset(params.skip)
        .limit(params.limit)
        .orderBy("created_at", "desc");

    if (params.search) {
        query.andWhereRaw(
            "concat_ws(' ', description, links.address, target) ILIKE '%' || ? || '%'",
            [params.search]
        );
    }

    query.leftJoin("domains", "links.domain_id", "domains.id");

    const links = await query;

    return links;
};

exports.remove = async (match) => {
    const link = await knex.db("links")
        .where(match)
        .first();

    if (!link) {
        throw new CustomError("Link was not found.");
    }

    const deletedLink = await knex.db("links")
        .where("id", link.id)
        .delete();

    redis.remove.link(link);

    return !!deletedLink;
};

exports.update = async (match, update) => {
    const links = await knex.db("links")
        .where(match)
        .update({...update, updated_at: new Date().toISOString()}, "*");

    links.forEach(redis.remove.link);

    return links;
};

exports.incrementVisit = async (match) => {
    return knex.db("links")
        .where(match)
        .increment("visit_count",1);
};

exports.batchRemove = async (match) => {
    const deleteQuery = knex.db("links");
    const findQuery = knex.db("links");

    Object.entries(match).forEach(([key, value]) => {
        findQuery.andWhere(key, ...(Array.isArray(value) ? value : [value]));
        deleteQuery.andWhere(key, ...(Array.isArray(value) ? value : [value]));
    })

    const links = await findQuery;

    links.forEach(redis.remove.link);

    await deleteQuery.delete();
}

const {addMinutes} = require("date-fns");
const { uuid } = require("uuidv4");

const knex = require('../knex');
const redis = require('../redis');


exports.remove = async (user) => {
    const deletedUser = await knex.db("users")
        .where("id", user.id)
        .delete();

    redis.remove.user(user);

    return !!deletedUser;
};


exports.find = async (match) => {
    if (match.email || match.apikey) {
        const key = redis.key.user(match.email || match.apikey);
        const cachedUser = await redis.get(key);
        if (cachedUser) {
            return JSON.parse(cachedUser);
        }
    }

    const user = await knex.db("users")
        .where(match)
        .first();

    if (user) {
        const emailKey = redis.key.user(user.email);
        redis.set(emailKey, JSON.stringify(user), 'EX', 60 * 60 * 1);

        if (user.apikey) {
            const apikeyKey = redis.key.user(user.apikey);
            redis.set(apikeyKey, JSON.stringify(user), 'EX', 60 * 60 * 1)
        }
    }

    return user;
};


exports.add = async (params, user) => {
    const data = {
        email: params.email,
        password: params.password,
        verification_token: uuid(),
        verification_expires: addMinutes(new Date(), 60).toISOString()
    };

    if (user) {
        await knex.db("users")
            .where("id", user.id)
            .update({ ...data, updated_at: new Date().toISOString() });
    } else {
        await knex.db("users").insert(data);
    }

    redis.remove.user(user);

    return {
        ...user,
        ...data
    };
};


exports.update = async (match, update) => {
    const query = knex.db("users");

    Object.entries(match).forEach(([key, value]) => {
        query.andWhere(key, ...(Array.isArray(value) ? value : [value]));
    });

    const users = await query.update(
        { ...update, updated_at: new Date().toISOString() },
        "*"
    );

    // TODO redis
    users.forEach(redis.remove.user);

    return users;
}

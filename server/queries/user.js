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

const { subMinutes } = require("date-fns");

const knex = require("../knex");
const {env} = require("../env");

exports.add = async (ipToAdd) => {
    const ip = ipToAdd.toLowerCase();

    const currentIP = await knex.db("ips")
        .where("ip", ip)
        .first();

    if (currentIP) {
        const currentDate = new Date().toISOString();
        await knex.db("ips")
            .where({ip})
            .update({
                create_at: currentDate,
                updated_at: currentDate
            })
    } else {
        await knex.db("ips").insert({ip});
    }
}

exports.find = async (match) => {
    const query = knex.db("ips");

    Object.entries(match).forEach(([key, value]) => {
        query.andWhere(key, ...(Array.isArray(value) ? value : [value]));
    });

    const ip = await query.first();

    return ip;
}

exports.clear = async () => {
    knex.db("ips")
        .where(
            "created_at",
            "<",
            subMinutes(new Date(), env.NON_USER_COOLDOWN).toISOString()
        )
        .delete();
}

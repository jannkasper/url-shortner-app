exports.createIpTable = async function (knex) {
    const hastTable = await knex.schema.hasTable("ips");

    if (!hastTable) {
        knex.schema.createTable("ips", table => {
            table.increments("id").primary();
            table
                .string("ip")
                .unique()
                .notNullable();
            table.timestamps(false, true);
        })
    }

}


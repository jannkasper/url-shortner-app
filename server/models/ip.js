exports.createIpTable = async function (knex) {
    const hasTable = await knex.schema.hasTable("ips");

    if (!hasTable) {
        await knex.schema.createTable("ips", table => {
            table.increments("id").primary();
            table
                .string("ip")
                .unique()
                .notNullable();
            table.timestamps(false, true);
        })
    }

}


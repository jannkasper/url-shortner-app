const {Domain, Link, User} = require('../../models');

exports.up = async function(knex) {

    await User.createUserTable(knex);
    await Domain.createDomainTable(knex);
    await Link.createLinkTable(knex);

    await Promise.all([
        knex.raw(`
      ALTER TABLE domains
      DROP CONSTRAINT domains_user_id_foreign,
      ADD CONSTRAINT domains_user_id_foreign
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE SET NULL;
    `),
        knex.raw(`
      ALTER TABLE links
      DROP CONSTRAINT links_user_id_foreign,
      ADD CONSTRAINT links_user_id_foreign
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE;
    `)
    ]);
};

exports.down = async function(knex) {
    return Promise.all([
        knex.schema.dropTable("links"),
        knex.schema.dropTable("domains"),
        knex.schema.dropTable("users")
    ]);
};

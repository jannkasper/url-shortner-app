const knex = require('knex');
const {env} = require('./env');

exports.db = knex({
    client: env.DB_NAME,
    connection: {
        database: env.DB,
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        port: env.DB_PORT,
        ssl: {
            require: env.DB_SSL,
            rejectUnauthorized: false // <<<<<<< YOU NEED THIS
        },
        pool: {
            min: env.DB_POOL_MIN,
            max: env.DB_POOL_MAX
        }
    }
});


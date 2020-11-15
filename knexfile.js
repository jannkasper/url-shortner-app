const {env} = require('./server/env');

module.exports = {
    development: {
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
            }
        },
        migrations: {
            directory: './server/db/migrations'
        },
        seeds: {
            directory: './server/db/seeds/dev'
        }
    },
};

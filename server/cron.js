const cron = require("node-cron");

const queries = require("./queries");
const {env} = require("./env");

if (env.NON_USER_COOLDOWN) {
    cron.schedule("* */24 * * *", () => {
        queries.default.ip
            .clear()
            .catch();
    })
}

cron.schedule("*/15 * * * * *", () => {
    queries.default.link
        .batchRemove({expire_in: ["<", new Date().toISOString()]})
        .catch()
})

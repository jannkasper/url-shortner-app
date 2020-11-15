
exports.seed = function(knex) {
    // Deletes ALL existing entries
    return knex('domains').del()
        .then(function () {
            // Inserts seed entries
            return knex('domains').insert([
                {
                    banned: false,
                    banned_by_id: undefined,
                    address: "localhost:3000",
                    homepage: "https://www.google.pl/",
                    user_id: 1
                }, {
                    banned: false,
                    banned_by_id: undefined,
                    address: "www.youtube.com",
                    homepage: undefined,
                    user_id: 2
                }, {
                    banned: false,
                    banned_by_id: undefined,
                    address: "www.apple.com",
                    homepage: undefined,
                    user_id: 3
                },

            ]);
        });
};

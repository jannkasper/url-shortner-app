
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('links').del()
    .then(function () {
      // Inserts seed entries
      return knex('links').insert([
        {
            address: "address1",
            description: "description1",
            banned: undefined,
            banned_by_id: undefined,
            domain_id: "1",
            password: undefined,
            expire_in: new Date().toISOString(),
            target: 'target1',
            user_id: 1
        }, {
              address: "address2",
              description: "description2",
              banned: undefined,
              banned_by_id: undefined,
              domain_id: "2",
              password: undefined,
              expire_in: new Date().toISOString(),
              target: 'target1',
              user_id: 2
          }, {
              address: "address3",
              description: "description3",
              banned: undefined,
              banned_by_id: undefined,
              domain_id: "3",
              password: undefined,
              expire_in: new Date().toISOString(),
              target: 'target1',
              user_id: 3
          },

      ]);
    });
};

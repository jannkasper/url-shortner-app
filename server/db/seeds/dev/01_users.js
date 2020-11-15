
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('users').del()
    .then(function () {
      // Inserts seed entries
      return knex('users').insert([
        {
            apikey: 'apikey1',
            banned: false,
            banned_by_id: undefined,
            cooldowns: undefined,
            email: 'email1@test.com',
            password: 'test1',
            reset_password_expires: new Date().toISOString(),
            reset_password_token: 'token1',
            change_email_expires: new Date().toISOString(),
            change_email_token: 'token1',
            change_email_address: 'email1@change.com',
            verification_expires: new Date().toISOString(),
            verification_token: 'token1',
            verified: true

        },{
              apikey: 'apikey2',
              banned: false,
              banned_by_id: undefined,
              cooldowns: undefined,
              email: 'email2@test.com',
              password: 'test2',
              reset_password_expires: new Date().toISOString(),
              reset_password_token: 'token2',
              change_email_expires: new Date().toISOString(),
              change_email_token: 'token2',
              change_email_address: 'email2@change.com',
              verification_expires: new Date().toISOString(),
              verification_token: 'token2',
              verified: true

          },{
              apikey: 'apikey3',
              banned: false,
              banned_by_id: undefined,
              cooldowns: undefined,
              email: 'email3@test.com',
              password: 'test3',
              reset_password_expires: new Date().toISOString(),
              reset_password_token: 'token3',
              change_email_expires: new Date().toISOString(),
              change_email_token: 'token3',
              change_email_address: 'email3@change.com',
              verification_expires: new Date().toISOString(),
              verification_token: 'token3',
              verified: true

          },
      ]);
    });
};

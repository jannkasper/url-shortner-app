const query = require('../queries');
const utils = require('../utils');


exports.get = async (req, res) => {
    const domains = await query.default.domain.get({user_id: req.user.id});

    const data = {
        apikey: req.user.apikey,
        email: req.user.email,
        domains: domains.map(utils.sanitize.domain)
    };

    return res.status(200).send(data);
};

exports.remove = async (req, res) => {
    await query.default.user.remove(req.user);
    return res.status(200).send("OK");
}

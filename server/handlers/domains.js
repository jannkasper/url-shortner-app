const express = require("express");
const queries = require("../queries");
const redis = require("../redis");
const {CustomError, sanitize} = require("../utils");

exports.add = async (req, res) => {
    const {address, homepage} = req.body;

    const domain = await queries.default.domain.add({address, homepage, user_id: req.user.id});

    return res.status(200).send(sanitize.domain(domain))
};

exports.remove = async (req, res) => {
    const [domain] = await queries.default.domain.update({uuid: req.params.id, user_id: req.user.id}, {user_id: null});

    redis.remove.domain(domain);

    if (!domain) {
        throw new CustomError("Could not delete the domain.", 500);
    }

    return res.status(200).send({ message: "Domain deleted successfully" });
};

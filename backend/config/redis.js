const redis = require("redis");

const client = redis.createClient(); // default localhost:6379

client.on("error", (err) => console.log("Redis Client Error", err));

client.connect(); // connect returns a promise

module.exports = client;

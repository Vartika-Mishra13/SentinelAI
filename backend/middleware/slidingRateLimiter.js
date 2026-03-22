const BlockedIP = require("../models/BlockedIP");        // ← add this
const requestLogger = require("../middleware/requestLogger"); // ← add this
const User = require("../models/User");
const redisClient = require("../config/redis");

const LIMIT = 5;      // testing
const WINDOW = 60;    // seconds

const slidingLimiter = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      res.locals.requestStatus = "Blocked";
      await requestLogger(req, res, () => {}); // log blocked request
      return res.status(401).json({ message: "No API key provided" });
    }

    const user = await User.findOne({ apiKey });
    if (!user) {
      res.locals.requestStatus = "Blocked";
      await requestLogger(req, res, () => {});
      return res.status(401).json({ message: "Invalid API key" });
    }

    req.user = { _id: user._id, username: user.username };
    const key = `sliding_${user._id}`;
    const now = Date.now();

    // get previous requests from Redis
    let requests = await redisClient.lRange(key, 0, -1);
    requests = requests.map(Number);

    // filter within window
    const validRequests = requests.filter(ts => now - ts < WINDOW * 1000);

    console.log("Valid Requests:", validRequests.length);

    // ❌ Block if limit exceeded
    if (validRequests.length >= LIMIT) {
      res.locals.requestStatus = "Blocked";

      // Save blocked IP
      await new BlockedIP({
        ipAddress: req.ip,
        blockedAt: new Date(),
        reason: "Sliding rate limit exceeded"
      }).save().catch(err => console.error("BlockedIP save failed:", err.message));

      await requestLogger(req, res, () => {}); // log blocked request
      return res.status(429).json({ message: "Sliding rate limit exceeded" });
    }

    // add new request
    validRequests.push(now);

    // save back to Redis
    await redisClient.del(key);
    for (let time of validRequests) {
      await redisClient.rPush(key, time.toString());
    }
    await redisClient.expire(key, WINDOW);

    // mark suspicious if approaching limit
    res.locals.requestStatus = validRequests.length >= Math.ceil(LIMIT * 0.6)
      ? "Suspicious"
      : "Normal";

    // log the request
    await requestLogger(req, res, () => {});

    next();
  } catch (error) {
    console.error("Sliding Rate Limiter Error:", error);
    res.locals.requestStatus = "Blocked";
    await requestLogger(req, res, () => {});
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = slidingLimiter;
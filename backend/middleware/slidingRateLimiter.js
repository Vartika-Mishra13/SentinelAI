const User = require("../models/User");
const redisClient = require("../config/redis");

const LIMIT = 5;      // testing ke liye
const WINDOW = 60;    // 60 seconds

const slidingLimiter = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        message: "No API key provided",
      });
    }

    const user = await User.findOne({ apiKey });

    if (!user) {
      return res.status(401).json({
        message: "Invalid API key",
      });
    }

    req.user = {
      _id: user._id,
      username: user.username,
    };

    const key = `sliding_${user._id}`;
    const now = Date.now();

    // 🧠 get previous requests
    let requests = await redisClient.lRange(key, 0, -1);
    requests = requests.map(Number);

    // 🧹 filter within window
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < WINDOW * 1000
    );

    console.log("Valid Requests:", validRequests.length);

    // ❌ block if limit exceeded
    if (validRequests.length >= LIMIT) {
      return res.status(429).json({
        message: "Sliding rate limit exceeded",
      });
    }

    // ➕ add new request
    validRequests.push(now);

    // 🔥 IMPORTANT FIX (store properly)
    await redisClient.del(key);

    for (let time of validRequests) {
      await redisClient.rPush(key, time.toString());
    }

    // ⏳ expire
    await redisClient.expire(key, WINDOW);

    next();

  } catch (error) {
    console.error("Sliding Rate Limiter Error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = slidingLimiter;
const User = require("../models/User");
const Usage = require("../models/Usage");
const redisClient = require("../config/redis");
const BlockedIP = require("../models/BlockedIP");

const apiKeyMiddleware = async (req, res, next) => {

  try {

    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        message: "No API key provided"
      });
    }

    const user = await User.findOne({ apiKey });

    if (!user) {
      return res.status(401).json({
        message: "Invalid API key"
      });
    }

    req.user = {
      _id: user._id,
      username: user.username
    };

    // 🔹 Detect IP
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.ip ||
      "unknown";

    console.log("IP detected:", ip);


    // 🔹 Check if IP is blocked
    const blocked = await BlockedIP.findOne({ ipAddress: ip });

    if (blocked) {

      if (blocked.blockedUntil && blocked.blockedUntil > Date.now()) {
        return res.status(403).json({
          message: "IP temporarily blocked due to suspicious activity"
        });
      }

      // unblock automatically
      await BlockedIP.deleteOne({ ipAddress: ip });

    }


    // 🔹 User rate limit (100 requests/hour)
    const key = `rate_${user._id}`;

    const requests = await redisClient.get(key);

    if (requests && parseInt(requests) >= 500) {
      return res.status(429).json({
        message: "Rate limit exceeded (100 requests/hour)"
      });
    }

    await redisClient
      .multi()
      .incr(key)
      .expire(key, 60 * 60)
      .exec();


    // 🔹 Suspicious IP detection
    const ipKey = `ip_rate_${ip}`;

    const ipRequests = await redisClient.get(ipKey);

    if (ipRequests && parseInt(ipRequests) > 10) {

      await BlockedIP.create({
        ipAddress: ip,
        reason: "Too many requests in short time",
        blockedUntil: new Date(Date.now() + 60 * 1000) // block for 1 minute
      });

      return res.status(403).json({
        message: "Suspicious activity detected. IP blocked for 1 minute."
      });
    }

    await redisClient
      .multi()
      .incr(ipKey)
      .expire(ipKey, 10)
      .exec();


    // 🔹 Usage log
    await Usage.create({
      userId: user._id,
      endpoint: req.originalUrl,
      ipAddress: ip
    });

    console.log("Usage logged:", user.username, req.originalUrl);

    next();

  } catch (error) {

    console.error("API Key Middleware Error:", error);

    return res.status(500).json({
      message: "Server error"
    });

  }

};

module.exports = apiKeyMiddleware;
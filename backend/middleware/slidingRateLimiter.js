const requestLogger = require("./requestLogger");
const User = require("../models/User");
const redisClient = require("../config/redis");
const { getSecurityRules } = require("../utils/securityRules");

const slidingLimiter = async (req, res, next) => {
  try {
    const rules = await getSecurityRules();
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = "Missing API key";
      await requestLogger(req, res, () => {});
      return res.status(401).json({ message: "No API key provided" });
    }

    const user = await User.findOne({ apiKey });

    if (!user) {
      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = "Invalid API key";
      await requestLogger(req, res, () => {});
      return res.status(401).json({ message: "Invalid API key" });
    }

    if (user.apiKeyBlocked) {
      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = user.apiKeyBlockedReason || "Blocked API key";
      await requestLogger(req, res, () => {});
      return res.status(403).json({
        message: user.apiKeyBlockedReason || "This API key has been blocked"
      });
    }

    req.user = { _id: user._id, username: user.username };
    const key = `sliding_${user._id}`;
    const now = Date.now();

    let requests = await redisClient.lRange(key, 0, -1);
    requests = requests.map(Number);

    const validRequests = requests.filter(
      (timestamp) => now - timestamp < rules.slidingWindowSeconds * 1000
    );

    if (validRequests.length >= rules.slidingLimit) {
      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = `Sliding limit exceeded (${rules.slidingLimit}/${rules.slidingWindowSeconds}s)`;
      await requestLogger(req, res, () => {});
      return res.status(429).json({ message: "Sliding rate limit exceeded" });
    }

    validRequests.push(now);

    await redisClient.del(key);
    for (const timestamp of validRequests) {
      await redisClient.rPush(key, timestamp.toString());
    }
    await redisClient.expire(key, rules.slidingWindowSeconds);

    res.locals.requestStatus =
      validRequests.length >= Math.ceil(rules.slidingLimit * (rules.suspiciousThresholdPercent / 100))
        ? "Suspicious"
        : "Normal";
    res.locals.requestReason =
      res.locals.requestStatus === "Suspicious"
        ? `Approaching sliding limit (${validRequests.length}/${rules.slidingLimit})`
        : "Request accepted";

    await requestLogger(req, res, () => {});

    next();
  } catch (error) {
    console.error("Sliding Rate Limiter Error:", error);
    res.locals.requestStatus = "Blocked";
    res.locals.requestReason = "Sliding limiter error";
    await requestLogger(req, res, () => {});
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = slidingLimiter;

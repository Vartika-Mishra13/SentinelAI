const User = require("../models/User");
const Usage = require("../models/Usage");
const redisClient = require("../config/redis");
const BlockedIP = require("../models/BlockedIP");
const requestLogger = require("./requestLogger");
const { getGeoInfo, normalizeIp } = require("../utils/geoip");
const { getSecurityRules } = require("../utils/securityRules");

const apiKeyMiddleware = async (req, res, next) => {
  try {
    const rules = await getSecurityRules();
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = "Missing API key";
      await requestLogger(req, res, () => {});
      return res.status(401).json({
        message: "No API key provided"
      });
    }

    const user = await User.findOne({ apiKey });

    if (!user) {
      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = "Invalid API key";
      await requestLogger(req, res, () => {});
      return res.status(401).json({
        message: "Invalid API key"
      });
    }

    if (user.apiKeyBlocked) {
      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = user.apiKeyBlockedReason || "Blocked API key";
      await requestLogger(req, res, () => {});
      return res.status(403).json({
        message: user.apiKeyBlockedReason || "This API key has been blocked"
      });
    }

    req.user = {
      _id: user._id,
      username: user.username
    };

    const rawIp =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.ip ||
      "unknown";
    const geo = getGeoInfo(rawIp);
    const ip = normalizeIp(rawIp);

    const blocked = await BlockedIP.findOne({ ipAddress: ip });

    if (blocked) {
      if (blocked.blockedUntil && blocked.blockedUntil > Date.now()) {
        res.locals.requestStatus = "Blocked";
        res.locals.requestReason = blocked.reason || "Blocked IP attempted access";
        await requestLogger(req, res, () => {});
        return res.status(403).json({
          message: "IP temporarily blocked due to suspicious activity"
        });
      }

      await BlockedIP.deleteOne({ ipAddress: ip });
    }

    const key = `rate_${user._id}`;
    const requests = await redisClient.get(key);

    if (requests && parseInt(requests, 10) >= rules.userHourlyLimit) {
      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = `Hourly rate limit exceeded (${rules.userHourlyLimit}/hour)`;
      await requestLogger(req, res, () => {});
      return res.status(429).json({
        message: `Rate limit exceeded (${rules.userHourlyLimit} requests/hour)`
      });
    }

    await redisClient
      .multi()
      .incr(key)
      .expire(key, 60 * 60)
      .exec();

    const ipKey = `ip_rate_${ip}`;
    const ipRequests = await redisClient.get(ipKey);

    if (ipRequests && parseInt(ipRequests, 10) > rules.ipBurstThresholdCount) {
      await BlockedIP.create({
        ipAddress: ip,
        reason: `Too many requests in ${rules.ipBurstWindowSeconds} seconds`,
        blockedUntil: new Date(Date.now() + rules.ipBlockDurationSeconds * 1000),
        geoCountry: geo.country,
        geoLabel: geo.label
      });

      res.locals.requestStatus = "Blocked";
      res.locals.requestReason = `IP burst threshold exceeded (${rules.ipBurstThresholdCount}/${rules.ipBurstWindowSeconds}s)`;
      await requestLogger(req, res, () => {});
      return res.status(403).json({
        message: `Suspicious activity detected. IP blocked for ${rules.ipBlockDurationSeconds} seconds.`
      });
    }

    await redisClient
      .multi()
      .incr(ipKey)
      .expire(ipKey, rules.ipBurstWindowSeconds)
      .exec();

    await Usage.create({
      userId: user._id,
      endpoint: req.originalUrl,
      ipAddress: ip
    });

    await User.updateOne(
      { _id: user._id },
      {
        apiKeyLastUsedAt: new Date(),
        apiKeyLastUsedIp: ip
      }
    );

    res.locals.requestStatus = "Normal";
    res.locals.requestReason = "Request accepted";
    await requestLogger(req, res, () => {});

    next();
  } catch (error) {
    console.error("API Key Middleware Error:", error);
    res.locals.requestStatus = "Blocked";
    res.locals.requestReason = "Gateway middleware error";
    await requestLogger(req, res, () => {});
    return res.status(500).json({
      message: "Server error"
    });
  }
};

module.exports = apiKeyMiddleware;

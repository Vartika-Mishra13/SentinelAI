const RequestLog = require("../models/RequestLog");
const BlockedIP = require("../models/BlockedIP");

const requestLogger = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const endpoint = req.originalUrl;
    const status = res.locals.requestStatus || "Normal";

    // Log the request
    await RequestLog.create({
      apiKey: req.headers["x-api-key"] || "No API Key",
      ip,
      endpoint,
      status,
      timestamp: Date.now(),
    });

    // Save BlockedIP if blocked
    if (status === "Blocked") {
      await BlockedIP.create({
        ipAddress: ip,         // correct field name
        blockedAt: new Date(),
        reason: "Rate limit exceeded",
      });
    }
  } catch (err) {
    console.error("Request logging failed:", err.message);
  }

  next();
};

module.exports = requestLogger;
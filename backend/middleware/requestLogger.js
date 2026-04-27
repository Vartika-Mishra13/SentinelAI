const RequestLog = require("../models/RequestLog");
const BlockedIP = require("../models/BlockedIP");
const { getGeoInfo } = require("../utils/geoip");

const requestLogger = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const endpoint = req.originalUrl;
    const status = res.locals.requestStatus || "Normal";
    const reason = res.locals.requestReason || null;
    const geo = getGeoInfo(ip);

    // Log the request
    await RequestLog.create({
      apiKey: req.headers["x-api-key"] || "No API Key",
      ip: geo.ip,
      endpoint,
      status,
      reason,
      geoCountry: geo.country,
      geoLabel: geo.label,
      timestamp: Date.now(),
    });

    // Save BlockedIP if blocked
    if (status === "Blocked") {
      await BlockedIP.create({
        ipAddress: geo.ip,
        blockedAt: new Date(),
        reason: reason || "Rate limit exceeded",
        geoCountry: geo.country,
        geoLabel: geo.label
      });
    }
  } catch (err) {
    console.error("Request logging failed:", err.message);
  }

  next();
};

module.exports = requestLogger;

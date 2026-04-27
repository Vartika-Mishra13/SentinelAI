const RequestLog = require("../models/RequestLog");
const BlockedIP = require("../models/BlockedIP");
const { getGeoInfoAsync } = require("../utils/geoip");
const sendAlertEmail = require("../utils/emailAlert");
const calculateAnomalyScore = require("../utils/anomalyScorer");

const requestLogger = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const endpoint = req.originalUrl;
    const status = res.locals.requestStatus || "Normal";
    const reason = res.locals.requestReason || null;
      const geo = await getGeoInfoAsync(ip);
    const hour = new Date().getHours();

    // Calculate anomaly score
    const { score, reasons, level } = calculateAnomalyScore({
      status,
      reason,
      threatType: res.locals.threatType || null,
      requestCount: res.locals.requestCount || 0,
      slidingLimit: res.locals.slidingLimit || 10,
      hour,
      geoCountry: geo.country,
    });

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
      anomalyScore: score,
      anomalyReasons: reasons,
    });

    // Save BlockedIP if blocked
    if (status === "Blocked") {
      await BlockedIP.create({
        ipAddress: geo.ip,
        blockedAt: new Date(),
        reason: reason || "Rate limit exceeded",
        geoCountry: geo.country,
        geoLabel: geo.label,
      });

      // Send email alert
      await sendAlertEmail({
        type: res.locals.threatType || "Blocked Request",
        ip: geo.ip,
        endpoint,
        reason: reason || "Unknown",
        geoLabel: geo.label,
        anomalyScore: score,
        anomalyLevel: level,
      });
    }
  } catch (err) {
    console.error("Request logging failed:", err.message);
  }

  next();
};

module.exports = requestLogger;
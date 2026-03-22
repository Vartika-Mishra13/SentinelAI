// controllers/adminController.js
const RequestLog = require("../models/RequestLog");
const BlockedIP = require("../models/BlockedIP");

// Dashboard stats
const getStats = async (req, res) => {
  try {
    const totalRequests = await RequestLog.countDocuments();
    const normalRequests = await RequestLog.countDocuments({ status: "Normal" });
    const suspiciousRequests = await RequestLog.countDocuments({ status: "Suspicious" });
    const blockedRequests = await RequestLog.countDocuments({ status: "Blocked" });

    const endpointStats = await RequestLog.aggregate([
      { $group: { _id: "$endpoint", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const topIPs = await RequestLog.aggregate([
      { $group: { _id: "$ip", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const recentLogs = await RequestLog.find()
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      success: true,
      totalRequests,
      normalRequests,
      suspiciousRequests,
      blockedRequests,
      endpointStats,
      topIPs,
      recentLogs
    });
  } catch (error) {
    console.error("AdminController Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Blocked IPs
const getBlockedIPs = async (req, res) => {
  try {
    const blockedIPs = await BlockedIP.find().sort({ blockedAt: -1 });
    res.json({
      success: true,
      totalBlocked: blockedIPs.length,
      blockedIPs
    });
  } catch (error) {
    console.error("BlockedIPs Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getStats, getBlockedIPs };
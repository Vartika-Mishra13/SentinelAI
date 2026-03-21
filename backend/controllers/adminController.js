const Usage = require("../models/Usage");
const BlockedIP = require("../models/BlockedIP");

// 📊 API STATS
const getStats = async (req, res) => {
  try {

    const totalRequests = await Usage.countDocuments();

    const endpointStats = await Usage.aggregate([
      {
        $group: {
          _id: "$endpoint",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const mostUsedEndpoint =
      endpointStats.length > 0 ? endpointStats[0]._id : "none";

    const recentUsage = await Usage.find()
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      success: true,
      totalRequests,
      mostUsedEndpoint,
      endpointStats,
      recentUsage
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error"
    });

  }
};

// 🚨 BLOCKED IPS MONITORING
const getBlockedIPs = async (req, res) => {

  try {

    const blockedIPs = await BlockedIP.find().sort({ blockedAt: -1 });

    res.json({
      success: true,
      totalBlocked: blockedIPs.length,
      blockedIPs
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error"
    });

  }

};

module.exports = {
  getStats,
  getBlockedIPs
};
// controllers/adminController.js
const RequestLog = require("../models/RequestLog");
const BlockedIP = require("../models/BlockedIP");
const User = require("../models/User");
const SecurityRule = require("../models/SecurityRule");
const { DEFAULT_RULES, getSecurityRules } = require("../utils/securityRules");

const parsePagination = (req, defaultLimit = 10) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || `${defaultLimit}`, 10), 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

// Dashboard stats
const getStats = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req, 10);
    const status = req.query.status;
    const search = (req.query.search || "").trim();
    const filters = {};

    if (status && ["Normal", "Suspicious", "Blocked"].includes(status)) {
      filters.status = status;
    }

    if (search) {
      filters.$or = [
        { ip: { $regex: search, $options: "i" } },
        { endpoint: { $regex: search, $options: "i" } },
        { apiKey: { $regex: search, $options: "i" } },
        { geoLabel: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } }
      ];
    }

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

    const recentLogs = await RequestLog.find(filters)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    const filteredRequestCount = await RequestLog.countDocuments(filters);

    const activeBlockedIPs = await BlockedIP.countDocuments();
    const blockedApiKeys = await User.countDocuments({ apiKeyBlocked: true });
    const rules = await getSecurityRules();

    res.json({
      success: true,
      totalRequests,
      normalRequests,
      suspiciousRequests,
      blockedRequests,
      activeBlockedIPs,
      blockedApiKeys,
      endpointStats,
      topIPs,
      recentLogs,
      rules,
      requestPagination: {
        page,
        limit,
        total: filteredRequestCount,
        totalPages: Math.max(Math.ceil(filteredRequestCount / limit), 1)
      }
    });
  } catch (error) {
    console.error("AdminController Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Blocked IPs
const getBlockedIPs = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req, 3);
    const search = (req.query.search || "").trim();
    const filters = {};

    if (search) {
      filters.$or = [
        { ipAddress: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
        { geoLabel: { $regex: search, $options: "i" } }
      ];
    }

    const totalBlocked = await BlockedIP.countDocuments(filters);
    const blockedIPs = await BlockedIP.find()
      .find(filters)
      .sort({ blockedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      totalBlocked,
      blockedIPs,
      pagination: {
        page,
        limit,
        total: totalBlocked,
        totalPages: Math.max(Math.ceil(totalBlocked / limit), 1)
      }
    });
  } catch (error) {
    console.error("BlockedIPs Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const unblockIP = async (req, res) => {
  try {
    const blockedIP = await BlockedIP.findByIdAndDelete(req.params.id);

    if (!blockedIP) {
      return res.status(404).json({ message: "Blocked IP not found" });
    }

    res.json({
      success: true,
      message: "IP unblocked successfully"
    });
  } catch (error) {
    console.error("UnblockIP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getApiKeys = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req, 4);
    const search = (req.query.search || "").trim();
    const status = req.query.status;
    const filters = { apiKey: { $ne: null } };

    if (status === "blocked") {
      filters.apiKeyBlocked = true;
    } else if (status === "active") {
      filters.apiKeyBlocked = false;
    }

    if (search) {
      filters.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { apiKey: { $regex: search, $options: "i" } },
        { apiKeyBlockedReason: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(
      filters,
      "username email apiKey apiKeyBlocked apiKeyBlockedAt apiKeyBlockedReason apiKeyLastUsedAt apiKeyLastUsedIp createdAt"
    )
      .sort({ apiKeyLastUsedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalKeys = await User.countDocuments(filters);

    res.json({
      success: true,
      totalKeys,
      apiKeys: users,
      pagination: {
        page,
        limit,
        total: totalKeys,
        totalPages: Math.max(Math.ceil(totalKeys / limit), 1)
      }
    });
  } catch (error) {
    console.error("GetApiKeys Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const blockApiKey = async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        apiKeyBlocked: true,
        apiKeyBlockedAt: new Date(),
        apiKeyBlockedReason: reason || "Blocked by admin"
      },
      { returnDocument: "after" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "API key blocked successfully",
      user
    });
  } catch (error) {
    console.error("BlockApiKey Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const unblockApiKey = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        apiKeyBlocked: false,
        apiKeyBlockedAt: null,
        apiKeyBlockedReason: null
      },
      { returnDocument: "after" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "API key unblocked successfully",
      user
    });
  } catch (error) {
    console.error("UnblockApiKey Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const revokeApiKey = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        apiKey: null,
        apiKeyBlocked: false,
        apiKeyBlockedAt: null,
        apiKeyBlockedReason: null,
        apiKeyLastUsedAt: null,
        apiKeyLastUsedIp: null
      },
      { returnDocument: "after" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "API key revoked successfully"
    });
  } catch (error) {
    console.error("RevokeApiKey Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getRules = async (req, res) => {
  try {
    const rules = await getSecurityRules();
    res.json({ success: true, rules });
  } catch (error) {
    console.error("GetRules Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateRules = async (req, res) => {
  try {
    const updates = {};
    const allowedKeys = Object.keys(DEFAULT_RULES).filter((key) => key !== "key");

    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        const value = Number(req.body[key]);
        if (!Number.isNaN(value) && value > 0) {
          updates[key] = value;
        }
      }
    }

    updates.updatedAt = new Date();

    const rules = await SecurityRule.findOneAndUpdate(
      { key: "default" },
      { $set: updates, $setOnInsert: DEFAULT_RULES },
      {
        upsert: true,
        returnDocument: "after"
      }
    );

    res.json({
      success: true,
      message: "Security rules updated successfully",
      rules
    });
  } catch (error) {
    console.error("UpdateRules Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getStats,
  getBlockedIPs,
  unblockIP,
  getApiKeys,
  blockApiKey,
  unblockApiKey,
  revokeApiKey,
  getRules,
  updateRules
};

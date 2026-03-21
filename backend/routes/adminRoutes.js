const express = require("express");
const router = express.Router();

const {
  getStats,
  getBlockedIPs
} = require("../controllers/adminController");

router.get("/stats", getStats);

// 🚨 Suspicious IP monitoring
router.get("/blocked-ips", getBlockedIPs);

module.exports = router;
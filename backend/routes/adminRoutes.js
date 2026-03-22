// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const { getStats, getBlockedIPs } = require("../controllers/adminController");

router.get("/stats", getStats);       // dashboard stats
router.get("/blocked-ips", getBlockedIPs); // blocked IPs monitoring

module.exports = router;
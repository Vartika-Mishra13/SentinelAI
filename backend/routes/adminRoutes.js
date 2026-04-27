const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getStats,
  getBlockedIPs,
  unblockIP,
  getApiKeys,
  blockApiKey,
  unblockApiKey,
  revokeApiKey,
  getRules,
  updateRules
} = require("../controllers/adminController");

router.get("/stats", authMiddleware, getStats);
router.get("/rules", authMiddleware, getRules);
router.patch("/rules", authMiddleware, updateRules);
router.get("/blocked-ips", authMiddleware, getBlockedIPs);
router.delete("/blocked-ips/:id", authMiddleware, unblockIP);
router.get("/api-keys", authMiddleware, getApiKeys);
router.patch("/api-keys/:userId/block", authMiddleware, blockApiKey);
router.patch("/api-keys/:userId/unblock", authMiddleware, unblockApiKey);
router.delete("/api-keys/:userId", authMiddleware, revokeApiKey);

module.exports = router;

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const slidingLimiter = require("../middleware/slidingRateLimiter"); // ✅ FIXED IMPORT

const { generateApiKey, getUsage } = require("../controllers/userController");

// Generate API Key
router.post("/generate-api-key", authMiddleware, generateApiKey);

// Profile
router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user
  });
});

// 🔥 RATE LIMITED ROUTE (SLIDING WINDOW)
router.get("/data", slidingLimiter, (req, res) => {
  res.json({
    message: "API key validated, access granted!",
    user: req.user.username
  });
});

const fixedLimiter = require("../middleware/rateLimiter");

//FIXED WINDOW ROUTE
router.get("/data-fixed", fixedLimiter, (req, res) => {
  res.json({
    message: "Fixed window rate limiting working",
    user: req.user.username
  });
});

// Usage
router.get("/usage", authMiddleware, getUsage);

module.exports = router;
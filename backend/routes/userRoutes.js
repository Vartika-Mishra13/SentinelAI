const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const slidingLimiter = require("../middleware/slidingRateLimiter");
const fixedLimiter = require("../middleware/rateLimiter");

const { generateApiKey, getUsage } = require("../controllers/userController");

router.post("/generate-api-key", authMiddleware, generateApiKey);

router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user
  });
});

router.get("/data", slidingLimiter, (req, res) => {
  res.json({
    message: "API key validated, access granted!",
    user: req.user.username
  });
});

router.get("/data-fixed", fixedLimiter, (req, res) => {
  res.json({
    message: "Fixed window rate limiting working",
    user: req.user.username
  });
});

router.get("/usage", authMiddleware, getUsage);

module.exports = router;

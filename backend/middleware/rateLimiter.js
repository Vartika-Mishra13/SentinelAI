const fixedLimiter = require("./apiKeyMiddleware"); // fixed window
const slidingLimiter = require("./slidingRateLimiter");

const MODE = "fixed"; // change to "sliding" if needed

const rateLimiter = async (req, res, next) => {
  try {
    if (MODE === "sliding") {
      await slidingLimiter(req, res, next);
    } else {
      await fixedLimiter(req, res, next);
    }
  } catch (error) {
    res.locals.requestStatus = "Blocked"; // fallback
    return res.status(500).json({ message: "Rate limiter error" });
  }
};

module.exports = rateLimiter;
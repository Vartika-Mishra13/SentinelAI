const fixedLimiter = require("./apiKeyMiddleware");
const slidingLimiter = require("./slidingRateLimiter");

// ⚡ SWITCH
const MODE = "fixed"; // change to "sliding" later

const rateLimiter = (req, res, next) => {
  if (MODE === "sliding") {
    return slidingLimiter(req, res, next);
  } else {
    return fixedLimiter(req, res, next);
  }
};

module.exports = rateLimiter;
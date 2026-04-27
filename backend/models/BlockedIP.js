const mongoose = require("mongoose");

const blockedIPSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: "Suspicious activity"
  },
  geoCountry: {
    type: String,
    default: "Unknown"
  },
  geoLabel: {
    type: String,
    default: "Unknown Region"
  },
  blockedAt: {
    type: Date,
    default: Date.now
  },
  blockedUntil: {
    type: Date
  }
});

module.exports = mongoose.model("BlockedIP", blockedIPSchema);

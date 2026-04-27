const mongoose = require("mongoose");

const securityRuleSchema = new mongoose.Schema({
  key: {
    type: String,
    default: "default",
    unique: true
  },
  slidingLimit: {
    type: Number,
    default: 5
  },
  slidingWindowSeconds: {
    type: Number,
    default: 60
  },
  suspiciousThresholdPercent: {
    type: Number,
    default: 60
  },
  burstThresholdCount: {
    type: Number,
    default: 3
  },
  burstWindowSeconds: {
    type: Number,
    default: 2
  },
  spikeThresholdCount: {
    type: Number,
    default: 5
  },
  spikeWindowSeconds: {
    type: Number,
    default: 10
  },
  ipBurstThresholdCount: {
    type: Number,
    default: 10
  },
  ipBurstWindowSeconds: {
    type: Number,
    default: 10
  },
  ipBlockDurationSeconds: {
    type: Number,
    default: 60
  },
  userHourlyLimit: {
    type: Number,
    default: 500
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("SecurityRule", securityRuleSchema);

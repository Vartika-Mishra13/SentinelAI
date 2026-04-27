const SecurityRule = require("../models/SecurityRule");

const DEFAULT_RULES = {
  key: "default",
  slidingLimit: 5,
  slidingWindowSeconds: 60,
  suspiciousThresholdPercent: 60,
  burstThresholdCount: 3,
  burstWindowSeconds: 2,
  spikeThresholdCount: 5,
  spikeWindowSeconds: 10,
  ipBurstThresholdCount: 10,
  ipBurstWindowSeconds: 10,
  ipBlockDurationSeconds: 60,
  userHourlyLimit: 500
};

const getSecurityRules = async () => {
  const rules = await SecurityRule.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: DEFAULT_RULES },
    {
      upsert: true,
      returnDocument: "after"
    }
  );

  return rules;
};

module.exports = { DEFAULT_RULES, getSecurityRules };

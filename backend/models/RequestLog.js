const mongoose = require("mongoose");

const requestLogSchema = new mongoose.Schema({
  apiKey: { type: String },
  ip: { type: String },
  endpoint: { type: String },
  status: { type: String, enum: ["Normal", "Suspicious", "Blocked"], default: "Normal" },
  reason: { type: String, default: null },
  geoCountry: { type: String, default: "Unknown" },
  geoLabel: { type: String, default: "Unknown Region" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RequestLog", requestLogSchema);

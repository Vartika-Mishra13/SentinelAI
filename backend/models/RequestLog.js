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
  anomalyScore: { type: Number, default: 0 },        // ← add karo
  anomalyReasons: { type: [String], default: [] },   // ← add karo
});

module.exports = mongoose.model("RequestLog", requestLogSchema);
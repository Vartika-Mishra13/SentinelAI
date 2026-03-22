const mongoose = require("mongoose");

const requestLogSchema = new mongoose.Schema({
  apiKey: { type: String },
  ip: { type: String },
  endpoint: { type: String },
  status: { type: String, enum: ["Normal", "Suspicious", "Blocked"], default: "Normal" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RequestLog", requestLogSchema);
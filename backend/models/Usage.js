const mongoose = require("mongoose");

const usageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
     default: "unknown"
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Usage", usageSchema);
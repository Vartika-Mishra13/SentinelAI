const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    default: null
  },
  apiKeyBlocked: {
    type: Boolean,
    default: false
  },
  apiKeyBlockedAt: {
    type: Date,
    default: null
  },
  apiKeyBlockedReason: {
    type: String,
    default: null
  },
  apiKeyLastUsedAt: {
    type: Date,
    default: null
  },
  apiKeyLastUsedIp: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);

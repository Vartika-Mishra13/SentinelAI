const User = require("../models/User");
const Usage = require("../models/Usage");
const { v4: uuidv4 } = require("uuid");

// Generate API Key
const generateApiKey = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;

    const apiKey = "sk_" + uuidv4();

    const user = await User.findByIdAndUpdate(
      userId,
      { apiKey },
      { new: true }
    );

    res.json({
      message: "API Key generated successfully",
      apiKey: user.apiKey
    });

  } catch (error) {
    console.error("Error generating API key:", error);
    res.status(500).json({ message: "Error generating API key" });
  }
};


// Get Usage
const getUsage = async (req, res) => {
  try {

    const userId = req.user._id || req.user.userId;

    // Total API calls
    const totalRequests = await Usage.countDocuments({ userId });

    // Latest 50 logs
     const mongoose = require("mongoose");

    const usageRecords = await Usage
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(5)
     .select("endpoint ipAddress timestamp -_id");

    // Most used endpoint
const mostUsed = await Usage.aggregate([
  { $match: { userId: new mongoose.Types.ObjectId(userId) } },
  { $group: { _id: "$endpoint", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 1 }
]);
    const mostUsedEndpoint = mostUsed.length > 0 ? mostUsed[0]._id : null;

    res.json({
      success: true,
      totalRequests: totalRequests,
      mostUsedEndpoint: mostUsedEndpoint,
      usage: usageRecords
    });

  } catch (error) {

    console.error("Error retrieving usage:", error);

    res.status(500).json({
      success: false,
      message: "Server error retrieving usage"
    });

  }
};
module.exports = { generateApiKey, getUsage };
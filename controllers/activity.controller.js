// controllers/activity.controller.js
const Activity = require("../models/Activity");
const User = require("../models/User");

const getWeeklySummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get start of current week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const activities = await Activity.find({
      user: userId,
      createdAt: { $gte: startOfWeek },
    });

    const total = activities.reduce((sum, act) => sum + act.carbonFootprint, 0);

    const user = await User.findById(userId); // ✅ Fetch latest goal

    const goal = user.weeklyGoal || 100; // Default goal if not set
    const status = total <= goal ? "under" : "over";

    res.json({ total: total.toFixed(2), goal, status });
  } catch (err) {
    console.error("Weekly summary error:", err);
    res.status(500).json({ message: "Error getting weekly summary" });
  }
};

module.exports = { getWeeklySummary };

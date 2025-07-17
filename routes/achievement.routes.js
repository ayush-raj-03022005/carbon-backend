const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const User = require("../models/User");
const Activity = require("../models/Activity");
const Goal = require("../models/Goal");

// GET /api/achievements - Fetch dynamic achievements for logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user, total CO2 from activities, and their current goal
    const user = await User.findById(userId);
    const activities = await Activity.find({ user: userId });
    const goal = await Goal.findOne({ user: userId });

    const totalCO2 = activities.reduce((sum, act) => sum + act.carbonFootprint, 0);
    const achievements = [];

    // 🎉 Badge: First Login
    if (user && user.createdAt) {
      const accountAge = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
      if (accountAge < 1) {
        achievements.push({
          title: "🎉 First Login",
          description: "You logged in for the first time!",
        });
      }
    }

    // 🟢 Badge: Goal Achiever
    if (goal && totalCO2 <= goal.amount) {
      achievements.push({
        title: "🏆 Goal Achiever",
        description: `Your total CO₂ (${totalCO2.toFixed(2)} kg) is below your goal of ${goal.amount} kg!`,
      });
    }

    // (Optional: Add more badges here later based on milestones)

    res.json({ achievements });
  } catch (err) {
    console.error("Error fetching achievements:", err);
    res.status(500).json({ message: "Failed to fetch achievements" });
  }
});

module.exports = router;

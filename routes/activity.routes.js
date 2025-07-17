const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const Activity = require("../models/Activity");
const User = require("../models/User");
const Achievement = require("../models/Achievement");
const moment = require("moment");
const { getWeeklySummary } = require("../controllers/activity.controller"); // ✅ ADD THIS LINE

// Leaderboard Route
router.get("/leaderboard", verifyToken, async (req, res) => {
  try {
    const weekStart = moment().startOf("isoWeek").toDate();
    const weekEnd = moment().endOf("isoWeek").toDate();

    const leaderboard = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: weekStart, $lte: weekEnd }
        }
      },
      {
        $group: {
          _id: "$user",
          totalCO2: { $sum: "$carbonFootprint" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $project: {
          name: "$userInfo.name",
          totalCO2: 1
        }
      },
      {
        $sort: { totalCO2: 1 }
      }
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

// Weekly Summary Route
router.get("/weekly-summary", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const weekStart = moment().startOf("isoWeek").toDate();
    const weekEnd = moment().endOf("isoWeek").toDate();

    const activities = await Activity.find({
      user: req.user.id,
      createdAt: { $gte: weekStart, $lte: weekEnd }
    });

    const total = activities.reduce((sum, act) => sum + act.carbonFootprint, 0);
    const status = total <= user.weeklyGoal ? "under" : "over";

    res.json({
      goal: user.weeklyGoal,
      total: total.toFixed(2),
      status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching weekly summary" });
  }
});

// Emission Factors
const emissionFactors = {
  transport: {
    car: 0.21,
    bus: 0.1,
    bike: 0.02,
    train: 0.05
  },
  electricity: 0.7,
  diet: {
    vegetarian: 2.0,
    nonVegetarian: 4.5,
    vegan: 1.5
  }
};

// Get Logged-in User's Activities
router.get("/my", verifyToken, async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

// Helper to check and award achievements
const checkAndAwardAchievements = async (userId) => {
  const count = await Activity.countDocuments({ user: userId });

  const milestones = [
    { count: 1, title: "First Step", description: "Logged your first activity!" },
    { count: 5, title: "Getting Greener", description: "Logged 5 activities." },
    { count: 10, title: "Eco Warrior", description: "Logged 10 activities!" },
  ];

  for (const m of milestones) {
    const alreadyUnlocked = await Achievement.findOne({ user: userId, title: m.title });
    if (count >= m.count && !alreadyUnlocked) {
      await new Achievement({
        user: userId,
        title: m.title,
        description: m.description,
      }).save();
    }
  }
};

// POST Activity
router.post("/", verifyToken, async (req, res) => {
  const { type, data } = req.body;
  let carbon = 0;
  let suggestion = "";

  try {
    if (type === "transport") {
      const factor = emissionFactors.transport[data.mode];
      carbon = parseFloat(data.distance) * factor;
      suggestion = "Try walking, cycling, or using public transport more often.";
    } else if (type === "electricity") {
      carbon = parseFloat(data.usage) * emissionFactors.electricity;
      suggestion = "Reduce electricity usage and switch to renewable sources.";
    } else if (type === "diet") {
      const factor = emissionFactors.diet[data.dietType];
      carbon = factor;
      suggestion = "Consider eating more plant-based meals.";
    } else {
      return res.status(400).json({ message: "Invalid activity type." });
    }

    const newActivity = new Activity({
      user: req.user.id,
      type,
      data,
      carbonFootprint: carbon
    });

    await newActivity.save();
    await checkAndAwardAchievements(req.user.id);

    res.json({
      carbonFootprint: carbon.toFixed(2),
      suggestion
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error calculating footprint" });
  }
});

router.get("/weekly-summary", verifyToken, getWeeklySummary);

module.exports = router;

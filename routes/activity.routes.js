const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const Activity = require("../models/Activity");

// GET /api/activities - fetch all activities (for dashboard)
router.get("/", verifyToken, async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

// GET /api/activities/leaderboard - Top users with lowest emissions
router.get("/leaderboard", async (req, res) => {
  try {
    const leaderboard = await Activity.aggregate([
      {
        $group: {
          _id: "$user",
          totalCarbonFootprint: { $sum: "$carbonFootprint" },
        },
      },
      {
        $sort: { totalCarbonFootprint: 1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

// GET /api/activities/weekly-summary
router.get("/weekly-summary", verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const activities = await Activity.find({
      user: req.user.id,
      date: { $gte: lastWeek, $lte: today },
    });

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch weekly summary" });
  }
});

// GET /api/activities/my - Get all activities of the current user
router.get("/my", verifyToken, async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.id }).sort({ date: -1 });
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user activities" });
  }
});

// POST /api/activities - Log a new activity
router.post("/", verifyToken, async (req, res) => {
  const { type, value, carbonFootprint, date } = req.body;

  try {
    const activity = new Activity({
      user: req.user.id,
      type,
      value,
      carbonFootprint,
      date,
    });

    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to log activity" });
  }
});

module.exports = router;

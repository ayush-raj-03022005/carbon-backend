const mongoose = require("mongoose"); // ✅ Add this line at the top

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  hasLoggedIn: {
    type: Boolean,
    default: false,
  },
  goal: {
    type: Number,
    default: 100, // kg CO₂ target per week or month
  },
  weeklyGoal: {
    type: Number,
    default: 50 // Default weekly CO₂ goal in kg
  }
  
}, { timestamps: true });


module.exports = mongoose.model("User", userSchema);

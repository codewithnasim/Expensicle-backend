const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const upload = require("../middleware/upload");
const router = express.Router();

// Debug middleware to log requests
router.use((req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.url}`);
  console.log("Request Body:", req.body);
  next();
});

// Register Route
router.post("/register", async (req, res) => {
  console.log("Register endpoint hit");
  console.log("Request body:", req.body);
  console.log("Parsed body:", req.body);
  console.log("File:", req.file);

  const { fullName, email, password } = req.body;

  console.log("Password:", password);

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPass = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullName,
      email,
      password: hashedPass,
      photo: req.file?.filename || "",
    });

    try {
      const savedUser = await newUser.save();
      console.log("Saved User:", savedUser);
    } catch (err) {
      console.error("Error saving user:", err);
    }

    res.status(201).json({ message: "User Registered Successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

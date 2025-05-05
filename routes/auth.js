const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const upload = require("../middleware/upload");
const router = express.Router();

// Register Route
router.post("/register", upload.single("photo"), async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already exists" });

    const hashedPass = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullName,
      email,
      password: hashedPass,
      photo: req.file?.filename || "",
    });

    await newUser.save();
    res.status(201).json({ message: "User Registered Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid Email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid Password" });

    const token = jwt.sign({ id: user._id }, "secret_key", { expiresIn: "1h" });

    res.json({
      token,
      user: {
        fullName: user.fullName,
        email: user.email,
        photo: user.photo,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const path = require("path");
// const fs = require("fs");
// const authRoutes = require("./routes/auth");
// const Expense = require("./models/Expense"); // Import the Expense model
// const authenticateToken = require("./middleware/authenticateToken"); // Import your token middleware
// require("dotenv").config();

// const app = express();

// // Ensure the uploads directory exists
// const uploadsDir = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir);
//   console.log("Uploads directory created");
// }

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Serve uploaded files
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Add this debug middleware before routes
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

// // Add this after your middleware setup
// app.get("/", (req, res) => {
//   res.json({ message: "Welcome to auth API" });
// });

// // Routes
// app.use("/auth", authRoutes);

// // Add the /expenses route directly here
// app.get("/expenses", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.id; // Extracted from the token by the middleware
//     const expenses = await Expense.find({ user: userId });
//     res.json(expenses);
//   } catch (err) {
//     console.error("Error fetching expenses:", err);
//     res.status(500).json({ error: "Failed to fetch expenses" });
//   }
// });

// // Connect to MongoDB
// mongoose
//   .connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("MongoDB Connected"))
//   .catch((err) => {
//     console.error("MongoDB Connection Error:", err);
//     process.exit(1);
//   });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');

const categoryRoutes = require('./routes/categoryRoutes');
const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/user', userRoutes);




// Add this with other route middlewares
app.use('/api/categories', categoryRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
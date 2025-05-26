// Correct server.js setup
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes'); // Make sure this exists
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect Database
connectDB();

// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'exp://localhost:19000', 'exp://192.168.1.*:19000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/categories', categoryRoutes); // This is likely line 91

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
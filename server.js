// Correct server.js setup
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect Database
connectDB();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = "*";
    
    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin.startsWith(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    });
    
    if (isAllowed || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    console.warn('Blocked by CORS:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID'],
  exposedHeaders: ['Content-Length', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/categories', categoryRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('CORS Enabled:', corsOptions.origin);
  console.log(`MongoDB URI: ${process.env.MONGO_URI ? 'Configured' : 'Not configured'}`);
});
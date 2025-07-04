const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Currency code to symbol mapping
const currencySymbols = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥'
};

// Generate tokens
const generateTokens = (user) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets are not configured');
  }

  // Access token expires in 1 hour
  const accessToken = jwt.sign(
    { 
      user: { 
        id: user._id,
        email: user.email,
        fullName: user.fullName
      },
      type: 'access'
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '1h',
      issuer: 'expense-tracker-api',
      audience: ['web', 'mobile']
    }
  );

  // Refresh token expires in 7 days
  const refreshToken = jwt.sign(
    { 
      user: { 
        id: user._id,
        type: 'refresh'
      } 
    },
    process.env.JWT_REFRESH_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'expense-tracker-api',
      audience: ['web', 'mobile']
    }
  );

  return { 
    accessToken, 
    refreshToken,
    expiresIn: 3600 // 1 hour in seconds
  };
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    user = new User({
      fullName,
      email,
      password
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({ 
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login attempt failed: User with email ${email} not found`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login attempt failed: Invalid password for user ${user._id}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = generateTokens(user);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    console.log(`User ${user._id} logged in successfully`);

    // Prepare user data for response
    const userData = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      currencyPreference: user.currencyPreference || 'INR',
      darkMode: user.darkMode || false,
      monthlyBudget: user.monthlyBudget || 0
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn,
          tokenType: 'Bearer'
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during login',
      code: 'LOGIN_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    res.status(500).json({ error: "Server error" });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user
    const user = await User.findById(decoded.user.id);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json(tokens);
  } catch (err) {
    console.error(err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// Get logged-in user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user profile (name, email, etc)
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    
    // Find the user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;

    await user.save();

    // Generate new tokens with updated user info
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({ 
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        currencyPreference: user.currencyPreference,
        darkMode: user.darkMode,
        monthlyBudget: user.monthlyBudget
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user's currency preference
exports.updateCurrency = async (req, res) => {
  try {
    const { currency } = req.body;
    
    // Validate currency
    const validCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }
    
    // Find and update user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update currency
    user.currencyPreference = currency;
    await user.save();

    // Generate new tokens with updated user info
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({ 
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        currencyPreference: user.currencyPreference,
        darkMode: user.darkMode,
        monthlyBudget: user.monthlyBudget
      },
      accessToken,
      refreshToken,
      message: 'Currency preference updated successfully'
    });
  } catch (err) {
    console.error('Update currency error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
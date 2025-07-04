const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   POST api/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post('/refresh-token', authController.refreshToken);

// @route   PUT api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, authController.updateProfile);

// @route   PUT api/auth/currency
// @desc    Update user's currency preference
// @access  Private
router.put('/currency', auth, authController.updateCurrency);

// @route   GET api/auth/user
// @desc    Get logged in user
// @access  Private
router.get('/user', auth, authController.getUser);

module.exports = router;
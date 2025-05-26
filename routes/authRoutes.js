const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../config/auth');

// @route   POST api/auth/register
// @desc    Register user
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Login user
router.post('/login', authController.login);

// @route   GET api/auth/user
// @desc    Get user data
router.get('/user', auth, authController.getUser);

module.exports = router;
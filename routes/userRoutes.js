const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../config/auth');

// Update settings
router.put('/settings', auth, userController.updateSettings);

// Get settings
router.get('/settings', auth, userController.getSettings);

module.exports = router;
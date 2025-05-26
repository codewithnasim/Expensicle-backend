const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../config/auth');

// Update settings
router.put('/settings', auth, userController.updateSettings);

// Get settings
router.get('/settings', auth, userController.getSettings);

// Update user name
router.put('/update-name', auth, userController.updateName);

// Upload user photo
router.post('/upload-photo', auth, userController.uploadPhoto);

// Export user data
router.get('/export-data', auth, userController.exportData);

module.exports = router;
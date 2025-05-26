const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const auth = require('../config/auth');

// Add transaction
router.post('/', auth, transactionController.addTransaction);

// Get transactions
router.get('/', auth, transactionController.getTransactions);

// Get financial summary
router.get('/summary', auth, transactionController.getFinancialSummary);

module.exports = router;
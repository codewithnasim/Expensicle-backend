const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');

// Add transaction
router.post('/', auth, transactionController.addTransaction);

// Get transactions
router.get('/', auth, transactionController.getTransactions);

// Get financial summary
router.get('/summary', auth, transactionController.getFinancialSummary);

// Clear all transactions
router.delete('/clear', auth, transactionController.clearAllTransactions);

// Update transaction
router.put('/:id', auth, transactionController.updateTransaction);

// Delete transaction
router.delete('/:id', auth, transactionController.deleteTransaction);

module.exports = router;
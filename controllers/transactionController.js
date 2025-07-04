const Transaction = require('../models/Transaction');

// Add new transaction
exports.addTransaction = async (req, res) => {
  try {
    const { description, amount, date, category, type, notes } = req.body;

    
    // Add session validation
    if (!req.user || !req.user.id) {
      console.error('Invalid user session');
      return res.status(401).json({ error: "Invalid session" });
    }

    if (!description || !amount || !date || !category || !type) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newTransaction = new Transaction({
      user: req.user.id,
      description,
      amount,
      date,
      category,
      type,
      notes,
    });

    await newTransaction.save();
    res.status(201).json(newTransaction);
  } catch (err) {
    console.error('Error in addTransaction:', err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all transactions for user
exports.getTransactions = async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);

  console.log(`[${requestId}] [${new Date().toISOString()}] GET /api/transactions`);
  console.log(`[${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));

  try {
    // Log user info
    console.log(`[${requestId}] Authenticated user:`, {
      userId: req.user?.id,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Validate session
    if (!req.user || !req.user.id) {
      console.error(`[${requestId}] Invalid user session`);
      return res.status(401).json({ 
        success: false,
        error: "Invalid session",
        code: "UNAUTHORIZED"
      });
    }

    // Log query parameters
    console.log(`[${requestId}] Query parameters:`, req.query);

    // Fetch transactions from database
    console.log(`[${requestId}] Fetching transactions from database...`);
    const transactions = await Transaction.find({ user: req.user.id })
      .select('_id description amount date category type notes')
      .sort({ date: -1 }) // Sort by date descending
      .lean(); // Convert to plain JavaScript object

    console.log(`[${requestId}] Found ${transactions.length} transactions`);

    // Calculate response time
    const responseTime = Date.now() - startTime;
    console.log(`[${requestId}] Request processed in ${responseTime}ms`);

    // Send response
    res.json({
      success: true,
      data: transactions,
      meta: {
        count: transactions.length,
        responseTime: `${responseTime}ms`
      }
    });

  } catch (err) {
    console.error(`[${requestId}] Error in getTransactions:`, {
      message: err.message,
      stack: err.stack,
      name: err.name
    });

    // More specific error handling
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        code: 'INVALID_DATA_FORMAT'
      });
    }

    // Default error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { description, amount, date, category, type, notes } = req.body;
    const transactionId = req.params.id;

    // Find the transaction and verify ownership
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Update fields
    if (description) transaction.description = description;
    if (amount) transaction.amount = amount;
    if (date) transaction.date = date;
    if (category) transaction.category = category;
    if (type) transaction.type = type;
    if (notes !== undefined) transaction.notes = notes;

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;

    // Find the transaction and verify ownership
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    await transaction.deleteOne();
    res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get financial summary
exports.getFinancialSummary = async (req, res) => {
  try {
    const { period } = req.query;
    const userId = req.user.id;
    let dateFilter = new Date();

    if (period === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (period === 'month') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    } else if (period === 'year') {
      dateFilter.setFullYear(dateFilter.getFullYear() - 1);
    }

    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: dateFilter }
    });

    const summary = {
      balance: 0,
      income: 0,
      expense: 0,
      categories: {}
    };

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        summary.income += transaction.amount;
        summary.balance += transaction.amount;
      } else {
        summary.expense += transaction.amount;
        summary.balance -= transaction.amount;
        
        // Category breakdown
        if (!summary.categories[transaction.category]) {
          summary.categories[transaction.category] = 0;
        }
        summary.categories[transaction.category] += transaction.amount;
      }
    });

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Clear all transactions for user
exports.clearAllTransactions = async (req, res) => {
  try {
    // Delete all transactions for the authenticated user
    await Transaction.deleteMany({ user: req.user.id });
    res.json({ message: "All transactions cleared successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
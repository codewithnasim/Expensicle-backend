const Transaction = require('../models/Transaction');

// Add new transaction
exports.addTransaction = async (req, res) => {
  try {
    const { description, amount, date, category, type, notes } = req.body;
    
    const newTransaction = new Transaction({
      user: req.user.id,
      description,
      amount,
      date,
      category,
      type,
      notes
    });

    await newTransaction.save();
    res.status(201).json(newTransaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all transactions for user
exports.getTransactions = async (req, res) => {
  try {
    const { period, type } = req.query;
    let query = { user: req.user.id };

    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by period
    if (period) {
      const dateFilter = new Date();
      
      if (period === 'week') {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (period === 'month') {
        dateFilter.setMonth(dateFilter.getMonth() - 1);
      } else if (period === 'year') {
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
      }

      query.date = { $gte: dateFilter };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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
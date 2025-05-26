const User = require('../models/User');

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    const { darkMode, currency, monthlyBudget } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        darkMode,
        currencyPreference: currency,
        monthlyBudget 
      },
      { new: true }
    );

    res.json({
      darkMode: user.darkMode,
      currency: user.currencyPreference,
      monthlyBudget: user.monthlyBudget
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user settings
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('darkMode currencyPreference monthlyBudget');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
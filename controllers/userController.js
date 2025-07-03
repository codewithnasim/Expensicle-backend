const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ExcelJS = require('exceljs');
const { generateTokens } = require('./authController');

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    console.log('Update settings request received:', {
      body: req.body,
      user: req.user
    });

    const { darkMode, currency, monthlyBudget } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.error('No user ID in request');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Map currency symbols to codes
    const currencyMap = {
      '₹': 'INR',
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      // Also allow direct currency codes for backward compatibility
      'INR': 'INR',
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
      'JPY': 'JPY'
    };

    const validCurrencies = ['₹', '$', '€', '£', '¥', 'INR', 'USD', 'EUR', 'GBP', 'JPY'];
    
    // Prepare update data
    const updateData = {};
    
    // Handle dark mode
    if (darkMode !== undefined) {
      updateData.darkMode = darkMode;
    }

    // Handle currency
    if (currency !== undefined) {
      if (!validCurrencies.includes(currency)) {
        console.error('Invalid currency:', currency);
        return res.status(400).json({ 
          success: false,
          message: 'Invalid currency',
          received: currency,
          valid: ['₹ (INR)', '$ (USD)', '€ (EUR)', '£ (GBP)', '¥ (JPY)']
        });
      }
      // Convert symbol to code if needed
      updateData.currencyPreference = currencyMap[currency] || currency;
    }

    // Handle monthly budget
    if (monthlyBudget !== undefined) {
      const budget = parseFloat(monthlyBudget);
      if (isNaN(budget) || budget < 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Monthly budget must be a positive number' 
        });
      }
      updateData.monthlyBudget = budget;
    }

    console.log('Updating user settings with data:', updateData);

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        context: 'query' // This is needed for validators to work with update
      }
    ).select('-password');

    if (!user) {
      console.error('User not found with ID:', userId);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log('Settings updated successfully for user:', user.email, {
      darkMode: user.darkMode,
      currencyPreference: user.currencyPreference,
      monthlyBudget: user.monthlyBudget
    });

    // Get the currency symbol for the response
    const currencyToSymbol = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥'
    };

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        darkMode: user.darkMode,
        currency: currencyToSymbol[user.currencyPreference] || user.currencyPreference,
        monthlyBudget: user.monthlyBudget
      }
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
};

// Get user settings
exports.getSettings = async (req, res) => {
  try {
    console.log('Getting settings for user:', req.user?.id);
    
    const user = await User.findById(req.user?.id)
      .select('darkMode currencyPreference monthlyBudget email fullName');

    if (!user) {
      console.error('User not found with ID:', req.user?.id);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Map currency code to symbol for frontend
    const currencyToSymbol = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥'
    };

    const settings = {
      darkMode: user.darkMode || false,
      currency: user.currencyPreference ? 
        (currencyToSymbol[user.currencyPreference] || user.currencyPreference) : '₹',
      monthlyBudget: user.monthlyBudget || 0,
      email: user.email,
      fullName: user.fullName
    };

    console.log('Returning settings:', settings);
    
    res.status(200).json({
      success: true,
      ...settings
    });
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving settings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update user name
exports.updateName = async (req, res) => {
  try {
    console.log('Update name request received:', {
      userId: req.user?.id,
      body: req.body
    });
    
    const { fullName } = req.body;
    const userId = req.user?.id;

    // Validate user ID
    if (!userId) {
      console.error('No user ID in request');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Validate fullName
    if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid name',
        code: 'INVALID_NAME'
      });
    }

    const trimmedName = fullName.trim();
    
    // Validate name length
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name must be between 2 and 50 characters',
        code: 'INVALID_NAME_LENGTH'
      });
    }

    console.log(`Updating name for user ${userId} to: ${trimmedName}`);

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { fullName: trimmedName },
      { 
        new: true, 
        runValidators: true,
        context: 'query' // Required for validators to work with update
      }
    ).select('-password -refreshToken');

    if (!user) {
      console.error('User not found with ID:', userId);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log(`Name updated successfully for user: ${user.email}`);

    // Generate new tokens with updated user info
    const { accessToken, refreshToken, expiresIn } = generateTokens(user);
    
    // Update refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Name updated successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          currencyPreference: user.currencyPreference || 'INR',
          darkMode: user.darkMode || false,
          monthlyBudget: user.monthlyBudget || 0
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn,
          tokenType: 'Bearer'
        }
      }
    });
  } catch (error) {
    console.error('Error in updateName:', error);
    if (error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}

// Export user data to Excel
exports.exportData = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Exporting data for user:', userId);
    
    // Get user data
    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.log('User not found for export:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found user:', { id: user._id, email: user.email });

    // Get user's transactions
    const transactions = await Transaction.find({ user: userId })
      .sort({ date: -1 })
      .populate('category');

    console.log('Found transactions:', transactions.length);

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Expensicle';
    workbook.created = new Date();

    // Add User Info worksheet
    const userSheet = workbook.addWorksheet('User Info');
    userSheet.columns = [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Value', key: 'value', width: 30 }
    ];

    userSheet.addRows([
      { field: 'Name', value: user.fullName },
      { field: 'Email', value: user.email },
      { field: 'Currency', value: user.currencyPreference },
      { field: 'Monthly Budget', value: user.monthlyBudget },
      { field: 'Account Created', value: user.createdAt.toLocaleDateString() }
    ]);

    // Add Transactions worksheet
    const transactionsSheet = workbook.addWorksheet('Transactions');
    transactionsSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Description', key: 'description', width: 30 }
    ];

    // Add transaction rows
    transactions.forEach(transaction => {
      transactionsSheet.addRow({
        date: new Date(transaction.date).toLocaleDateString(),
        category: transaction.category ? transaction.category.name : 'Uncategorized',
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || ''
      });
    });

    // Style the worksheets
    [userSheet, transactionsSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }
      };
      sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };
    });

    console.log('Excel file created successfully');

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=expensicle-export-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log('Export completed successfully');

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ 
      message: 'Error exporting data',
      error: error.message 
    });
  }
};
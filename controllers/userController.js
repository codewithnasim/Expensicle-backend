const User = require('../models/User');
const Transaction = require('../models/Transaction');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'user-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
}).single('photo');

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    const { darkMode, currency, monthlyBudget } = req.body;
    const userId = req.user.id;
    
    console.log('Update settings request:', {
      userId,
      body: req.body,
      user: req.user
    });

    // Validate currency
    const validCurrencies = ['₹', '$', '€', '£', '¥'];
    if (currency && !validCurrencies.includes(currency)) {
      console.log('Invalid currency:', currency);
      return res.status(400).json({ 
        message: 'Invalid currency',
        received: currency,
        valid: validCurrencies 
      });
    }

    // Validate monthly budget
    if (monthlyBudget && (isNaN(monthlyBudget) || monthlyBudget < 0)) {
      return res.status(400).json({ message: 'Invalid monthly budget' });
    }

    const updateData = {};
    if (darkMode !== undefined) updateData.darkMode = darkMode;
    if (currency) updateData.currencyPreference = currency;
    if (monthlyBudget) updateData.monthlyBudget = monthlyBudget;

    console.log('Updating user with data:', updateData);

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log('User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User updated successfully:', {
      id: user._id,
      currencyPreference: user.currencyPreference,
      darkMode: user.darkMode,
      monthlyBudget: user.monthlyBudget
    });

    res.json({
      message: 'Settings updated successfully',
      settings: {
        darkMode: user.darkMode,
        currency: user.currencyPreference,
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
    const user = await User.findById(req.user.id)
      .select('darkMode currencyPreference monthlyBudget');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      darkMode: user.darkMode,
      currency: user.currencyPreference,
      monthlyBudget: user.monthlyBudget
    });
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user name
exports.updateName = async (req, res) => {
  try {
    const { fullName } = req.body;
    const userId = req.user.id;  // This comes from the token

    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    console.log('Updating name for user:', userId);  // Add logging

    const user = await User.findByIdAndUpdate(
      userId,
      { fullName: fullName.trim() },
      { new: true }
    ).select('-password');

    if (!user) {
      console.log('User not found with ID:', userId);  // Add logging
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User updated successfully:', user);  // Add logging

    res.json({
      message: 'Name updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        photo: user.photo
      }
    });
  } catch (error) {
    console.error('Error updating name:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload user photo
exports.uploadPhoto = async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const userId = req.user.id;
      console.log('Uploading photo for user:', userId);

      // Verify user exists before proceeding
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        // Delete uploaded file if user not found
        if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'User not found' });
      }

      const photoUrl = req.file.filename;
      console.log('New photo filename:', photoUrl);

      const user = await User.findByIdAndUpdate(
        userId,
        { photo: photoUrl },
        { new: true }
      ).select('-password');

      // Delete old photo if exists
      if (existingUser.photo && existingUser.photo !== photoUrl) {
        const oldPhotoPath = path.join('uploads', existingUser.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      console.log('Photo upload successful for user:', userId);

      res.json({
        message: 'Photo uploaded successfully',
        photoUrl: photoUrl,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          photo: user.photo
        }
      });
    } catch (error) {
      // Delete uploaded file if error occurs
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Error uploading photo:', error);
      res.status(500).json({ message: 'Server error while uploading photo' });
    }
  });
};

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
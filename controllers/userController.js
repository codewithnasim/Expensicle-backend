const User = require('../models/User');
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
    
    // Validate currency
    const validCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY'];
    if (currency && !validCurrencies.includes(currency)) {
      return res.status(400).json({ message: 'Invalid currency' });
    }

    // Validate monthly budget
    if (monthlyBudget && (isNaN(monthlyBudget) || monthlyBudget < 0)) {
      return res.status(400).json({ message: 'Invalid monthly budget' });
    }

    const updateData = {};
    if (darkMode !== undefined) updateData.darkMode = darkMode;
    if (currency) updateData.currencyPreference = currency;
    if (monthlyBudget) updateData.monthlyBudget = monthlyBudget;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('darkMode currencyPreference monthlyBudget');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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
    res.status(500).json({ message: 'Server error' });
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
    const userId = req.user.id;

    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { fullName: fullName.trim() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const userId = req.user.id;
      const photoUrl = req.file.filename;

      const user = await User.findByIdAndUpdate(
        userId,
        { photo: photoUrl },
        { new: true }
      ).select('-password');

      if (!user) {
        // Delete uploaded file if user not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete old photo if exists
      if (user.photo && user.photo !== photoUrl) {
        const oldPhotoPath = path.join('uploads', user.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

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
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Error uploading photo:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
};

// Export user data to Excel
exports.exportData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's transactions
    const transactions = await Transaction.find({ user: userId })
      .sort({ date: -1 })
      .populate('category');

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

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Error exporting data' });
  }
};
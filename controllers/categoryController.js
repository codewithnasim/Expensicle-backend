const Category = require('../models/Category');
const { defaultCategories } = require('../config/defaultCategories');

// Get all categories for a user (including defaults)
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's custom categories
    const customCategories = await Category.find({ user: userId });

    // Combine with default categories
    const allCategories = {
      expense: [...defaultCategories.expense],
      income: [...defaultCategories.income]
    };

    // Add custom categories
    customCategories.forEach(cat => {
      if (cat.type === 'expense') {
        allCategories.expense.push(cat);
      } else {
        allCategories.income.push(cat);
      }
    });

    res.json(allCategories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add a new custom category
exports.addCategory = async (req, res) => {
  try {
    const { name, type, icon } = req.body;
    const userId = req.user.id;

    const newCategory = new Category({
      user: userId,
      name,
      type,
      icon
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;

    const updatedCategory = await Category.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { name, icon },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(updatedCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findOneAndDelete({
      _id: id,
      user: req.user.id
    });

    if (!deletedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
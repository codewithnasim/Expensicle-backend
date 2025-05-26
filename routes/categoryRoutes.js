const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../config/auth');

// @route   GET api/categories
// @desc    Get all categories
router.get('/', auth, categoryController.getCategories);

// @route   POST api/categories
// @desc    Add a new category
router.post('/', auth, categoryController.addCategory);

// @route   PUT api/categories/:id
// @desc    Update a category
router.put('/:id', auth, categoryController.updateCategory);

// @route   DELETE api/categories/:id
// @desc    Delete a category
router.delete('/:id', auth, categoryController.deleteCategory);

module.exports = router;
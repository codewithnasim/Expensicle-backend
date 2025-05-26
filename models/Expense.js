const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the User model
  type: { type: String, enum: ["income", "expense"], required: true }, // Type of transaction
  title: { type: String, required: true }, // Title of the transaction
  amount: { type: Number, required: true }, // Amount of the transaction
  category: { type: String, required: true }, // Category of the transaction
  date: { type: Date, required: true }, // Date of the transaction
  notes: { type: String }, // Optional notes
});

module.exports = mongoose.model("Expense", expenseSchema);
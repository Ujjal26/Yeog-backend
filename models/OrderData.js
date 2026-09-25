/**
 * @file OrderData.js
 * @description Mongoose schema for aggregated order data / sales reporting metrics.
 * Stores summary details such as order item label, quantity sold, and revenue amount.
 */

const mongoose = require("mongoose");

/**
 * OrderData Schema
 * @typedef {Object} OrderData
 * @property {string} order - Name or descriptor of the ordered item/category.
 * @property {number} quantity - Quantity of items ordered.
 * @property {number} amount - Total financial value/revenue for this order metric.
 */
const orderDataSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
    },
    order: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    timestamp: { type: String } // Pre-formatted client-side timestamp string
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrderData", orderDataSchema);

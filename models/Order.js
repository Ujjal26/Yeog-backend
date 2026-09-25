/**
 * @file Order.js
 * @description Mongoose schema for customer active food/beverage orders.
 * Captures table number, ordered items, total pricing, status lifecycle, and client timestamp.
 */

const mongoose = require('mongoose');

/**
 * Order Schema
 * @typedef {Object} OrderItem
 * @property {string} id - Unique identifier for the menu item.
 * @property {string} name - Name of the menu item.
 * @property {number} price - Unit price of the ordered item.
 * @property {number} qty - Quantity ordered.
 *
 * @typedef {Object} Order
 * @property {string} id - Custom frontend-generated unique order ID.
 * @property {number} tableNumber - Table number placing the order.
 * @property {OrderItem[]} items - List of ordered menu items.
 * @property {number} total - Calculated total monetary amount of the order.
 * @property {'Received'|'Served'} status - Current fulfillment state of the order.
 * @property {string} [timestamp] - Formatted time string sent from frontend client.
 * @property {Date} createdAt - Mongoose timestamp for record creation.
 * @property {Date} updatedAt - Mongoose timestamp for record modification.
 */
const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // Unique frontend-generated order ID
    tableNumber: { type: Number, required: true, index: true },
    items: [
      {
        id: String,
        name: String,
        description: String,
        price: Number,
        qty: Number,
        isDone: { type: Boolean, default: false },
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Received', 'Served'],
      default: 'Received',
      index: true,
    },
    timestamp: { type: String }, // Pre-formatted client-side timestamp string
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);


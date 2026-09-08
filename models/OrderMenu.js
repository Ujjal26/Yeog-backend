/**
 * @file OrderMenu.js
 * @description Mongoose schema for cafe menu catalog items.
 * Maps menu item details including title, description, price, formatted category, image URL, and stock availability.
 */

const mongoose = require('mongoose');

/**
 * OrderMenu Schema
 * @typedef {Object} OrderMenu
 * @property {string} name - Display name of the menu item (trimmed).
 * @property {string} description - Detailed description of the dish or drink.
 * @property {number} price - Cost of the item in local currency (must be non-negative).
 * @property {string} category - Title-cased category (e.g., 'Beverages', 'Main Course').
 * @property {string} image - Cloudinary or hosted image URL for the item avatar/photo.
 * @property {boolean} isAvailable - Stock toggle indicator (defaults to true).
 * @property {Date} createdAt - Mongoose timestamp for item creation.
 * @property {Date} updatedAt - Mongoose timestamp for item modification.
 */
const orderMenuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Binds schema to the 'orderMenu' MongoDB collection explicitly
module.exports = mongoose.model('OrderMenu', orderMenuSchema, 'orderMenu');


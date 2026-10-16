/**
 * @file Combo.js
 * @description Mongoose schema for combo/deal bundles composed of existing OrderMenu items.
 * Combos reference one or more menu items by ObjectId, store a discounted comboPrice,
 * and derive savings, original price, and veg/non-veg status at query time via population.
 */

const mongoose = require('mongoose');

/**
 * Combo Schema
 * @typedef {Object} ComboItem
 * @property {mongoose.Types.ObjectId} item - Reference to an OrderMenu document.
 * @property {number} quantity - How many of this item are included in the combo.
 *
 * @typedef {Object} Combo
 * @property {string} name - Display name for the combo (e.g. "Burger & Shake Duo").
 * @property {string} description - Short marketing description of the combo offer.
 * @property {string} [image] - Optional Cloudinary URL. If not provided, defaults to the first item's image.
 * @property {ComboItem[]} items - Array of menu item refs with quantities.
 * @property {number} comboPrice - The discounted total price charged to the customer.
 * @property {boolean} isAvailable - Manual admin toggle. Also driven dynamically by item availability.
 * @property {Date} createdAt - Mongoose auto-timestamp.
 * @property {Date} updatedAt - Mongoose auto-timestamp.
 */
const comboSchema = new mongoose.Schema(
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
    // Optional: if null, the controller will fall back to the first item's image
    image: {
      type: String,
      default: null,
    },
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'OrderMenu',
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    comboPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Combo', comboSchema, 'combos');

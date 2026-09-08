/**
 * @file orderController.js
 * @description Controller responsible for retrieving active customer orders and aggregated sales/analytics data.
 */

const Order = require('../models/Order');
const OrderData = require('../models/OrderData');

/**
 * Fetches all active customer orders sorted chronologically by creation time.
 * Used by admin dashboards to monitor live table tickets.
 * 
 * @async
 * @function getAllOrders
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response returning array of active Order documents.
 * @returns {Promise<void>}
 */
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: 1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error while fetching orders' });
  }
};

/**
 * Fetches aggregated order metrics and analytical data records.
 * 
 * @async
 * @function getOrderData
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response returning order analytics array.
 * @returns {Promise<void>}
 */
exports.getOrderData = async (req, res) => {
  try {
    const orderData = await OrderData.find().sort({ createdAt: -1 });
    res.json(orderData);
  } catch (err) {
    console.error('Error fetching order data:', err);
    res.status(500).json({ message: 'Server error while fetching order data' });
  }
};



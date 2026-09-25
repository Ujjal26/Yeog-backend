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

/**
 * Edits an item within an existing order.
 * Supports reducing item quantity or cancelling (removing) an item entirely.
 * Also updates the OrderData analytics collection to keep sales data accurate.
 *
 * @async
 * @function editOrderItem
 * @param {import('express').Request} req - Express request with orderId param and body: { itemId, newQty }
 *   - itemId: The ID of the item to edit within the order.
 *   - newQty: The new quantity (0 = remove the item entirely).
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.editOrderItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemId, itemName, newQty } = req.body;

    if ((!itemId && !itemName) || newQty === undefined || newQty === null) {
      return res.status(400).json({ message: 'itemId (or itemName) and newQty are required' });
    }

    const parsedQty = parseInt(newQty, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      return res.status(400).json({ message: 'newQty must be a non-negative integer' });
    }

    const order = await Order.findOne({ id: orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Find the target item in the order by _id, schema id, or name
    const itemIndex = order.items.findIndex((item) => {
      if (itemId) {
        return item._id?.toString() === itemId || item.id === itemId;
      }
      // Fallback: match by item name (customers don't always send an id)
      return item.name === itemName;
    });
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in order' });
    }

    const targetItem = order.items[itemIndex];
    const oldQty = targetItem.qty;
    const qtyDiff = oldQty - parsedQty; // How many units were removed

    if (qtyDiff <= 0 && parsedQty !== 0) {
      return res.status(400).json({ message: 'New quantity must be less than current quantity' });
    }

    // Update OrderData analytics: subtract the removed quantity and amount
    if (qtyDiff > 0) {
      const itemName = targetItem.name || targetItem.id;
      const orderDataDoc = await OrderData.findOne({ order: itemName });
      if (orderDataDoc) {
        orderDataDoc.quantity = Math.max(0, orderDataDoc.quantity - qtyDiff);
        orderDataDoc.amount = Math.max(0, orderDataDoc.amount - (targetItem.price * qtyDiff));
        if (orderDataDoc.quantity === 0) {
          await OrderData.deleteOne({ _id: orderDataDoc._id });
        } else {
          await orderDataDoc.save();
        }
      }
    }

    if (parsedQty === 0) {
      // Remove the item entirely
      order.items.splice(itemIndex, 1);
    } else {
      // Reduce quantity
      order.items[itemIndex].qty = parsedQty;
    }

    // If no items left, delete the entire order
    if (order.items.length === 0) {
      await Order.deleteOne({ id: orderId });
      return res.json({ message: 'Order deleted (no items remaining)', order: null, deleted: true });
    }

    // Recalculate total
    order.total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    await order.save();

    res.json({ message: 'Order item updated successfully', order, deleted: false });
  } catch (err) {
    console.error('Error editing order item:', err);
    res.status(500).json({ message: 'Server error while editing order item' });
  }
};



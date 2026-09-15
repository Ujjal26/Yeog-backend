/**
 * @file menuController.js
 * @description Controller responsible for CRUD operations on menu catalog items,
 * category title formatting, item transformation, and stock availability toggles.
 */

const OrderMenu = require('../models/OrderMenu');

/**
 * Formats a category string to Title Case (e.g., 'cold drinks' -> 'Cold Drinks').
 * 
 * @function formatCategory
 * @param {string} categoryStr - Raw category string input.
 * @returns {string} Title-cased category string.
 */
const formatCategory = (categoryStr) => {
  if (!categoryStr) return categoryStr;
  return categoryStr
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Fetches all menu items sorted by creation date descending.
 * Maps MongoDB `_id` to a string `id` field for seamless frontend consumption.
 * 
 * @async
 * @function getAllItems
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response containing menu item array.
 * @returns {Promise<void>}
 */
exports.getAllItems = async (req, res) => {
  try {
    const items = await OrderMenu.find().sort({ createdAt: -1 });
    // Transform _id to id so frontend can seamlessly work with it
    const transformedItems = items.map(item => ({
      ...item.toObject(),
      id: item._id.toString(),
    }));
    res.json(transformedItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: 'Server error while fetching menu items' });
  }
};

/**
 * Adds a new item to the menu catalog.
 * Validates mandatory fields and formats the category string before saving.
 * 
 * @async
 * @function addItem
 * @param {import('express').Request} req - Express request body with item properties.
 * @param {import('express').Response} res - Express response with created item object.
 * @returns {Promise<void>}
 */
exports.addItem = async (req, res) => {
  try {
    const { name, price, description, category, image } = req.body;
    
    if (!name || !price || !description || !category || !image) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newItem = new OrderMenu({
      name,
      price: Number(price),
      description,
      category: formatCategory(category),
      image,
    });

    await newItem.save();
    
    const transformedItem = {
      ...newItem.toObject(),
      id: newItem._id.toString(),
    };
    
    res.status(201).json({ message: 'Item added successfully', item: transformedItem });

    const io = req.app.get('io');
    if (io) io.emit('menu_updated');
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ message: 'Server error while adding menu item' });
  }
};

/**
 * Updates an existing menu item by ID.
 * 
 * @async
 * @function updateItem
 * @param {import('express').Request} req - Express request containing item ID param and fields in body.
 * @param {import('express').Response} res - Express response returning updated item details.
 * @returns {Promise<void>}
 */
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, category, image } = req.body;

    const item = await OrderMenu.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    if (name) item.name = name;
    if (price) item.price = Number(price);
    if (description) item.description = description;
    if (category) item.category = formatCategory(category);
    if (image) item.image = image;

    await item.save();
    
    const transformedItem = {
      ...item.toObject(),
      id: item._id.toString(),
    };

    res.json({ message: 'Item updated successfully', item: transformedItem });

    const io = req.app.get('io');
    if (io) io.emit('menu_updated');
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ message: 'Server error while updating menu item' });
  }
};

/**
 * Deletes a menu item by ID.
 * 
 * @async
 * @function deleteItem
 * @param {import('express').Request} req - Express request with item ID in params.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await OrderMenu.findByIdAndDelete(id);
    
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({ message: 'Item deleted successfully' });

    const io = req.app.get('io');
    if (io) io.emit('menu_updated');
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: 'Server error while deleting menu item' });
  }
};

/**
 * Toggles the availability status (isAvailable) of a menu item.
 * 
 * @async
 * @function toggleAvailability
 * @param {import('express').Request} req - Express request with item ID in params.
 * @param {import('express').Response} res - Express response returning updated availability state.
 * @returns {Promise<void>}
 */
exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await OrderMenu.findById(id);
    
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    const transformedItem = {
      ...item.toObject(),
      id: item._id.toString(),
    };

    res.json({ message: 'Item availability toggled successfully', item: transformedItem });

    const io = req.app.get('io');
    if (io) io.emit('menu_updated');
  } catch (error) {
    console.error('Error toggling menu item availability:', error);
    res.status(500).json({ message: 'Server error while toggling availability' });
  }
};


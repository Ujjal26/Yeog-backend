const OrderMenu = require('../models/OrderMenu');

const formatCategory = (categoryStr) => {
  if (!categoryStr) return categoryStr;
  return categoryStr
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Get all items
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

// Add a new item
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
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ message: 'Server error while adding menu item' });
  }
};

// Update an item
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
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ message: 'Server error while updating menu item' });
  }
};

// Delete an item
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await OrderMenu.findByIdAndDelete(id);
    
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: 'Server error while deleting menu item' });
  }
};

// Toggle item availability
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
  } catch (error) {
    console.error('Error toggling menu item availability:', error);
    res.status(500).json({ message: 'Server error while toggling availability' });
  }
};

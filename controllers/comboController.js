/**
 * @file comboController.js
 * @description Controller for CRUD operations on combo/deal bundles.
 * Populates linked OrderMenu items, derives originalPrice, savings, isVeg,
 * and dynamic availability from item availability state.
 * Gracefully handles deleted item refs (null-populated items are filtered out).
 */

const Combo = require('../models/Combo');

/**
 * Derives computed fields for a populated combo document and returns a plain object
 * ready for API consumption.
 *
 * Handles the "deleted item" edge case: if any referenced OrderMenu item was
 * deleted from the DB, its populated value will be null. These are filtered out
 * before computing prices so stale refs don't cause crashes.
 *
 * @param {Object} combo - Populated Mongoose Combo document (combo.toObject()).
 * @returns {Object} Enriched combo object with id, originalPrice, savings, isVeg, dynamicAvailability.
 */
function deriveComboFields(combo) {
  // Filter out any combo items whose referenced OrderMenu doc was deleted (null ref)
  const validItems = (combo.items || []).filter((ci) => ci.item != null);

  // Compute original price = sum of (item.price × quantity) for valid items only
  const originalPrice = validItems.reduce(
    (sum, ci) => sum + (ci.item.price || 0) * (ci.quantity || 1),
    0
  );

  const savings = Math.max(0, originalPrice - combo.comboPrice);

  // Combo is veg only if ALL constituent items are veg
  const isVeg =
    validItems.length > 0 && validItems.every((ci) => ci.item.isVeg === true);

  // Dynamic availability: false if the admin toggled it off OR if any item is unavailable
  const dynamicAvailability =
    combo.isAvailable &&
    validItems.length > 0 &&
    validItems.every((ci) => ci.item.isAvailable !== false);

  // Image fallback: use first valid item's image if no custom image is set
  const image =
    combo.image || (validItems[0]?.item?.image ?? null);

  return {
    ...combo,
    id: combo._id.toString(),
    image,
    items: validItems,
    originalPrice,
    savings,
    isVeg,
    dynamicAvailability,
  };
}

/**
 * Fetches all combos, populates linked menu items, derives computed fields,
 * and returns the enriched list sorted by creation date descending.
 * Only combos that are dynamically available are returned to the public endpoint
 * (admin should use a separate flag or a different query if they need all combos).
 *
 * @async
 * @function getAllCombos
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAllCombos = async (req, res) => {
  try {
    const combos = await Combo.find()
      .populate('items.item')
      .sort({ createdAt: -1 });

    const enriched = combos.map((combo) => deriveComboFields(combo.toObject()));

    // Query param: ?all=true returns all combos (for admin use), else only available
    const showAll = req.query.all === 'true';
    const result = showAll
      ? enriched
      : enriched.filter((c) => c.dynamicAvailability);

    res.json(result);
  } catch (error) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ message: 'Server error while fetching combos' });
  }
};

/**
 * Creates a new combo.
 * Image is optional — if not provided, the first item's image is used at serve time.
 *
 * @async
 * @function addCombo
 * @param {import('express').Request} req - Body: { name, description, image?, items: [{item, quantity}], comboPrice }
 * @param {import('express').Response} res
 */
exports.addCombo = async (req, res) => {
  try {
    const { name, description, image, items, comboPrice } = req.body;

    if (!name || !description || !items || !Array.isArray(items) || items.length === 0 || comboPrice == null) {
      return res.status(400).json({
        message: 'name, description, items (non-empty array), and comboPrice are required',
      });
    }

    const newCombo = new Combo({
      name: name.trim(),
      description,
      image: image || null,
      items,
      comboPrice: Number(comboPrice),
    });

    await newCombo.save();

    // Populate and enrich for the response
    const populated = await Combo.findById(newCombo._id).populate('items.item');
    const enriched = deriveComboFields(populated.toObject());

    res.status(201).json({ message: 'Combo created successfully', combo: enriched });

    // Notify all connected clients (admin panels, customer views) of the change
    const io = req.app.get('io');
    if (io) io.emit('combo_updated');
  } catch (error) {
    console.error('Error adding combo:', error);
    res.status(500).json({ message: 'Server error while adding combo' });
  }
};

/**
 * Updates an existing combo by ID.
 * Only provided fields are updated (partial update support).
 *
 * @async
 * @function updateCombo
 * @param {import('express').Request} req - Params: id. Body: partial combo fields.
 * @param {import('express').Response} res
 */
exports.updateCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, items, comboPrice, isAvailable } = req.body;

    const combo = await Combo.findById(id);
    if (!combo) {
      return res.status(404).json({ message: 'Combo not found' });
    }

    if (name) combo.name = name.trim();
    if (description) combo.description = description;
    // null explicitly clears custom image (reverts to item fallback); undefined = no change
    if (image !== undefined) combo.image = image || null;
    if (items && Array.isArray(items) && items.length > 0) combo.items = items;
    if (comboPrice != null) combo.comboPrice = Number(comboPrice);
    if (isAvailable !== undefined) combo.isAvailable = Boolean(isAvailable);

    await combo.save();

    const populated = await Combo.findById(id).populate('items.item');
    const enriched = deriveComboFields(populated.toObject());

    res.json({ message: 'Combo updated successfully', combo: enriched });

    const io = req.app.get('io');
    if (io) io.emit('combo_updated');
  } catch (error) {
    console.error('Error updating combo:', error);
    res.status(500).json({ message: 'Server error while updating combo' });
  }
};

/**
 * Deletes a combo by ID.
 *
 * @async
 * @function deleteCombo
 * @param {import('express').Request} req - Params: id.
 * @param {import('express').Response} res
 */
exports.deleteCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const combo = await Combo.findByIdAndDelete(id);

    if (!combo) {
      return res.status(404).json({ message: 'Combo not found' });
    }

    res.json({ message: 'Combo deleted successfully' });

    const io = req.app.get('io');
    if (io) io.emit('combo_updated');
  } catch (error) {
    console.error('Error deleting combo:', error);
    res.status(500).json({ message: 'Server error while deleting combo' });
  }
};

/**
 * Toggles the manual isAvailable flag on a combo.
 *
 * @async
 * @function toggleComboAvailability
 * @param {import('express').Request} req - Params: id.
 * @param {import('express').Response} res
 */
exports.toggleComboAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const combo = await Combo.findById(id);

    if (!combo) {
      return res.status(404).json({ message: 'Combo not found' });
    }

    combo.isAvailable = !combo.isAvailable;
    await combo.save();

    const populated = await Combo.findById(id).populate('items.item');
    const enriched = deriveComboFields(populated.toObject());

    res.json({ message: 'Combo availability toggled successfully', combo: enriched });

    const io = req.app.get('io');
    if (io) io.emit('combo_updated');
  } catch (error) {
    console.error('Error toggling combo availability:', error);
    res.status(500).json({ message: 'Server error while toggling combo availability' });
  }
};

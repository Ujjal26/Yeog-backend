const CheckIn = require('../models/CheckIn');

// POST /api/checkins
exports.checkIn = async (req, res) => {
  try {
    const { tableNumber, guestCount } = req.body;
    if (!tableNumber) return res.status(400).json({ error: 'tableNumber is required' });

    const guests = Math.max(1, parseInt(guestCount) || 1);

    // To prevent overlaps (edge case), mark any existing active check-in for this table as completed
    await CheckIn.updateMany(
      { tableNumber, status: 'active' },
      { $set: { status: 'completed', checkOutTime: new Date() } }
    );

    const newCheckIn = new CheckIn({
      tableNumber,
      guestCount: guests,
      status: 'active'
    });

    await newCheckIn.save();
    res.status(201).json(newCheckIn);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/checkins/checkout
exports.checkOut = async (req, res) => {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber) return res.status(400).json({ error: 'tableNumber is required' });

    const updated = await CheckIn.findOneAndUpdate(
      { tableNumber, status: 'active' },
      { $set: { status: 'completed', checkOutTime: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'No active check-in found for this table' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/checkins/count
exports.getActiveCount = async (req, res) => {
  try {
    const result = await CheckIn.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, totalCustomers: { $sum: '$guestCount' } } }
    ]);

    const count = result.length > 0 ? result[0].totalCustomers : 0;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/checkins/all
exports.getAllCheckIns = async (req, res) => {
  try {
    const checkIns = await CheckIn.find({});
    res.json(checkIns);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/checkins/auto-cleanup (End of Day Fix)
exports.autoCheckOutStale = async (req, res) => {
  try {
    // The cafe closes at 10:30 PM. This should be triggered at 10:45 PM.
    // At this time, ANY active check-in is guaranteed to be stale/ghost.
    const result = await CheckIn.updateMany(
      { status: 'active' },
      { $set: { status: 'completed', checkOutTime: new Date() } }
    );

    if (res) {
      res.json({ message: `End of day cleanup: Closed ${result.modifiedCount} check-ins` });
    } else {
      console.log(`[EOD Cleanup] Closed ${result.modifiedCount} check-ins.`);
    }
  } catch (error) {
    if (res) res.status(500).json({ error: 'Server error' });
    else console.error('[EOD Cleanup] Error:', error);
  }
};

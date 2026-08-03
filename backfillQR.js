require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Table = require('./models/Table');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const tables = await Table.find({ qrToken: { $exists: false } });
    console.log(`Found ${tables.length} tables without qrToken`);
    
    for (const t of tables) {
      t.qrToken = crypto.randomBytes(8).toString('hex');
      await t.save();
      console.log(`Updated Table ${t.number}`);
    }
    
    console.log('Done backfilling.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

/**
 * @file upload.js
 * @description Upload router using Multer memory storage and Cloudinary v2 SDK.
 * Handles photo uploads for menu items and returns the hosted image secure URL.
 */

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Initialize Multer to buffer files in memory rather than writing to disk
const upload = multer({ storage: multer.memoryStorage() });

// Configure Cloudinary credentials from environment variables
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

/**
 * @route   POST /upload
 * @desc    Upload an image file to Cloudinary media library ('website-uploads' folder)
 * @access  Private (Protected by authMiddleware in index.js)
 */
router.post('/', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Stream in-memory file buffer directly to Cloudinary upload stream
  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: 'website-uploads' },
    (error, result) => {
      if (error) return res.status(500).json({ error: error.message });
      // Return hosted secure Cloudinary CDN URL
      res.json({ imageUrl: result.secure_url });
    }
  );
  
  uploadStream.end(req.file.buffer);
});

module.exports = router;


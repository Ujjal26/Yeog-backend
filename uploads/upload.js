const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

router.post('/', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: 'website-uploads' },
    (error, result) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ imageUrl: result.secure_url });
    }
  );
  uploadStream.end(req.file.buffer);
});

module.exports = router;

// ============================================================
// UPLOAD ROUTES
// POST /api/upload/image — upload a single image to Cloudinary
// ============================================================
const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/upload/image
 * Requires authentication. Accepts a single file field named "image".
 * Returns the Cloudinary URL.
 */
router.post('/image', authenticate, (req, res) => {
  // Check Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    return res.status(503).json({
      success: false,
      message: 'Image upload is not configured. Please contact the administrator.'
    });
  }

  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        url: req.file.path,
        public_id: req.file.filename,
        width: req.file.width,
        height: req.file.height,
      }
    });
  });
});

module.exports = router;

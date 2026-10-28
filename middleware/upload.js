const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadBuffer } = require('../config/cloudinary');

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage — keep files in memory to stream to Cloudinary or write locally
const storage = multer.memoryStorage();

// Supported MIME types for images and videos
const allowedMimeTypes = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'video/x-matroska',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file format (${file.mimetype}). Supported formats: JPEG, PNG, WEBP, GIF, MP4, MOV, and WEBM.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max limit to accommodate high-res smartphone videos
  fileFilter,
});

/**
 * Helper to process an uploaded file and store in Cloudinary (with automatic local fallback)
 */
const processUploadedFile = async (file, folder = 'general') => {
  if (!file) return null;
  return await uploadBuffer(file.buffer, folder, file.mimetype, file.originalname);
};

module.exports = { upload, processUploadedFile, allowedMimeTypes };

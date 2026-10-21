const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadBuffer, isConfigured } = require('../config/cloudinary');

// Ensure local uploads directory exists for fallback
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage — keep files in memory so we can stream them to Cloudinary
const storage = multer.memoryStorage();

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP and MP4 are supported.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter,
});

/**
 * Helper to upload buffer to Cloudinary via a stream, or save locally
 * if Cloudinary is not configured.
 *
 * Uses stream upload (uploadBuffer) rather than base64 encoding to avoid
 * the ~33% memory overhead and potential timeout issues on constrained servers.
 */
const processUploadedFile = async (file, folder = 'general') => {
  if (!file) return null;

  if (isConfigured) {
    // Stream the raw buffer to Cloudinary — memory-efficient and faster
    return await uploadBuffer(file.buffer, folder, file.mimetype);
  } else {
    // Local storage fallback
    const targetFolder = path.join(uploadDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const fullPath = path.join(targetFolder, filename);
    fs.writeFileSync(fullPath, file.buffer);

    return {
      url: `/uploads/${folder}/${filename}`,
      publicId: `local_${filename}`,
      format: path.extname(file.originalname).replace('.', ''),
      resourceType: file.mimetype.startsWith('video') ? 'video' : 'image',
    };
  }
};

module.exports = { upload, processUploadedFile };

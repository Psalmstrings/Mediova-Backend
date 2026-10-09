const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadMedia, isConfigured } = require('../config/cloudinary');

// Ensure local uploads directory exists for fallback
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
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
 * Helper to upload buffer to Cloudinary or save locally if Cloudinary is not configured
 */
const processUploadedFile = async (file, folder = 'general') => {
  if (!file) return null;

  if (isConfigured) {
    // Cloudinary upload via base64 data URI
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    return await uploadMedia(dataURI, folder);
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

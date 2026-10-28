const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const localUploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

/**
 * Saves a Buffer locally as a reliable fallback when Cloudinary is unavailable or lacks create permissions.
 */
const saveBufferLocally = (buffer, folder = 'general', mimeType = 'image/jpeg', originalname = 'file') => {
  const targetFolder = path.join(localUploadDir, folder);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const ext = path.extname(originalname) || (mimeType.startsWith('video') ? '.mp4' : '.jpg');
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const fullPath = path.join(targetFolder, filename);

  fs.writeFileSync(fullPath, buffer);

  return {
    url: `/uploads/${folder}/${filename}`,
    publicId: `local_${filename}`,
    format: ext.replace('.', ''),
    resourceType: mimeType.startsWith('video') ? 'video' : 'image',
    isLocalFallback: true,
  };
};

/**
 * Uploads a Buffer to Cloudinary via a stream with automatic local fallback.
 * More memory-efficient than base64 encoding and resilient against permission or network errors.
 *
 * @param {Buffer} buffer       - File buffer from multer memoryStorage
 * @param {string} folder       - Cloudinary sub-folder under mediova/
 * @param {string} mimeType     - MIME type of the file
 * @param {string} originalname - Original file name for fallback extension
 * @returns {Promise<{url, publicId, format, resourceType}>}
 */
const uploadBuffer = (buffer, folder = 'mediova_uploads', mimeType = 'image/jpeg', originalname = 'file') => {
  return new Promise((resolve) => {
    const resourceType = mimeType.startsWith('video') ? 'video' : 'image';

    if (!isConfigured) {
      console.warn('[Cloudinary Notice] Cloudinary is not configured. Storing upload locally.');
      return resolve(saveBufferLocally(buffer, folder, mimeType, originalname));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `mediova/${folder}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          console.warn(`[Cloudinary Warning] Stream upload failed (${error.message}). Falling back to local storage.`);
          const localResult = saveBufferLocally(buffer, folder, mimeType, originalname);
          return resolve(localResult);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
        });
      }
    );

    // Pipe the buffer into the upload stream
    try {
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    } catch (streamErr) {
      console.error('[Cloudinary Stream Exception]', streamErr);
      resolve(saveBufferLocally(buffer, folder, mimeType, originalname));
    }
  });
};

/**
 * Uploads a local file path or base64 data URI to Cloudinary.
 * Kept for backward compatibility.
 */
const uploadMedia = async (filePathOrBase64, folder = 'mediova_uploads') => {
  if (isConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePathOrBase64, {
        folder: `mediova/${folder}`,
        resource_type: 'auto',
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (err) {
      console.warn('[Cloudinary Warning] Upload failed, returning mock/fallback URL:', err.message);
    }
  }

  return {
    url: typeof filePathOrBase64 === 'string' && filePathOrBase64.startsWith('http')
      ? filePathOrBase64
      : `/uploads/${folder}/${Date.now()}-mock.jpg`,
    publicId: `mock_${Date.now()}`,
    format: 'jpg',
    resourceType: 'image',
  };
};

module.exports = {
  cloudinary,
  isConfigured,
  uploadMedia,
  uploadBuffer,
  saveBufferLocally,
};

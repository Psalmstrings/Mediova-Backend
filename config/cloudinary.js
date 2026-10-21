const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

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

/**
 * Uploads a Buffer directly to Cloudinary via a stream.
 * More memory-efficient than base64 encoding — avoids ~33% buffer bloat
 * and prevents silent timeouts on constrained environments (e.g. Render free tier).
 *
 * @param {Buffer} buffer   - File buffer from multer memoryStorage
 * @param {string} folder   - Cloudinary sub-folder under doptv/
 * @param {string} mimeType - MIME type of the file (used to detect resource_type)
 * @returns {Promise<{url, publicId, format, resourceType}>}
 */
const uploadBuffer = (buffer, folder = 'doptv_uploads', mimeType = 'image/jpeg') => {
  return new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith('video') ? 'video' : 'image';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `doptv/${folder}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Stream Upload Error]', error);
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
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
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Uploads a local file path or base64 data URI to Cloudinary.
 * Kept for backward compatibility (used by vendor campaign media upload).
 */
const uploadMedia = async (filePathOrBase64, folder = 'doptv_uploads') => {
  if (isConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePathOrBase64, {
        folder: `doptv/${folder}`,
        resource_type: 'auto',
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (err) {
      console.error('[Cloudinary Upload Error]', err);
      throw new Error(`Cloudinary upload failed: ${err.message}`);
    }
  }

  // Fallback when Cloudinary credentials are not configured yet
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
};

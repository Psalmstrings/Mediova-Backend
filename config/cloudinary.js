const cloudinary = require('cloudinary').v2;

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
 * Uploads a local file path or buffer to Cloudinary (or returns fallback URL)
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
};

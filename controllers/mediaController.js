const cloudinary = require('../config/cloudinary');

exports.getUploadSignature = async (req, res) => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        error: 'Cloudinary is not configured on the server.'
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'otax/posts';

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder
      },
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      signature
    });
  } catch (error) {
    console.error('UPLOAD SIGNATURE ERROR:', error);

    return res.status(500).json({
      error: 'Unable to create upload signature.'
    });
  }
};

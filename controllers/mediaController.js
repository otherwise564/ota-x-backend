const cloudinary = require('../config/cloudinary');

exports.getUploadSignature = async (req, res) => {
  try {
    const {
      CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET
    } = process.env;

    if (
      !CLOUDINARY_CLOUD_NAME ||
      !CLOUDINARY_API_KEY ||
      !CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        error: 'Cloudinary is not configured on the server.'
      });
    }

    const mediaType = String(req.query.mediaType || '').toUpperCase();

    if (
      mediaType &&
      !['IMAGE', 'VIDEO'].includes(mediaType)
    ) {
      return res.status(400).json({
        error: 'mediaType must be IMAGE or VIDEO.'
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'otax/posts';

    const type = 'upload';

    const paramsToSign = {
      timestamp,
      folder
    };

    if (mediaType) {
      paramsToSign.type = type;
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      timestamp,
      folder,
      signature,
      ...(mediaType ? {
        mediaType,
        resourceType: mediaType.toLowerCase(),
        type
      } : {})
    });
  } catch (error) {
    console.error('UPLOAD SIGNATURE ERROR:', error.message);

    return res.status(500).json({
      error: 'Unable to create upload signature.'
    });
  }
};

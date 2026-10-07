const multer = require('multer');

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',

  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',

  // Audio / voice comments
  'audio/mpeg',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/x-m4a'
];

const upload = multer({
  storage,

  limits: {
    fileSize: 100 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Unsupported media format.'
        )
      );
    }

    cb(null, true);
  }
});

module.exports = upload;

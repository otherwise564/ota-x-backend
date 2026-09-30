const multer = require('multer');

const storage = multer.memoryStorage();

const allowedAudioTypes = [
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
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    if (!allowedAudioTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Invalid audio format. Supported formats are MP3, MP4/M4A, WebM, OGG, WAV and AAC.'
        )
      );
    }

    cb(null, true);
  }
});

module.exports = upload;

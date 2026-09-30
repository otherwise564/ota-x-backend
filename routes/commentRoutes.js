const express = require('express');

const router = express.Router();

const {
  createComment,
  getPostComments
} = require('../controllers/commentController');

const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');


// =====================================================
// MULTER ERROR HANDLER
// =====================================================

const voiceUpload = (req, res, next) => {
  upload.single('voice')(req, res, (error) => {

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    next();
  });
};


// =====================================================
// GET COMMENTS
// =====================================================

router.get(
  '/:postId',
  getPostComments
);


// =====================================================
// CREATE TEXT OR VOICE COMMENT
// =====================================================

router.post(
  '/:postId',
  authMiddleware,
  voiceUpload,
  createComment
);


module.exports = router;

const express = require('express');
const router = express.Router();

const {
  getUploadSignature
} = require('../controllers/mediaController');

const authMiddleware = require('../middleware/auth');

router.get(
  '/signature',
  authMiddleware,
  getUploadSignature
);

module.exports = router;

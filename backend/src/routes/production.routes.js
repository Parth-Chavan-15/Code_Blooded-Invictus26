const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const { verifyToken } = require('../middleware/auth');

// All production API routes are secured by JWT
router.post('/create', verifyToken, productionController.producePCB);
router.get('/:id/bom', verifyToken, productionController.getBOMPreview);

module.exports = router;
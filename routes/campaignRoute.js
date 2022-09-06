const express = require('express');
const router = express.Router();
const { createCampaign } = require('../controllers/campaignController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, createCampaign);

module.exports = router;
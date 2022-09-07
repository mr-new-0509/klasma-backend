const express = require('express');
const router = express.Router();
const { createCampaign, getCampaignsByCompanyId, getCampaignById } = require('../controllers/campaignController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, createCampaign);
router.get('/get-campaigns-by-company-id/:id', authMiddleware, getCampaignsByCompanyId);
router.get('/get-campaign-by-id/:id', authMiddleware, getCampaignById);

module.exports = router;
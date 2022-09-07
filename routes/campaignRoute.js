const express = require('express');
const router = express.Router();
const { createCampaign, getCampaignsByCompanyId, getCampaignById, updateCampaign } = require('../controllers/campaignController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, createCampaign);
router.get('/get-campaigns-by-company-id/:id', authMiddleware, getCampaignsByCompanyId);
router.get('/get-campaign-by-id/:id', authMiddleware, getCampaignById);
router.put('/update/:id', authMiddleware, updateCampaign);

module.exports = router;
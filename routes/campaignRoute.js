const express = require('express');
const router = express.Router();
const { createCampaign, getCampaignsByCompanyId } = require('../controllers/campaignController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, createCampaign);
router.get('/get-campaigns-by-company-id/:id', authMiddleware, getCampaignsByCompanyId);

module.exports = router;
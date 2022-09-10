const express = require('express');
const router = express.Router();
const {
  createCampaign,
  getCampaignsByCompanyId,
  getCampaignById,
  updateCampaign,
  getAllCampaigns
} = require('../controllers/campaignController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, createCampaign);
router.get('/get-campaigns-by-company-id/:id', authMiddleware, getCampaignsByCompanyId);
router.get('/get-campaign-by-id/:id', getCampaignById);
router.put('/update/:id', authMiddleware, updateCampaign);
router.get('/get-all', getAllCampaigns);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
  createCampaign,
  getCampaignsByCompanyId,
  getCampaignById,
  updateCampaign,
  getAllCampaigns,
  invest,
  checkIsInvestmentAvailable,
  updateCampaignStatus,
  createCommentOfCampaign,
  deleteCommentOfCampaign
} = require('../controllers/campaignController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, createCampaign);
router.get('/get-campaigns-by-company-id/:id', authMiddleware, getCampaignsByCompanyId);
router.get('/get-campaign-by-id/:id', getCampaignById);
router.put('/update/:id', authMiddleware, updateCampaign);
router.get('/get-all', getAllCampaigns);
router.post('/invest', authMiddleware, invest);
router.get('/check-is-investment-available/:campaignId', authMiddleware, checkIsInvestmentAvailable);
router.put('/update-campaign-status/:id', updateCampaignStatus);
router.post('/create-comment', authMiddleware, createCommentOfCampaign);
router.delete('/delete-comment/:id', authMiddleware, deleteCommentOfCampaign);

module.exports = router;
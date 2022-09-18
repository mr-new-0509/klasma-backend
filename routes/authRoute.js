const express = require('express');
const router = express.Router();
const {
  signupByEmail,
  signupByGoogle,
  signinByEmail,
  updateUserProfile,
  updateUserPassword,
  resendEmailVerificationLink,
  verifyEmail,
  updateWalletAddress
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/signup-by-email', signupByEmail);
router.post('/signup-by-google', signupByGoogle);
router.post('/signin-by-email', signinByEmail);
router.put('/update-user-profile/:id', authMiddleware, updateUserProfile);
router.put('/update-user-password/:id', authMiddleware, updateUserPassword);
router.get('/resend-email-verification-link/:id', authMiddleware, resendEmailVerificationLink);
router.put('/email-verify/:verificationToken', verifyEmail);
router.put('/update-wallet-address/:id', authMiddleware, updateWalletAddress);

module.exports = router;
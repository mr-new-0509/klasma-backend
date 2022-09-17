const express = require('express');
const router = express.Router();
const {
  signupByEmail,
  signupByGoogle,
  signinByEmail,
  updateUserProfile,
  updateUserPassword
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/signup-by-email', signupByEmail);
router.post('/signup-by-google', signupByGoogle);
router.post('/signin-by-email', signinByEmail);
router.put('/update-user-profile/:id', authMiddleware, updateUserProfile);
router.put('/update-user-password/:id', authMiddleware, updateUserPassword);

module.exports = router;
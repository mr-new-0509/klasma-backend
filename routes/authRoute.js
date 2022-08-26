const express = require('express');
const router = express.Router();
const { signupByEmail, signupByGoogle, signinByEmail } = require('../controllers/authController');

router.post('/signup-by-email', signupByEmail);
router.post('/signup-by-google', signupByGoogle);
router.post('/signin-by-email', signinByEmail);

module.exports = router;
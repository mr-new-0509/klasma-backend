const express = require('express');
const router = express.Router();
const { signupByEmail, signupByGoogle } = require('../controllers/authController');

router.post('/signup-by-email', signupByEmail);
router.post('/signup-by-google', signupByGoogle);

module.exports = router;
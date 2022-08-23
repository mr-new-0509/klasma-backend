const express = require('express');
const router = express.Router();
const { signupByEmail } = require('../controllers/authController');

router.get('/signup-by-email', signupByEmail);

module.exports = router;
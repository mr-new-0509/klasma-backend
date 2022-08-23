const express = require('express');
const router = express.Router();
const { signupByEmail } = require('../controllers/authController');

router.post('/signup-by-email', signupByEmail);

module.exports = router;
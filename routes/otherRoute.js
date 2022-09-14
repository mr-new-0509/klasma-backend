const express = require('express');
const router = express.Router();
const { getServerTimezone } = require('../controllers/otherController');

router.get('/get-server-timezone', getServerTimezone);

module.exports = router;
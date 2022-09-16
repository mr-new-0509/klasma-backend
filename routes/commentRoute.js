const express = require('express');
const router = express.Router();
const { create } = require('../controllers/commentController');

router.post('/create', create);

module.exports = router;
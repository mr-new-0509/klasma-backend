const express = require('express');
const router = express.Router();
const { createPost } = require('../controllers/postController');

router.get('/create', createPost);

module.exports = router;
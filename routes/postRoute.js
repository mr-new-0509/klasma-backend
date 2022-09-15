const express = require('express');
const router = express.Router();
const { createPost, getPostsByUserId } = require('../controllers/postController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, createPost);
router.get('/get-posts-by-user-id/:id', getPostsByUserId);

module.exports = router;
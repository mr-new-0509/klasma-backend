const express = require('express');
const router = express.Router();
const {
  createPost,
  getPostsByUserId,
  getPostById,
  updatePost,
  handlePostFavorites
} = require('../controllers/postController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, createPost);
router.put('/update/:id', authMiddleware, updatePost);
router.get('/get-post-by-id/:id', getPostById);
router.get('/get-posts-by-user-id/:id', getPostsByUserId);
router.post('/handle-post-favorite', authMiddleware, handlePostFavorites);

module.exports = router;
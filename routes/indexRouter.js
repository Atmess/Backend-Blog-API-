const express = require('express');
const router = express.Router();
const controller = require('../controllers/controller')

// 1. Defined as '/'
router.get('/', (req, res) => {
  res.json({ message: "Welcome to the Blog API" });
});

// 2. Defined as '/posts'
router.get('/posts', (req, res) => {
  res.json({ posts: [] });
});

// 3. Defined as '/login'
router.post('/login', controller.login);
router.post('/register',controller.registerpost)
router.post('/post/publish',controller.PublishPost)
router.post('/post/draft',controller.saveDraft)
router.post('/post/:id/publishdraft',controller.PublishDraft)

module.exports = router;
require('dotenv').config()
const express = require('express');
const router = express.Router();
const controller = require('../controllers/controller')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET

const authenticateToken=(req, res, next)=> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).json({ message: "Access denied. Token missing." });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }
    req.user = decodedUser; // Attach user payload ({ id, username }) to request
    next();
  });
}
// 1. Defined as '/'
router.get('/', (req, res) => {
  res.json({ message: "Welcome to the Blog API" });
});



// 3. Defined as '/login'
router.post('/login', controller.login);
router.post('/register',controller.registerpost)

router.use(authenticateToken)

// 2. Defined as '/posts'
router.get('/post/draft', controller.getdraft );
router.get('/post/published',controller.getPublish)
router.get('/post/getAllPublish',controller.getallPublish)
router.post('/post/publish',controller.CreatePost)
router.patch('/post/:id/publishdraft',controller.PublishDraft)
router.delete('/post/:id',controller.deletePost)


module.exports = router;
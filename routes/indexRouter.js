require('dotenv').config()
const express = require('express');
const router = express.Router();
const controller = require('../controllers/controller')
const filecontroller = require('../controllers/filecontroller')
const comentController = require('../controllers/commentController')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET
const multer = require('multer')
const path = require('path');
const commentController = require('../controllers/commentController');
const userController = require("../controllers/Admincontroller")

// Define allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  // Archives & Compressed (RAR, ZIP, 7Z)
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/octet-stream' // Browsers fall back to binary streams
];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar', '.7z'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_MIME_TYPES.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed files: Images, Docs, ZIP, RAR, 7Z.'), false);
    }
  }
});
const FilterFile = (req, res, next) => {
  upload.single("upload")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File size too large! Maximum limit is 50 MB." }); // 👈 Changed to .json()
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` }); // 👈 Changed to .json()
    } else if (err) {
      return res.status(400).json({ message: err.message }); // 👈 Changed to .json()
    }
    next();
  });
}

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
router.get('/posts/:id',controller.SinglePost)
router.get('/post/getAllPublish',controller.getallPublish)

router.use(authenticateToken)

// 2. Defined as '/posts'
router.get('/post/draft', controller.getdraft );
router.get('/post/published',controller.getUserPublish)

router.post('/post/publish',FilterFile, filecontroller.uploadfile, controller.CreatePost)
router.patch('/post/:id/publishdraft',controller.PublishDraft)
router.put('/post/:id',FilterFile,filecontroller.uploadfile,controller.EditPost)
router.delete('/post/:id',controller.deletePost)

//comment section
router.post('/post/:id/comments', comentController.createComment)
router.delete('/comments/:id',commentController.deleteComment)
router.patch('/comments/:id',commentController.editComment)

//User Section
router.patch('/users/profile',FilterFile,filecontroller.uploadfile , controller.UpdateUser)

//Admin section
router.get('/admin/users',userController.getallUser)
router.put('/admin/promote',userController.promoteToAdmin)
router.put('/admin/users/:id/userstatus',userController.changeUserStatus)
router.put('/admin/post/:id/poststatus',userController.changePostStatus)


// File Operations (Clean REST Style)
router.get("/file/:id", filecontroller.fileinfoGet);              // Get file metadata
router.get("/download/:id", filecontroller.downloadFileGet);      // Download file stream
router.get("/user/file", filecontroller.getUserFile)

router.delete("/file/:id", filecontroller.deletefilePost);        // Delete a file (DELETE method handles the 'delete' action)
router.delete("/folder/:id", filecontroller.deletefolderPost);    // Delete a folder

router.patch("/file/:id", filecontroller.editfilename);           // Update file name/details (PATCH for partial updates)
router.patch("/folder/:id", filecontroller.editfoldernamePost);   // Update folder name
router.put("/file/:id/move", filecontroller.moveFilePost);        // Move file (sub-action on a specific file resource)
module.exports = router;
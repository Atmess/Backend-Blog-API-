const { validationResult } = require("express-validator");
const prisma = require("../lib/prisma.js")
const bcrypt = require('bcryptjs')
const jwt =require('jsonwebtoken');
const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Ensure this matches your Render key name
const supabase = createClient(supabaseUrl, supabaseKey);


// Helper: Sanitize Filenames

const login = async (req , res ,next)=>{
    try{
        const {identifier , password} = req.body
       const user = await prisma.user.findFirst({
  where: {
    OR: [
      { email: identifier },
      { username: identifier }
    ]
  }
});
    if(!user){
        return res.status(401).json({message: "Invalid username/email or password."})
    }
    if (user.status === 'BANNED') {
  return res.status(403).json({ message: "Your account has been banned." });
    }
    // 2. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username/email or password." });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role , name:user.name , avatarUrl:user.avatarUrl },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 4. Send token back to React
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name:user.name ,
        avatarUrl:user.avatarUrl
      }
    });

    }catch(error){
        console.error(error)
        next(error)
    }
}

const registerpost = async (req,res,next)=>{
    const error = validationResult(req)
    if(!error.isEmpty()){
        return res.status(400).json({ errors: error.array() });
    }
    try{
        const { email, username, password } = req.body;
        const hashpassw = await bcrypt.hash(password, 10);

      const newUser =  await prisma.user.create({
            data:{
            username,
            email,
            password:hashpassw,
            },
            select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      }
            
        })
        return res.status(201).json({
        message: "User registered successfully!",
        user: newUser,
    });
    }catch(error){
        console.error(error)

        if (error.code === 'P2002') {
      const targetField = error.meta?.target?.[0] || 'Email or Username';
      return res.status(400).json({
        message: `An account with that ${targetField} already exists.`,
      });
    }

        next(error)
    }
}

const CreatePost = async (req,res,next) => {
      try{ 
        const userId = parseInt(req.user.userId)
        const {title , content ,published }= req.body
        const fileData = req.savedFileData; // Whatever your storage middleware populates
      const result = await prisma.$transaction(async (prisma) => {
      // 1. Create the blog post
      const newPost = await prisma.post.create({
        data: {
          title,
          content,
          published: published === 'true' || published === true,
          authorId: userId,
        },
      });

      // 2. Create the file record if a file was uploaded
      let newFile = null;
      if (fileData) {
        newFile = await prisma.file.create({
          data: {
            name: fileData.name,
            size: fileData.size,
            url: fileData.url,
            userId: userId,
            postId: newPost.id,
          },
        });
      }

      return { newPost, newFile };
    });
    console.log(result)
        res.status(200).json({message: 'Draft published successfully!',
          post: result.newPost,
          file: result.newFile,
      })
      }catch(error){
        console.error(error)
        next(error)
      }
}

const UpdateUser = async (req, res, next) => {
    try {
        const userId = parseInt(req.user.userId, 10);
        const { name, username } = req.body;
        const fileData = req.savedFileData; // Whatever your storage middleware populates
      
        
        // 1. Fetch current user to get existing avatarUrl if no new file is uploaded
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        let newAvatarUrl = currentUser.avatarUrl;

        // 2. If a new file was uploaded, save or extract its URL
        if (fileData) {
            // Option A: If your storage middleware already gives you a public URL string:
            newAvatarUrl = fileData.url;
          
            // Option B: If you want to log it to your `File` table in Prisma:
             await prisma.file.create({
            data: {
            name: fileData.name,
            size: fileData.size,
            url: fileData.url,
            user:{connect:{id:userId}}
          },
        });
        }

        // 3. Update the user record
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: name !== undefined ? name : currentUser.name,
                username: username !== undefined ? username : currentUser.username,
                avatarUrl: newAvatarUrl,
            },
        });

        // 4. Send back the updated user (exclude password for safety!)
        const { password, ...userWithoutPassword } = updatedUser;
        res.status(200).json(userWithoutPassword);

    } catch (error) {
        console.error('Error updating user:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Username is already taken.' });
        }
        next(error);
    }
};
const PublishDraft = async (req,res,next) => {
  const userId = parseInt(req.user.userId,10)
  const postId = parseInt(req.params.id ,10)
  const { title, content, publishTime } = req.body || {};
  const existingPost = await prisma.post.findUnique({
    where:{id:postId}
  })
  if(!existingPost){
    return res.status(404).json({message:"Draft Not found"})
  }
  if(existingPost.authorId !== userId){
      return res.status(403).json({ message: 'Forbidden: You do not own this post.' });
    }

  if(existingPost.status === "FLAGGED"){
    return res.status(403).json({message: "This post has been flagged by administrators and cannot be published. Please ask ADMIN to remove Flagged first"})
  }
  try{
  const shcedule = Boolean(publishTime)
  const publishnow = !shcedule
  const publishDate = shcedule? new Date(publishTime):new Date() 
  const updatedPost = await prisma.post.update({
    where:{id:postId},
    data:{
    ...(title && { title }),
        ...(content && { content }),
        published:publishnow,
        publishedAt: publishDate,
    }
  })
  res.status(200).json({message: 'Draft published successfully!',
      post: updatedPost,})
  }catch(error){
    console.error(error)
    next(error)
  }
}

const getdraft = async (req,res,next) => {
  try{    
      const draft = await prisma.post.findMany({
        where:{authorId:req.user.userId, 
           published:false,
          OR: [
          { publishedAt: null },
          {
            publishedAt: {
              gt: new Date(), // Future scheduled posts belong in Drafts
            },
          },
        ], },
        orderBy:{updatedAt:'desc'},
        include:{
          files:true
        }
      })
      res.status(200).json(draft)
    }catch(error){
      console.error(error)
      next(error)
    }
}

const getUserPublish = async (req,res,next) => {
  try{    
      const draft = await prisma.post.findMany({
        where:{authorId:req.user.userId, 
          
          OR: [
          { published: true },
          {
            publishedAt: {
              lte: new Date(), // Future scheduled posts belong in Drafts
            },
          },
        ],
          },
        orderBy:{updatedAt:'desc'},
        include:{
          files:true
        }
      })


      res.status(200).json(draft)
    }catch(error){
      console.error(error)
      next(error)
    }
}

const getallPublish = async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { published: true },
          {
            publishedAt: {
              lte: new Date(), // 👈 Fixed: Explicitly checks publishedAt column
            },
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        files:true,
        author: {
          select: { username: true },
        },
      },
    });

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
const getPostContent = async (req,res,next)=>{
  try{
    const postId  = parseInt(req.params.id,10)
    const Posts = await prisma.post.findUnique({
      where:{id:postId}
    })
    res.json(Posts)
  }catch(error){
    console.error(error)
    next(error)
  }
}
const deletePost = async (req, res, next) => {
    const PostId = parseInt(req.params.id, 10);
    // Extract user ID safely from decoded JWT payload
    const userId = parseInt( req.user.userId, 10);
  try {
    

    const Posts = await prisma.post.findUnique({
      where: { id: PostId },
      include: { files: true },
    });
    
    if (!Posts) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check ownership OR admin privileges
    const isAuthor = Posts.authorId === userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Unauthorized to delete this post' });
    }

     // 2. Delete physical files from Supabase Storage if any are attached
    if (Posts.files && Posts.files.length > 0) {
      const fileNames = Posts.files.map((file) =>
        decodeURIComponent(file.url.split("/").pop())
      );

      const { error: storageError } = await supabase.storage
        .from("Blog_API") // 👈 Ensure matches your Supabase bucket name
        .remove(fileNames);

      if (storageError) {
        console.error("Supabase storage deletion error:", storageError);
      }
    }
    await prisma.post.delete({
      where: { id: PostId }
    });

    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error in deletePost:', error);
    next(error);
  }
};

const SinglePost = async (req,res,next) => {
      try{
        const PostId = parseInt(req.params.id,10)
        const Post = await prisma.post.findUnique({
          where:{id:PostId},
          include:{
            author:true,
            files:true,
            comments:{
              include:{
                author:true
              },
              orderBy:{
                createdAt:'desc'
              }
            }
          },
          
        })

        if(!Post){
          return res.status.json({message:"Post is missing"})
        }
        res.status(200).json(Post)
      }catch(error){
        console.error(error)
        next(error)
      }
}
const EditPost = async (req ,res,next)=>{
  const userId = parseInt(req.user.userId,10)
  const PostId= parseInt(req.params.id ,10)
  const fileData = req.savedFileData
  const {title,content,published} = req.body
  const publish = published === 'true' || published === true

  try{
      const post = await prisma.post.findUnique({
        where:{id:PostId}
      })
      if(!post){
        return res.status(404).json({message:"post not found"})
      }
      if(post.authorId !==userId){
        return res.status(403).json({message:"forbiden to edit post"})
      }
      const result = await prisma.$transaction(async (prisma) => {
      // 1. Create the blog post
      const newPost = await prisma.post.update({
        where:{id:PostId},
        data: {
          title,
          content,
          published: publish,
          publishedAt: publish ? post.publishedAt : null,
          authorId: userId,
        },
      });

      // 2. Create the file record if a file was uploaded
      let newFile = null;
      if (fileData) {
        newFile = await prisma.file.create({
          data: {
            name: fileData.name,
            size: fileData.size,
            url: fileData.url,
            userId: userId,
            postId: newPost.id,
          },
        });
      }

      return { newPost, newFile };
    });
    res.status(200).json({post:result.newPost , file:result.newFile ,message:"success editing Post"})
  }catch(error){
    console.error(error);
    next(error)}
}



const testing = async(req,res,next)=>{
 const user = req.user
 const params = req.params
 const body = req.body
 const fileData = req.req?.savedFileData || req.savedFileData; // Whatever your storage middleware populates
 


 console.log (user)
 console.log(body)
 console.log(params)
 console.log(fileData)
res.json({message:'test test'})

 


}
module.exports= { login,registerpost,PublishDraft,CreatePost,getdraft,getUserPublish,deletePost,
                  testing,getPostContent,getallPublish,SinglePost,UpdateUser,EditPost
                  
}
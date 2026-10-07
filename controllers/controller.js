const { validationResult } = require("express-validator");
const prisma = require("../lib/prisma.js")
const bcrypt = require('bcryptjs')
const jwt =require('jsonwebtoken')


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
    // 2. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username/email or password." });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
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
        role: user.role
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

const PublishPost = async (req,res,next) => {
      try{
        const userId = parseInt(req.user.id)
        await prisma.post.create({
          data:{
            title,
            content,
            authorId:userId,
            published:true

          }
        })
      }catch(error){
        console.error(error)
        next(error)
      }
}

const saveDraft = async (req,res,next) => {

  try{
    const UserId = parseInt(req.user.id)
    await prisma.post.create({
      data:{
        title,
        content,
        authorId:UserId,
        published:false
      }
    })
  }catch(error){
    console.error(error)
    next()
    }
}

const PublishDraft = async (req,res,next) => {
  try{
  const postId = parseInt(req.params.id)
  await prisma.post.update({
    where:{id:postId},
    data:{
      published:true
    }
  })
  }catch(error){
    console.error(error)
    next()
  }
}
module.exports= {login,registerpost,saveDraft,PublishDraft,PublishPost}
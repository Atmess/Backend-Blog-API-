const prisma = require("../lib/prisma");

const getallUser = async (req,res,next) => {
    const userId = parseInt(req.user.userId,10)
try{
  const user = await prisma.user.findUnique({
    where:{id:userId}
  })
  if(user.role !== "ADMIN"){
    return res.status(403).json({message:"ADMIN only"})
  }
  const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        // password is intentionally left out!
      },
      orderBy: {
        createdAt: 'desc', // Optional: newest users first
      },
    });
    res.status(200).json(users)
  
}catch(error){
  console.error(error)
  next(error)
}
}

const getallPost = async (req,res,next) => {
    const userId = parseInt(req.user.userId,10)
try{
  const user = await prisma.user.findUnique({
    where:{id:userId}
  })
  if(user.role !== "ADMIN"){
    return res.status(403).json({message:"ADMIN only"})
  }
  const posts = await prisma.post.findMany({
  // You don't need select for scalar fields; they are included automatically!
  include: {
    author: {
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        status: true,
        // password is safely left out here!
      }
    },
    files: true,   // Fetches attached files if needed
    comments: true // Fetches comments if needed
  },
  orderBy: {
    createdAt: 'desc',
  },
});
    res.status(200).json(posts)
  
}catch(error){
  console.error(error)
  next(error)
}
}


const changeUserStatus = async (req, res, next) => {
  try {
    const adminUserId = parseInt(req.user.userId, 10);
    const targetUserId = parseInt(req.params.id, 10);
    const { status: newStatus } = req.body;

    // 1. Check if the requester is an ADMIN first (using JWT payload or database check)
    // Since req.user already contains role from the token, you can check it instantly:
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    // 2. Validate status input
    const validStatuses = ['ACTIVE', 'FLAGGED', 'BANNED'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status value provided" });
    }

    // 3. Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // 4. Prevent admin from accidentally changing their own status
    if (adminUserId === targetUserId) {
      return res.status(400).json({ message: "You cannot change your own status." });
    }

    // 5. Update the user's status in the database
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { status: newStatus },
      select: { id: true, username: true, email: true, status: true, role: true } // Safe fields
    });
    console.log(updatedUser)
    res.json({ 
      message: `User status successfully updated to ${newStatus}`, 
      user: updatedUser 
    });

  } catch (error) {
    console.error("Change Status Error:", error);
    next(error); // Passes it to your global error handling middleware
  }
};

const promoteToAdmin = async (req, res) => {
  try {
    const userId = req.user.userId; // ID from current token

    // 1. Update the user in the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    // 2. Generate a NEW token with the updated role and info
    const newToken = jwt.sign(
      {
        userId: updatedUser.id,
        role: updatedUser.role, // Now 'ADMIN'
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
      },
      process.env.JWT_SECRET, // Your secret key
      { expiresIn: '24h' }
    );

    // 3. Send back the new token and user data
    res.json({
      message: 'Successfully promoted to Admin!',
      token: newToken, // 👈 Frontend will capture and save this
      user: updatedUser,
    });

  } catch (error) {
    console.error("Promotion Error:", error);
    res.status(500).json({ message: 'Failed to update role' });
  }
};

const changePostStatus = async (req, res, next) => {
  try {
    const targetPostId = parseInt(req.params.id, 10);
    const { status } = req.body; // Expecting { status: 'FLAGGED', published: false }
    console.log("targetpost ID",targetPostId)
    console.log("status",status)
    // 1. Check if the requester is an ADMIN
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    // 2. Validate status input
    const validStatuses = ['GOOD', 'FLAGGED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value provided" });
    }
    console.log("validStatuses",validStatuses)
    // 3. Check if target post exists
    const targetPost = await prisma.post.findUnique({
      where: { id: targetPostId },
    });
    console.log("targetPost",targetPost)
    if (!targetPost) {
      return res.status(404).json({ message: "Target post not found" });
    }

    // 4. Update the post's status and published state
    const updatedPost = await prisma.post.update({
      where: { id: targetPostId },
      data: { 
        status ,
        // If flagging, force published to false. If marking GOOD, you can allow setting it back or keep it as-is
        published: false,
        publishedAt:null
      },
      select: { id: true, title: true, status: true, published: true, authorId: true }
    });
    console.log("updatedPost",updatedPost)
    res.json({ 
      message: `Post successfully updated (Status: ${updatedPost.status}, Published: ${updatedPost.published})`, 
      post: updatedPost 
    });

  } catch (error) {
    console.error("Change Post Status Error:", error);
    next(error);
  }
};

module.exports = ({getallUser,changeUserStatus,promoteToAdmin,changePostStatus,
                    getallPost
})
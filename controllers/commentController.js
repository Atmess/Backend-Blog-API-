const prisma = require("../lib/prisma")

const createComment = async (req,res,next) => {
    try{
        const postId = parseInt(req.params.id ,10)
        const authorId = parseInt(req.user.userId)
        const content = req.body.content

        const comment = await prisma.comment.create({
            data:{
                postId,
                authorId,
                content
            },
            include:{
                post:true,
                author:true
            }
        })
        console.log('create comment')
        res.status(200).json(comment)
    }catch(error){
        console.error(error)
        next(error)
    }
}

const deleteComment = async (req,res,next) => {
    const commentId = parseInt(req.params.id,10)
    const userId = parseInt(req.user.userId)

    if (isNaN(commentId)) {
            return res.status(400).json({ message: 'Invalid comment ID format' });
        }

    const comment = await prisma.comment.findUnique({
        where:{id:commentId}
    })
    if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
    if(comment.authorId !== userId){
        return res.status(403).json({message:'forbidden to remove this'})
    }
    try{
    
    await prisma.comment.delete({
        where:{id:commentId}
    })
    console.log('delete comment')
    res.status(200).json({message:'succes deleting comment'})
}catch(error){
    console.error(error)
    next(error)
}
}

const editComment = async (req,res,next) => {
        const userId= parseInt(req.user.userId,10)
        const commentId = parseInt(req.params.id)
        const content = req.body.content

         if (isNaN(commentId)) {
            return res.status(400).json({ message: 'Invalid comment ID format' });
        }

        const comment = await prisma.comment.findUnique({
            where:{id:commentId}
        })
        if (!comment) {
                return res.status(404).json({ message: 'Comment not found' });
            }
        if(comment.authorId !== userId){
            return res.status(403).json({message:'forbidden to remove this'})
        }

    try{
       const editcoment = await prisma.comment.update({
        where:{id:commentId},
        data:{
            content
        }
       })
       console.log('edit comment')
       res.status(200).json(editcoment)
    }catch(error){
        console.error(error)
        next(error)
    }
}
module.exports=({createComment,deleteComment,editComment})
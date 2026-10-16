const prisma = require("../lib/prisma")

const GetallMessage = async (req,res,next) => {
    try{
        const Message = await prisma.message.findMany({
            select:{
                sender:true,
                receiver:true
            }
        })

        res.status(200).json(Message)
    }catch(error){
        console.error(error)
        next(error)
    }
}


const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id; // From your verifyToken middleware

    // Find messages where user is sender or receiver
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, username: true, email: true, avatarUrl: true } },
        receiver: { select: { id: true, username: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Extract unique contact objects
    const contactMap = new Map();
    messages.forEach((msg) => {
      const contact = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!contactMap.has(contact.id)) {
        contactMap.set(contact.id, contact);
      }
    });

    res.json(Array.from(contactMap.values()));
  } catch (error) {
    next(error);
  }
};

// Get all messages between logged-in user and a specific contact
const getMessagesWithUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const contactId = parseInt(req.params.userId);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: contactId },
          { senderId: contactId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// Send a new message
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, content } = req.body;

    if (!content || !receiverId) {
      return res.status(400).json({ message: 'Receiver and content are required' });
    }

    const newMessage = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId: parseInt(receiverId),
      },
    });

    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }
};

const getallforUser = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      select: { id: true, username: true, email: true },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};
module.exports= ({GetallMessage,sendMessage,getMessagesWithUser,getConversations,getallforUser})
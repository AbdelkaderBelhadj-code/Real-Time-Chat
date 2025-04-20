const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const user = new User({ username, password });
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    res.json({ token, userId: user._id, username: user.username });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/messages/:recipientId', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipientId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId }
      ]
    }).sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Socket.io connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) {
      return next(new Error('Invalid or expired token'));
    }
    socket.user = user;
    next();
  });
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.user.id;
  connectedUsers.set(userId, socket.id);
  
  console.log(`User connected: ${userId}`);
  
  socket.on('send-message', async (data) => {
    try {
      const { recipientId, content } = data;
      
      // Save message to database
      const message = new Message({
        sender: userId,
        recipient: recipientId,
        content
      });
      
      await message.save();
      
      // Send to recipient if online
      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive-message', {
          _id: message._id,
          sender: userId,
          recipient: recipientId,
          content,
          timestamp: message.timestamp
        });
      }
      
      // Send confirmation back to sender
      socket.emit('message-sent', {
        _id: message._id,
        sender: userId,
        recipient: recipientId,
        content,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
  
  socket.on('disconnect', () => {
    connectedUsers.delete(userId);
    console.log(`User disconnected: ${userId}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
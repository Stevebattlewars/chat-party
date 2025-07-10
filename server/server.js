import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import serveStatic from 'serve-static';
import multer from 'multer';
import fs from 'fs/promises';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Socket.IO configuration with CORS for both local and production
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000", 
      "https://chat.mydomain.com",
      process.env.CLIENT_URL || "http://localhost:5173"
    ],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://chat.mydomain.com",
    process.env.CLIENT_URL || "http://localhost:5173"
  ]
}));
app.use(express.json());

// Serve static files from React build
app.use(serveStatic(path.join(__dirname, '../dist')));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isImage = file.mimetype.startsWith('image/');
    const uploadDir = isImage ? 'uploads/images' : 'uploads/files';
    cb(null, path.join(__dirname, uploadDir));
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + '-' + uniqueSuffix + fileExtension;
    cb(null, fileName);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Archives
    'application/zip', 'application/x-rar-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Configure multer with 5MB limit
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// MySQL connection (for production)
let mysqlConnection;
if (isProduction) {
  try {
    mysqlConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    console.log('MySQL connected successfully');
    
    // Initialize MySQL tables
    await initializeMySQLTables();
  } catch (error) {
    console.error('MySQL connection failed:', error);
    process.exit(1);
  }
}

// Initialize MySQL tables
async function initializeMySQLTables() {
  if (!mysqlConnection) return;
  
  try {
    // Users table
    await mysqlConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar_emoji VARCHAR(10) DEFAULT '😊',
        avatar_background_color VARCHAR(7) DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Rooms/Groups table
    await mysqlConnection.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Room members table
    await mysqlConnection.execute(`
      CREATE TABLE IF NOT EXISTS room_members (
        room_id INT,
        user_id INT,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Conversations table (for DMs)
    await mysqlConnection.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user1_id INT NOT NULL,
        user2_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_message TEXT,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_conversation (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
      )
    `);

    // Messages table (updated to support both group and DM messages, with edit functionality and file attachments)
    await mysqlConnection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT,
        conversation_id INT,
        user_id INT NOT NULL,
        text TEXT,
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_type VARCHAR(100),
        file_size INT,
        is_image BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        edited_at TIMESTAMP NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        CHECK ((room_id IS NOT NULL AND conversation_id IS NULL) OR (room_id IS NULL AND conversation_id IS NOT NULL)),
        CHECK ((text IS NOT NULL AND text != '') OR file_url IS NOT NULL)
      )
    `);

    console.log('MySQL tables initialized successfully');
  } catch (error) {
    console.error('Error initializing MySQL tables:', error);
  }
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes (for MySQL/Production)
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for signup in local development mode',
      suggestion: 'Configure Firebase Authentication in your frontend app'
    });
  }

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await mysqlConnection.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const token = jwt.sign({ 
      id: result.insertId, 
      email, 
      username 
    }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { 
        id: result.insertId, 
        username, 
        email,
        avatar: {
          emoji: '😊',
          backgroundColor: '#3B82F6'
        }
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for login in local development mode',
      suggestion: 'Configure Firebase Authentication in your frontend app'
    });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await mysqlConnection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last seen
    await mysqlConnection.execute(
      'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      username: user.username 
    }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        avatar: {
          emoji: user.avatar_emoji || '😊',
          backgroundColor: user.avatar_background_color || '#3B82F6'
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile Routes
app.put('/api/profile/avatar', authenticateToken, async (req, res) => {
  const { emoji, backgroundColor } = req.body;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for profile updates in local development mode',
      suggestion: 'Store profile data in Firestore in your frontend app'
    });
  }

  if (!emoji || !backgroundColor) {
    return res.status(400).json({ error: 'Emoji and background color are required' });
  }

  // Basic validation
  if (emoji.length > 10) {
    return res.status(400).json({ error: 'Invalid emoji' });
  }

  if (!/^#[0-9A-F]{6}$/i.test(backgroundColor)) {
    return res.status(400).json({ error: 'Invalid background color format' });
  }

  try {
    await mysqlConnection.execute(
      'UPDATE users SET avatar_emoji = ?, avatar_background_color = ? WHERE id = ?',
      [emoji, backgroundColor, req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      avatar: { emoji, backgroundColor }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// File Upload Routes
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const isImage = file.mimetype.startsWith('image/');
    const fileUrl = `/uploads/${isImage ? 'images' : 'files'}/${file.filename}`;
    
    // File info to return
    const fileInfo = {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: fileUrl,
      isImage: isImage,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.id
    };

    res.status(200).json({
      message: 'File uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
      }
    }
    
    if (error.message === 'File type not allowed') {
      return res.status(400).json({ error: 'File type not allowed. Please upload images, documents, or archives only.' });
    }

    res.status(500).json({ error: 'File upload failed' });
  }
});

// Groups/Rooms Routes
app.get('/api/groups', authenticateToken, async (req, res) => {
  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for groups in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  try {
    const [rows] = await mysqlConnection.execute(`
      SELECT r.*, rm.joined_at, u.username as created_by_username
      FROM rooms r
      INNER JOIN room_members rm ON r.id = rm.room_id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE rm.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/groups', authenticateToken, async (req, res) => {
  const { name, description } = req.body;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for groups in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  try {
    // Create room
    const [result] = await mysqlConnection.execute(
      'INSERT INTO rooms (name, description, created_by) VALUES (?, ?, ?)',
      [name.trim(), description?.trim() || '', req.user.id]
    );

    const roomId = result.insertId;

    // Add creator as member
    await mysqlConnection.execute(
      'INSERT INTO room_members (room_id, user_id) VALUES (?, ?)',
      [roomId, req.user.id]
    );

    res.status(201).json({
      id: roomId,
      name: name.trim(),
      description: description?.trim() || '',
      created_by: req.user.id,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Messages Routes  
app.get('/api/messages/:roomId', authenticateToken, async (req, res) => {
  const { roomId } = req.params;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for messages in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  try {
    // Check if user is member of the room
    const [memberCheck] = await mysqlConnection.execute(
      'SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?',
      [roomId, req.user.id]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await mysqlConnection.execute(`
      SELECT m.*, u.username 
      FROM messages m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ? AND m.is_deleted = FALSE
      ORDER BY m.timestamp ASC
    `, [roomId]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DM/Conversations Routes
app.get('/api/conversations', authenticateToken, async (req, res) => {
  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for conversations in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  try {
    // Get conversations where user is a participant
    const [rows] = await mysqlConnection.execute(`
      SELECT c.*, 
             u1.username as user1_name, u1.email as user1_email,
             u2.username as user2_name, u2.email as user2_email
      FROM conversations c
      INNER JOIN users u1 ON c.user1_id = u1.id
      INNER JOIN users u2 ON c.user2_id = u2.id
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
    `, [req.user.id, req.user.id]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/conversations', authenticateToken, async (req, res) => {
  const { otherUserId } = req.body;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for conversations in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  if (!otherUserId) {
    return res.status(400).json({ error: 'Other user ID is required' });
  }

  if (otherUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot create conversation with yourself' });
  }

  try {
    // Check if conversation already exists
    const [existingConv] = await mysqlConnection.execute(`
      SELECT * FROM conversations 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `, [req.user.id, otherUserId, otherUserId, req.user.id]);

    if (existingConv.length > 0) {
      return res.json(existingConv[0]);
    }

    // Create new conversation
    const [result] = await mysqlConnection.execute(
      'INSERT INTO conversations (user1_id, user2_id, created_at, last_message_at) VALUES (?, ?, ?, ?)',
      [req.user.id, otherUserId, new Date(), new Date()]
    );

    // Get the created conversation with user details
    const [newConv] = await mysqlConnection.execute(`
      SELECT c.*, 
             u1.username as user1_name, u1.email as user1_email,
             u2.username as user2_name, u2.email as user2_email
      FROM conversations c
      INNER JOIN users u1 ON c.user1_id = u1.id
      INNER JOIN users u2 ON c.user2_id = u2.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json(newConv[0]);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DM Messages Routes
app.get('/api/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  const { conversationId } = req.params;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for DM messages in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  try {
    // Check if user is participant in the conversation
    const [convCheck] = await mysqlConnection.execute(
      'SELECT 1 FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [conversationId, req.user.id, req.user.id]
    );

    if (convCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await mysqlConnection.execute(`
      SELECT m.*, u.username 
      FROM messages m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.conversation_id = ? AND m.is_deleted = FALSE
      ORDER BY m.timestamp ASC
    `, [conversationId]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching DM messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave Group Route
app.post('/api/groups/:groupId/leave', authenticateToken, async (req, res) => {
  const { groupId } = req.params;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for groups in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  try {
    // Check if user is member of the group
    const [memberCheck] = await mysqlConnection.execute(
      'SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Remove user from group
    await mysqlConnection.execute(
      'DELETE FROM room_members WHERE room_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Group Route (only for group creators)
app.delete('/api/groups/:groupId', authenticateToken, async (req, res) => {
  const { groupId } = req.params;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for groups in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  try {
    // Check if user created the group
    const [groupCheck] = await mysqlConnection.execute(
      'SELECT created_by FROM rooms WHERE id = ?',
      [groupId]
    );

    if (groupCheck.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (groupCheck[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the group creator can delete the group' });
    }

    // Delete group (CASCADE will handle messages and members)
    await mysqlConnection.execute('DELETE FROM rooms WHERE id = ?', [groupId]);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Conversation Route  
app.delete('/api/conversations/:conversationId', authenticateToken, async (req, res) => {
  const { conversationId } = req.params;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for conversations in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  try {
    // Check if user is participant in the conversation
    const [convCheck] = await mysqlConnection.execute(
      'SELECT 1 FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [conversationId, req.user.id, req.user.id]
    );

    if (convCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete conversation (CASCADE will handle messages)
    await mysqlConnection.execute('DELETE FROM conversations WHERE id = ?', [conversationId]);

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit Message Route
app.put('/api/messages/:messageId', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for messages in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    // Check if user owns the message
    const [messageCheck] = await mysqlConnection.execute(
      'SELECT user_id, is_deleted FROM messages WHERE id = ?',
      [messageId]
    );

    if (messageCheck.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (messageCheck[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    if (messageCheck[0].is_deleted) {
      return res.status(400).json({ error: 'Cannot edit deleted messages' });
    }

    // Update message
    await mysqlConnection.execute(
      'UPDATE messages SET text = ?, edited_at = ?, is_edited = TRUE WHERE id = ?',
      [text.trim(), new Date(), messageId]
    );

    res.json({ message: 'Message updated successfully' });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Message Route
app.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
  const { messageId } = req.params;

  if (!isProduction) {
    return res.status(400).json({ 
      error: 'Use Firebase for messages in local development mode',
      suggestion: 'Configure Firestore in your frontend app'
    });
  }

  try {
    // Check if user owns the message
    const [messageCheck] = await mysqlConnection.execute(
      'SELECT user_id, is_deleted FROM messages WHERE id = ?',
      [messageId]
    );

    if (messageCheck.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (messageCheck[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    if (messageCheck[0].is_deleted) {
      return res.status(400).json({ error: 'Message already deleted' });
    }

    // Soft delete message
    await mysqlConnection.execute(
      'UPDATE messages SET is_deleted = TRUE, text = "[Message deleted]" WHERE id = ?',
      [messageId]
    );

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO for real-time messaging
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Handle sending messages (both group and DM messages)
  socket.on('send-message', async (messageData) => {
    try {
      console.log('Received message:', messageData);
      
      // TODO: Add encryption/decryption here for E2E encryption
      // const decryptedMessage = decrypt(messageData.text);
      // const encryptedMessage = encrypt(decryptedMessage);
      
      // Determine if this is a group message or DM
      const isGroupMessage = messageData.groupId && !messageData.conversationId;
      const isDMMessage = messageData.conversationId && !messageData.groupId;
      
      // Save to MySQL if in production
      if (isProduction && mysqlConnection) {
        let result;
        if (isGroupMessage) {
          [result] = await mysqlConnection.execute(
            'INSERT INTO messages (room_id, user_id, text, file_url, file_name, file_type, file_size, is_image, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              messageData.groupId, 
              messageData.userId || 1, 
              messageData.text || null,
              messageData.file?.url || null,
              messageData.file?.originalName || null,
              messageData.file?.mimetype || null,
              messageData.file?.size || null,
              messageData.file?.isImage || false,
              new Date()
            ]
          );
        } else if (isDMMessage) {
          [result] = await mysqlConnection.execute(
            'INSERT INTO messages (conversation_id, user_id, text, file_url, file_name, file_type, file_size, is_image, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              messageData.conversationId, 
              messageData.userId || 1, 
              messageData.text || null,
              messageData.file?.url || null,
              messageData.file?.originalName || null,
              messageData.file?.mimetype || null,
              messageData.file?.size || null,
              messageData.file?.isImage || false,
              new Date()
            ]
          );
        }
        
        if (result) {
          messageData.id = result.insertId;
        }
      }

      // Broadcast to appropriate room (group room or DM conversation)
      const roomId = isGroupMessage ? messageData.groupId : messageData.conversationId;
      io.to(roomId).emit('new-message', {
        ...messageData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📨 Message sent to ${isGroupMessage ? 'group' : 'DM'} room:`, roomId);
      
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  // Keep the old 'message' event for backward compatibility
  socket.on('message', async (messageData) => {
    // Forward to the new send-message handler
    socket.emit('send-message', messageData);
  });

  // Edit message event
  socket.on('edit-message', async (editData) => {
    try {
      console.log('Edit message request:', editData);
      
      // Broadcast the edit to all users in the room
      const roomId = editData.groupId || editData.conversationId;
      io.to(roomId).emit('message-edited', {
        messageId: editData.messageId,
        newText: editData.text,
        editedAt: new Date().toISOString(),
        userId: editData.userId
      });
      
      console.log(`📝 Message edited in room:`, roomId);
    } catch (error) {
      console.error('Error handling message edit:', error);
      socket.emit('edit-error', { error: 'Failed to edit message' });
    }
  });

  // Delete message event
  socket.on('delete-message', async (deleteData) => {
    try {
      console.log('Delete message request:', deleteData);
      
      // Broadcast the deletion to all users in the room
      const roomId = deleteData.groupId || deleteData.conversationId;
      io.to(roomId).emit('message-deleted', {
        messageId: deleteData.messageId,
        userId: deleteData.userId
      });
      
      console.log(`🗑️ Message deleted in room:`, roomId);
    } catch (error) {
      console.error('Error handling message deletion:', error);
      socket.emit('delete-error', { error: 'Failed to delete message' });
    }
  });

  // Leave group event
  socket.on('leave-group', async (leaveData) => {
    try {
      console.log('Leave group request:', leaveData);
      
      // Leave the Socket.IO room
      socket.leave(leaveData.groupId);
      
      // Broadcast to remaining group members
      socket.to(leaveData.groupId).emit('user-left-group', {
        groupId: leaveData.groupId,
        userId: leaveData.userId,
        username: leaveData.username
      });
      
      console.log(`👋 User ${leaveData.username} left group:`, leaveData.groupId);
    } catch (error) {
      console.error('Error handling leave group:', error);
      socket.emit('leave-group-error', { error: 'Failed to leave group' });
    }
  });

  // Delete chat event  
  socket.on('delete-chat', async (deleteData) => {
    try {
      console.log('Delete chat request:', deleteData);
      
      // Broadcast to all participants
      const roomId = deleteData.groupId || deleteData.conversationId;
      io.to(roomId).emit('chat-deleted', {
        chatId: roomId,
        chatType: deleteData.groupId ? 'group' : 'conversation',
        deletedBy: deleteData.userId
      });
      
      console.log(`🗑️ Chat deleted:`, roomId);
    } catch (error) {
      console.error('Error handling delete chat:', error);
      socket.emit('delete-chat-error', { error: 'Failed to delete chat' });
    }
  });

  // Leave room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint (must be before catch-all route)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Serve React app for all other routes (catch-all)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Export for Vercel (serverless)
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Check for port conflicts and start server (local development)
  function checkPortAndStart() {
    exec('lsof -i :' + PORT, (error, stdout) => {
      if (!error && stdout) {
        console.log(`⚠️  Port ${PORT} is in use!`);
        console.log('Kill the process with:');
        console.log(`lsof -i :${PORT} | awk 'NR>1 {print $2}' | xargs kill -9`);
        console.log('Or use a different port by setting PORT environment variable.');
        return;
      }
      
      server.listen(PORT, () => {
        console.log(`🚀 Chat Party Server running on port ${PORT}`);
        console.log(`📍 Environment: ${isProduction ? 'production' : 'development'}`);
        console.log(`🌐 CORS origins: ${isProduction ? 'https://chat.mydomain.com' : 'http://localhost:5173'}`);
        console.log(`💾 Database: ${isProduction ? 'MySQL' : 'Firebase (configure in frontend)'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      });
    });
  }

  checkPortAndStart();
} 
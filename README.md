# Chat Party - Real-time Chat Application

A modern, real-time chat application built with React, Vite, Tailwind CSS, and Socket.IO. Inspired by Discord's design with support for group chats, real-time messaging, and beautiful customizable profile pictures.

## Features

- 🔐 **User Authentication** - Sign up/login with email and password
- 💬 **Real-time Messaging** - Instant messaging using Socket.IO
- 👥 **Group Management** - Create and join chat groups
- 🎨 **Modern UI** - Beautiful interface with Tailwind CSS and SF Pro font
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🔄 **Dual Backend Support** - Firebase for local development, MySQL for production
- 🛡️ **Security** - JWT authentication, rate limiting, and input validation
- 🌐 **Cross-browser Compatible** - Works in all modern browsers

## Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Firebase SDK** - Authentication and Firestore (local development)

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Socket.IO** - Real-time bidirectional event-based communication
- **MySQL** - Database for production (via cPanel)
- **Firebase** - Backend-as-a-Service for local development
- **bcryptjs** - Password hashing
- **JWT** - Token-based authentication

## Project Structure

```
chat_app/
├── public/
├── src/
│   ├── components/
│   │   ├── Login.jsx          # Login component
│   │   ├── Signup.jsx         # Registration component
│   │   ├── ChatRoom.jsx       # Main chat interface
│   │   ├── GroupManager.jsx   # Group management sidebar
│   │   └── Navbar.jsx         # Navigation bar
│   ├── config/
│   │   └── firebase.js        # Firebase configuration
│   ├── App.jsx                # Main app component with routing
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles and Tailwind
├── server.js                  # Express server with Socket.IO
├── package.json               # Frontend dependencies
├── env.example                # Environment variables template
└── README.md                  # This file
```

## Setup Instructions

### Local Development (Firebase)

#### Prerequisites
- Node.js 18+ and npm
- Firebase account and project

#### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd chat_app
npm install
```

#### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password" provider
4. Create Firestore Database:
   - Go to Firestore Database → Create database
   - Start in test mode (for development)
5. Get your Firebase config:
   - Go to Project Settings → General → Your apps
   - Add a web app if you haven't already
   - Copy the Firebase configuration

#### 3. Environment Configuration

Create a `.env` file in the root directory (copy from `env.example`):

```bash
cp env.example .env
```

Update `.env` with your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

#### 4. Install Backend Dependencies

For the backend server, you'll need to install additional dependencies:

```bash
npm install express socket.io cors dotenv helmet express-rate-limit bcryptjs jsonwebtoken mysql2
```

#### 5. Run the Application

Start both the frontend and backend:

```bash
# Terminal 1: Start the backend server
npm run server

# Terminal 2: Start the frontend development server
npm run dev
```

Or use the combined command:

```bash
npm run dev:all
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Production Deployment (cPanel/MySQL)

#### Prerequisites
- cPanel hosting with Node.js support
- MySQL database access via PhpMyAdmin
- Domain or subdomain (e.g., chat.yourdomain.com)

#### 1. Database Setup

1. **Create MySQL Database:**
   - Log into cPanel → MySQL Databases
   - Create a new database named `chat_app`
   - Create a database user with full privileges

2. **Database Tables:**
   The server will automatically create tables on first run, but you can manually create them in PhpMyAdmin:

```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE groups (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE group_members (
  group_id VARCHAR(255),
  user_id VARCHAR(255),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  text TEXT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL,
  group_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);
```

#### 2. Upload Files

1. **Build the Frontend:**
```bash
npm run build
```

2. **Upload to cPanel:**
   - Upload the `dist/` folder contents to your subdomain's public_html folder
   - Upload `server.js` and create a `package.json` for server dependencies
   - Create `.env` file with production settings

#### 3. Production Environment Configuration

Create `.env` file on the server:

```env
NODE_ENV=production
PORT=3001
CLIENT_URL=https://chat.yourdomain.com
JWT_SECRET=your-super-secure-random-secret-key-here

# MySQL Configuration
DB_HOST=localhost
DB_USER=your_cpanel_db_user
DB_PASSWORD=your_cpanel_db_password
DB_NAME=your_cpanel_db_name
```

#### 4. Install Server Dependencies

In cPanel Terminal or SSH:

```bash
cd /path/to/your/chat/app
npm install express socket.io cors dotenv helmet express-rate-limit bcryptjs jsonwebtoken mysql2
```

#### 5. Start the Server

```bash
# For development/testing
node server.js

# For production (recommended to use PM2 or similar)
pm2 start server.js --name "chat-app"
```

#### 6. Configure Subdomain

1. In cPanel → Subdomains
2. Create subdomain: `chat.yourdomain.com`
3. Point document root to the folder containing your built frontend files
4. Ensure Node.js app is running on the configured port

## API Endpoints

### Authentication (Production/MySQL only)
- `POST /api/signup` - User registration
- `POST /api/login` - User login

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create a new group

### Messages
- `GET /api/messages/:groupId` - Get messages for a group

### Health Check
- `GET /api/health` - Server health status

## Socket.IO Events

### Client to Server
- `join-room` - Join a chat room
- `send-message` - Send a message to a room
- `leave-room` - Leave a chat room

### Server to Client
- `new-message` - Receive a new message
- `message-error` - Message sending error

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (frontend only)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Start backend server
npm run server

# Start both frontend and backend
npm run dev:all

# Lint code
npm run lint
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `3001` |
| `CLIENT_URL` | Frontend URL for CORS | No | `http://localhost:3000` |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `VITE_FIREBASE_API_KEY` | Firebase API key | Yes (local) | - |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes (local) | - |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes (local) | - |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes (local) | - |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes (local) | - |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes (local) | - |
| `DB_HOST` | MySQL host | Yes (prod) | `localhost` |
| `DB_USER` | MySQL username | Yes (prod) | - |
| `DB_PASSWORD` | MySQL password | Yes (prod) | - |
| `DB_NAME` | MySQL database name | Yes (prod) | - |
| `VITE_SOCKET_URL` | Socket.IO server URL | No | `http://localhost:3001` |

## Troubleshooting

### Firebase Issues
- **Firebase not connecting:** Check your API keys and project configuration
- **Authentication errors:** Ensure Email/Password provider is enabled in Firebase Console
- **Firestore permission errors:** Check Firestore security rules

### Socket.IO Issues
- **Connection failed:** Verify the Socket.IO server is running and CORS is configured
- **Messages not appearing:** Check browser console for WebSocket connection errors

### MySQL Issues
- **Connection refused:** Verify database credentials and MySQL server status
- **Table errors:** Ensure all tables are created with proper foreign key relationships

### cPanel Deployment Issues
- **Node.js not working:** Contact hosting provider to enable Node.js support
- **Port conflicts:** Use the port provided by your hosting provider
- **Permission errors:** Ensure proper file permissions (755 for directories, 644 for files)

## Future Enhancements (TODO)

- [ ] **End-to-End Encryption** - Implement E2E encryption for messages
- [ ] **File Sharing** - Upload and share images/files in chat
- [ ] **Voice/Video Calls** - WebRTC integration for voice and video calls
- [ ] **Push Notifications** - Real-time notifications for new messages
- [ ] **Message Search** - Search through chat history
- [ ] **User Profiles** - Customizable user profiles and avatars
- [ ] **Direct Messages** - Private messaging between users
- [ ] **Message Reactions** - Emoji reactions to messages
- [ ] **Typing Indicators** - Show when users are typing
- [ ] **Message Threading** - Reply to specific messages
- [ ] **Dark Mode** - Toggle between light and dark themes
- [ ] **Mobile App** - React Native mobile application

## Security Considerations

- All passwords are hashed using bcryptjs
- JWT tokens expire after 7 days
- Rate limiting prevents API abuse
- Input validation on all endpoints
- CORS configured for production domain
- SQL injection prevention with parameterized queries
- XSS protection with proper input sanitization

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@yourdomain.com or create an issue on GitHub.

---

**Note:** This application is designed for educational and demonstration purposes. For production use, additional security measures and performance optimizations may be required. # Updated for deployment

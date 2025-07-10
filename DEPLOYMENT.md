# 🚀 Chat Party cPanel Deployment Guide

## Overview
This guide walks you through deploying your React/Node.js Chat Party application to a cPanel hosting environment with a subdomain.

## Pre-Deployment Checklist

### ✅ **Frontend (React) Preparation**

1. **Build the React app for production:**
   ```bash
   npm run build
   ```
   This creates a `dist/` folder with optimized static files.

2. **Test the build locally:**
   ```bash
   npm run preview
   ```

### ✅ **Backend (Node.js) Preparation**

1. **Update server configuration for production:**
   - Set environment variables for production
   - Configure proper CORS origins for your domain
   - Update database connections (if using MySQL in production)

2. **Install production dependencies:**
   ```bash
   cd server && npm install --production
   ```

## Deployment Steps

### **Step 1: Upload Frontend Files**

1. **Access cPanel File Manager**
   - Log into your cPanel
   - Open "File Manager"
   - Navigate to your subdomain folder (e.g., `public_html/chat` or `subdomains/chat/public_html`)

2. **Upload React Build Files**
   - Upload ALL contents from your `dist/` folder to the subdomain directory
   - Your directory should contain:
     ```
     index.html
     assets/
     ├── index-[hash].js
     ├── index-[hash].css
     └── [other assets]
     ```

3. **Set up URL Rewriting (Important!)**
   - Create/edit `.htaccess` file in your subdomain root:
   ```apache
   RewriteEngine On
   
   # Handle React Router - redirect all requests to index.html
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   
   # Security headers
   Header always set X-Content-Type-Options nosniff
   Header always set X-Frame-Options DENY
   Header always set X-XSS-Protection "1; mode=block"
   
   # Cache static assets
   <IfModule mod_expires.c>
     ExpiresActive on
     ExpiresByType text/css "access plus 1 year"
     ExpiresByType application/javascript "access plus 1 year"
     ExpiresByType image/png "access plus 1 year"
     ExpiresByType image/jpg "access plus 1 year"
   </IfModule>
   ```

### **Step 2: Deploy Backend Server**

#### **Option A: Node.js Support (Recommended)**
*If your hosting supports Node.js apps:*

1. **Upload server files:**
   - Create a separate directory (e.g., `api/` or `server/`)
   - Upload your `server/` folder contents
   - Upload `package.json` and server files

2. **Install dependencies on server:**
   ```bash
   cd server && npm install
   ```

3. **Configure environment variables:**
   - Create `.env` file with production settings
   - Update CORS origins to your domain
   - Set proper database credentials

4. **Start the server:**
   - Use cPanel's Node.js app manager
   - Or set up a daemon/process manager

#### **Option B: PHP Bridge (If Node.js not supported)**
*If your hosting doesn't support Node.js:*

1. **Create PHP proxy scripts** to handle API calls
2. **Use external services** like Heroku, Railway, or Vercel for the backend
3. **Update frontend API calls** to point to external backend URL

### **Step 3: Database Configuration**

#### **Firebase (Current Setup)**
- ✅ **No changes needed!** Firebase works from any domain
- Update Firebase security rules if needed
- Ensure your domain is added to authorized domains in Firebase Console

#### **MySQL (Production Option)**
1. **Create MySQL database** in cPanel
2. **Import your schema:**
   ```sql
   CREATE TABLE conversations (
     id VARCHAR(255) PRIMARY KEY,
     participants JSON NOT NULL,
     participant_names JSON NOT NULL,
     participant_emails JSON NOT NULL,
     last_message TEXT,
     last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY unique_participants (participants)
   );

   CREATE TABLE messages (
     id VARCHAR(255) PRIMARY KEY,
     text TEXT NOT NULL,
     user_id VARCHAR(255) NOT NULL,
     username VARCHAR(255) NOT NULL,
     group_id VARCHAR(255),
     conversation_id VARCHAR(255),
     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT chk_message_type CHECK (
       (group_id IS NOT NULL AND conversation_id IS NULL) OR 
       (group_id IS NULL AND conversation_id IS NOT NULL)
     )
   );
   ```

3. **Update server database connection:**
   ```javascript
   const mysql = require('mysql2');
   const pool = mysql.createPool({
     host: process.env.DB_HOST,
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME,
   });
   ```

### **Step 4: Environment Configuration**

1. **Create production environment file:**
   ```env
   NODE_ENV=production
   PORT=3000
   FRONTEND_URL=https://your-subdomain.yourdomain.com
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   ```

2. **Update CORS settings in server:**
   ```javascript
   const corsOptions = {
     origin: [
       'https://your-subdomain.yourdomain.com',
       'https://yourdomain.com'
     ],
     credentials: true
   };
   ```

## Testing Your Deployment

### **Frontend Testing**
1. Visit `https://your-subdomain.yourdomain.com`
2. Check that all routes work (login, dashboard, etc.)
3. Verify theme switching works
4. Test responsive design on mobile

### **Backend Testing**
1. Check API endpoints: `https://your-subdomain.yourdomain.com/api/health`
2. Test authentication flow
3. Send test messages
4. Verify real-time functionality (Socket.IO)

### **Full Integration Testing**
1. **Create account** and verify email functionality
2. **Test group chats** - create, join, send messages
3. **Test DM functionality** - search users, start conversations
4. **Test theme persistence** across browser sessions
5. **Check mobile responsiveness**

## Troubleshooting Common Issues

### ❌ **"Cannot GET /" Error**
- **Solution:** Add proper `.htaccess` rewrite rules (see Step 1.3)

### ❌ **API Calls Failing**
- **Solution:** Check CORS configuration and API URL endpoints
- Verify backend server is running and accessible

### ❌ **Socket.IO Connection Failed**
- **Solution:** Ensure WebSocket support is enabled in cPanel
- Check firewall settings for Socket.IO ports

### ❌ **Theme Not Persisting**
- **Solution:** Check browser localStorage permissions
- Verify theme toggle component is properly imported

### ❌ **Database Connection Error**
- **Solution:** Verify database credentials and host settings
- Check if hosting supports your database type

## Performance Optimization

### **Frontend Optimizations**
- ✅ Already implemented: Code splitting, asset optimization
- ✅ Modern build tools (Vite) for optimal bundle size
- ✅ Efficient CSS with Tailwind

### **Backend Optimizations**
- Use PM2 for process management (if supported)
- Enable compression middleware
- Implement proper caching headers
- Use CDN for static assets (optional)

### **Database Optimizations**
- Add proper indexes on frequently queried fields
- Implement connection pooling
- Consider Redis for session management (advanced)

## Security Considerations

### **Frontend Security**
- ✅ Implemented: Content Security Policy headers
- ✅ XSS protection enabled
- ✅ Secure authentication flow

### **Backend Security**
- Use environment variables for sensitive data
- Implement rate limiting
- Validate all inputs
- Use HTTPS everywhere (Let's Encrypt via cPanel)

### **Database Security**
- Use prepared statements (already implemented)
- Restrict database user permissions
- Regular backups
- Strong passwords

## Post-Deployment Checklist

- [ ] Frontend loads correctly at your subdomain
- [ ] All React routes work (no 404 errors)
- [ ] Theme toggle functions properly
- [ ] User registration/login works
- [ ] Group chat functionality operational
- [ ] DM functionality operational
- [ ] Real-time messaging works
- [ ] Mobile responsive design works
- [ ] HTTPS certificate active
- [ ] Database connections stable
- [ ] Error monitoring set up (optional)

## Maintenance

### **Regular Tasks**
- Monitor server resources and database size
- Update dependencies regularly
- Backup database and user data
- Monitor for security vulnerabilities
- Check error logs periodically

### **Scaling Considerations**
- Consider CDN for global users
- Implement database sharding for large user bases
- Add load balancing for high traffic
- Consider migrating to cloud platforms (AWS, Google Cloud) for advanced scaling

---

**🎉 Congratulations!** Your modern chat application is now live and ready for users to enjoy with beautiful light/dark themes and professional design! 
# Backend Deployment Guide

## Option 1: Vercel (Easiest)
```bash
npm install -g vercel
cd server
vercel
```

## Option 2: Railway
```bash
cd server
railway login
railway init
railway up
```

## Option 3: Render
1. Go to https://render.com
2. Connect GitHub
3. Create "Web Service"
4. Root directory: `server`
5. Build command: `npm install`
6. Start command: `npm start`

## Environment Variables to Set:
- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key`
- `CLIENT_URL=https://your-frontend-url.com`

## After Deployment:
1. Get your backend URL (e.g., `https://your-app.vercel.app`)
2. Update frontend environment variables:
   - Create `.env` in project root
   - Add: `VITE_SOCKET_URL=https://your-backend-url.com`
3. Redeploy frontend

## Test Your Backend:
Visit: `https://your-backend-url.com/api/health`
Should return: `{"status":"OK",...}` 
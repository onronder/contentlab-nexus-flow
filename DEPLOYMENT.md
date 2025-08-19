## Production Deployment Guide

### Prerequisites
- Node.js 18+
- GitHub repository connected
- Domain name (optional)

### Environment Setup

1. **Production Build**
   ```bash
   npm run build
   ```

2. **Environment Variables**
   Configure the following in your deployment platform:
   - `NODE_ENV=production`
   - `VITE_SUPABASE_URL=https://ijvhqqdfthchtittyvnt.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdmhxcWRmdGhjaHRpdHR5dm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTE4OTMsImV4cCI6MjA2ODc2Nzg5M30.wxyInat54wVrwFQvbk61Hf7beu84TnhrBg0Bkpmo6fA`

### Deployment Options

#### Option 1: Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`
3. Configure custom domain in Vercel dashboard

#### Option 2: Netlify
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod --dir=dist`

#### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Performance Optimizations
- CSS code splitting disabled for faster loads
- Tree shaking enabled
- Source maps disabled in production
- Console logs removed in production

### Security Headers
Configure these headers in your hosting platform:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Monitoring
- Set up error tracking with Sentry
- Configure uptime monitoring
- Enable real-time analytics tracking
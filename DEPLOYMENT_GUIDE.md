# SK Coder Deployment Guide

Complete guide for deploying SK Coder to production.

---

## Architecture Overview

```
┌─────────────────┐
│  SK Coder Web   │  Vercel Hosting
│  (React, Vite)  │  vercel.json config
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│    Backend API (api-server)         │  Oracle EC2 Free Tier
│  ├─ /api/execute (code runner)      │  Ubuntu 22.04 LTS
│  ├─ /api/projects (file storage)    │  Node.js 20 + Docker
│  ├─ /api/github (GitHub sync)       │
│  └─ /health (monitoring)            │
└────────┬────────────────────────────┘
         │
         ├─────────────────┬──────────────────┬─────────────────┐
         ▼                 ▼                  ▼                 ▼
    Docker Containers  Piston API      Wandbox API        Pyodide/Nodebox
    (Code Execution)   (Code Exec)      (Code Exec)        (Browser Exec)
                       emkc.org         wandbox.org
```

---

## Quick Deploy

### 1. Frontend (Vercel) — 5 Minutes

**Prerequisites:**
- GitHub account
- Vercel account (free)

**Steps:**
```bash
# 1. Push to GitHub
git add .
git commit -m "feat: complete Phase 1.1-1.9 full web app build"
git push origin main

# 2. Go to vercel.com
# 3. Click "New Project"
# 4. Import sk-code repository
# 5. Set build settings:
#    Framework: Vite
#    Build Command: npm run build
#    Output Directory: dist

# 6. Set environment variables:
VITE_API_URL=https://your-backend.example.com
VITE_GITHUB_CLIENT_ID=your-github-client-id

# 7. Deploy
# Vercel automatically deploys on git push
```

**Result:** Your app is live at: `https://sk-coder.vercel.app`

---

### 2. Backend (Oracle EC2 Free Tier) — 10 Minutes

**Prerequisites:**
- Oracle Cloud Free Account (always free)
- SSH access to EC2 instance
- Domain name (optional, uses IP for now)

**Steps:**

```bash
# 1. SSH into your Oracle EC2 instance
ssh -i your-key.pem ubuntu@your-instance-ip

# 2. Download and run setup script
curl -fsSL https://raw.githubusercontent.com/yourusername/sk-code/main/setup-backend.sh | bash

# 3. Verify it's running
curl http://localhost:3001/health
# Should return: {"status":"ok"}

# 4. Configure DNS (optional)
# Point your domain to the EC2 instance IP
# Then update VITE_API_URL in Vercel to your domain

# 5. Enable HTTPS (recommended)
# Install Certbot: sudo apt-get install certbot
# Get certificate: sudo certbot certonly --standalone -d yourdomain.com
# Update nginx config to use the certificate
```

**Result:** Your API is live at: `http://your-instance-ip:3001` or `https://yourdomain.com`

---

## Detailed Setup

### Option A: Vercel (Recommended for Frontend)

**What it does:**
- Hosts your React web app
- Auto-scales to handle traffic
- Free for small projects
- CI/CD on every git push

**Cost:** FREE (up to 100GB bandwidth/month)

**Setup:**

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Import Repository**
   - Click "New Project"
   - Select your sk-code repo
   - Choose workspace folder: `sk-coder-web`

3. **Configure Build**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**
   - Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL = https://your-api.example.com
     VITE_GITHUB_CLIENT_ID = your-github-app-client-id
     VITE_GITHUB_REDIRECT_URI = https://your-app.vercel.app/auth/github
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live!

---

### Option B: Oracle Cloud Free Tier EC2 (Backend)

**What it does:**
- Always-free tier: 2 vCPU, 1GB RAM, 50GB storage
- Runs your Node.js API
- Executes user code in Docker containers
- Free for up to 5 years (no credit card needed for free tier)

**Cost:** FREE (4 vCPUs, 24GB RAM, 150GB storage combined across services)

**Setup:**

1. **Create Oracle Cloud Account**
   - Go to https://www.oracle.com/cloud/free/
   - Sign up (no credit card required for free tier)

2. **Create Compute Instance**
   - Choose: Ubuntu 22.04 LTS
   - Shape: VM.Standard.E2.1.Micro (Always free)
   - Storage: 50GB
   - Add SSH key pair
   - Create instance

3. **Connect via SSH**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

4. **Run Setup Script**
   ```bash
   # Clone repo
   git clone https://github.com/yourusername/sk-code.git
   cd sk-code
   
   # Run setup (installs everything)
   bash setup-backend.sh
   
   # Verify
   curl http://localhost:3001/health
   ```

5. **Open Firewall Rules**
   - Go to Oracle Cloud Console
   - Compute → Instances → Your Instance
   - Virtual Cloud Networks → Subnet
   - Security Lists → Default Security List
   - Add Ingress Rules:
     ```
     Protocol: TCP
     Source: 0.0.0.0/0
     Destination: Ports 80, 443, 3001
     ```

6. **Get Static IP (Optional)**
   - Reserved Public IPs
   - Create new reserved IP
   - Assign to your instance
   - Use this IP for DNS records

7. **Setup Domain (Optional)**
   - Buy domain from Route 53, Godaddy, Namecheap, etc.
   - Add A record pointing to your instance IP
   - Update Vercel `VITE_API_URL` to your domain

8. **Enable HTTPS**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   # Automatic renewal enabled
   ```

---

### Option C: Deploy Both (Recommended)

**Step-by-step:**

1. **Deploy Frontend to Vercel** (5 min)
   - Push code to GitHub
   - Import in Vercel
   - App is live

2. **Deploy Backend to Oracle EC2** (10 min)
   - Create instance
   - Run setup script
   - API is live

3. **Connect Them** (2 min)
   - Update `VITE_API_URL` in Vercel
   - Redeploy Vercel
   - Done!

---

## File Structure for Deployment

```
sk-code/
├── sk-coder-web/              # Frontend (Deploy to Vercel)
│   ├── public/
│   │   ├── USER_GUIDE.md      # User documentation
│   │   ├── PRIVACY_POLICY.md  # Privacy policy
│   │   └── TERMS_OF_SERVICE.md
│   ├── src/                   # React components
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vercel.json            # Vercel config
│
├── api-server/                # Backend (Deploy to Oracle EC2)
│   ├── src/
│   │   ├── app.ts            # Express app
│   │   ├── routes/           # API routes
│   │   └── lib/              # Utilities
│   ├── package.json
│   ├── tsconfig.json
│   └── build.mjs             # Build script
│
├── setup-backend.sh            # Automated backend setup
├── .env.example               # Environment variables template
├── DEPLOYMENT_STATUS.md       # Deployment checklist
├── FEATURES_GUIDE.md          # Feature documentation
└── FINAL_SUMMARY.md           # Project summary
```

---

## Environment Variables

### Frontend (.env in sk-coder-web)

```bash
# API endpoints
VITE_API_URL=https://api.skcoder.app

# GitHub OAuth
VITE_GITHUB_CLIENT_ID=abc123...
VITE_GITHUB_REDIRECT_URI=https://app.skcoder.app/auth/github

# Optional AI (user can provide their own)
VITE_OPENAI_API_KEY=sk-...
```

### Backend (.env in api-server)

```bash
# Runtime
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# External Services
PISTON_API_URL=https://emkc.org/api/v2
WANDBOX_API_URL=https://wandbox.org/api

# Storage
ORACLE_STORAGE_PATH=/mnt/storage
MAX_FILE_SIZE=52428800      # 50MB
MAX_EXECUTION_TIME=30000    # 30 seconds
CLEANUP_INTERVAL=259200000  # 72 hours
```

---

## Monitoring & Maintenance

### Check Backend Status

```bash
# SSH into instance
ssh -i key.pem ubuntu@instance-ip

# Check service status
sudo systemctl status sk-coder-api

# View logs
journalctl -u sk-coder-api -f

# Restart if needed
sudo systemctl restart sk-coder-api
```

### Monitor Performance

**Vercel Dashboard:**
- https://vercel.com/dashboard
- View deployments, logs, analytics

**Oracle Cloud Console:**
- https://console.oracle.com
- Monitor instance CPU, memory, disk usage

### Clean Up Old Data

The backend automatically deletes:
- Temp execution files older than 72 hours
- Runs every 24 hours
- See `CLEANUP_INTERVAL` in .env

### Update Code

**Frontend:**
```bash
git push origin main
# Vercel auto-deploys
```

**Backend:**
```bash
ssh -i key.pem ubuntu@instance-ip
cd /opt/sk-coder/api-server
git pull origin main
npm install
npm run build
sudo systemctl restart sk-coder-api
```

---

## Troubleshooting

### "API Connection Failed"

1. Check backend is running:
   ```bash
   curl https://your-api.com/health
   ```

2. Check firewall rules in Oracle Cloud Console

3. Verify API URL in Vercel environment variables

### "Cannot execute Python"

- Backend might be down
- Python runtime loads on first run (5-10s)
- Falls back to browser Pyodide automatically

### "Large file upload fails"

- Check `MAX_FILE_SIZE` in backend .env (default: 50MB)
- Increase if needed: `MAX_FILE_SIZE=104857600` (100MB)
- Restart backend: `sudo systemctl restart sk-coder-api`

### "Storage full"

- Check disk usage: `df -h`
- Check storage usage: `du -sh /mnt/storage`
- Old files auto-cleanup after 72 hours
- Manual cleanup: `rm -rf /mnt/storage/temp-*`

---

## Security Checklist

- ✅ Use HTTPS for all connections
- ✅ Enable firewall (restrict ports)
- ✅ Keep dependencies updated
- ✅ Set `NODE_ENV=production`
- ✅ Use strong secrets/tokens
- ✅ Enable audit logging
- ✅ Regular backups of user data
- ✅ Rate limiting on API endpoints

---

## Scaling Considerations

**If you grow beyond free tier:**

| Component | Free | Paid |
|-----------|------|------|
| Frontend | Vercel free (100GB BW) | Vercel Pro ($20/mo) |
| Backend | Oracle free tier (1GB RAM) | Oracle Compute ($10-50/mo) |
| Database | IndexedDB/localStorage | PostgreSQL (AWS/Oracle) |
| File Storage | /mnt/storage (50GB) | Oracle Storage (pennies/GB) |
| AI API | User's own key | $0.03-0.15/query |

---

## Cost Summary (Free Tier)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | FREE | 100GB/month bandwidth |
| Oracle EC2 | FREE | Always free, no CC required |
| Domain | $10-15/year | Optional (use IP initially) |
| Certbot SSL | FREE | Automatic renewal |
| **TOTAL** | **~$10/year** | Domain only |

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy frontend to Vercel (5 min)
3. ✅ Deploy backend to Oracle EC2 (15 min)
4. ✅ Connect frontend & backend
5. ✅ Test all features
6. ✅ Share with users

---

**Questions?** Check logs with:
```bash
# Frontend errors
Vercel Dashboard → Deployments → Logs

# Backend errors
journalctl -u sk-coder-api -f

# API health
curl https://your-api.com/health
```

---

**Happy deploying! 🚀**

*Last Updated: August 15, 2026*

# Bluetick — Complete Production Deployment Guide

**Version:** 2.1 (Includes Installation Wizard + VITE_API_URL Environment Setup)
**Stack:** Node.js + Express + PostgreSQL + React (Vite) + Socket.IO  
**Estimated Setup Time:** 20–40 minutes

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Server Preparation (Manual)](#2-server-preparation-manual)
3. [Database Setup — PostgreSQL (Manual)](#3-database-setup--postgresql-manual)
4. [Clone & Install Dependencies (Manual)](#4-clone--install-dependencies-manual)
5. [Environment Variables Architecture](#5-environment-variables-architecture)
6. [Start the Server](#6-start-the-server)
7. [Run the Installation Wizard (Graphical UI)](#7-run-the-installation-wizard-graphical-ui)
8. [Process Management with PM2](#8-process-management-with-pm2)
9. [Nginx Reverse Proxy Setup (Manual)](#9-nginx-reverse-proxy-setup-manual)
10. [SSL / HTTPS with Let's Encrypt (Manual)](#10-ssl--https-with-lets-encrypt-manual)
11. [Meta / WhatsApp Webhook Setup](#11-meta--whatsapp-webhook-setup)
12. [Keeping the App Updated](#12-keeping-the-app-updated)
13. [Troubleshooting](#13-troubleshooting)
14. [Security Hardening Checklist](#14-security-hardening-checklist)

---

> ## What the Wizard Handles vs. What Is Manual
>
> | Task | How |
> |---|---|
> | Node.js, Nginx, PostgreSQL installation | **Manual** (Steps 2–3) |
> | SSL certificate | **Manual** (Step 9) |
> | Nginx config file | **Manual** (Step 8) |
> | PM2 setup for auto-restart | **Manual** (Step 7) |
> | **All .env configuration** | ✅ **Wizard** |
> | **Admin account creation** | ✅ **Wizard** |
> | **App name, domain, WhatsApp, AI, SMTP** | ✅ **Wizard** |
> | **Database connection testing** | ✅ **Wizard** |

---

## 1. System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| **Operating System** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| **RAM** | 1 GB | 2 GB+ |
| **CPU** | 1 vCPU | 2 vCPU |
| **Disk Space** | 20 GB | 40 GB+ |
| **Node.js** | v18.x | v20.x (LTS) |
| **PostgreSQL** | 14 | 15 or 16 |
| **Nginx** | 1.18+ | Latest stable |

---

## 2. Server Preparation (Manual)

SSH into your server and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx && sudo systemctl start nginx

# Install PM2
sudo npm install -g pm2
```

---

## 3. Database Setup — PostgreSQL (Manual)

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql && sudo systemctl start postgresql

# Create DB and user
sudo -u postgres psql
```

Inside psql, run (**replace the password**):

```sql
CREATE DATABASE whatsapp_saas;
CREATE USER bluetick_user WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_saas TO bluetick_user;
\q
```

> Note the DB name, username, and password — you will enter them in the Installation Wizard.

---

## 4. Clone & Install Dependencies (Manual)

```bash
cd /var/www
git clone https://github.com/bitslabtech/bluetick.git
cd bluetick

# Install backend dependencies
cd server && npm install && cd ..

# Install frontend dependencies
cd client && npm install && cd ..
```

> ⚠️ **Do NOT run `npm run build` yet.** You must set the `VITE_API_URL` environment variable first (see Step 5 below) before building the frontend. Building without it will bake in a blank API URL.

---

## 5. Environment Variables Architecture

Bluetick uses **two separate, independent** environment configuration files. Understanding how they work together is critical for a successful deployment.

### How They Work

| File | Used By | When It's Read | Purpose |
|---|---|---|---|
| `client/.env` | Vite (React build tool) | **At build time** (`npm run build`) | Tells the browser where to send API requests |
| `server/.env` | Node.js (Express server) | **At runtime** (when server starts) | Stores secrets: DB password, API keys, JWT secret |

> **Key Insight:** These files are completely independent. The server cannot read the client's `.env`, and the client's `.env` is only used once during the build — after that the values are permanently baked into the compiled JavaScript.

### Step 5a — Configure the Frontend Environment Variable

Before building the React app, create the frontend `.env` file:

```bash
cd /var/www/bluetick/client
nano .env
```

Add the following line, replacing the URL with your actual backend API domain:

```env
# This tells the React frontend where your backend API server lives.
# If your frontend and backend are on the SAME domain (handled by Nginx),
# this should be your main domain URL.
VITE_API_URL=https://yourdomain.com
```

> **Important Notes:**
> - Do **not** add a trailing slash: `https://yourdomain.com` ✅ not `https://yourdomain.com/` ❌
> - If your API is on a subdomain (e.g. `api.yourdomain.com`), use that: `VITE_API_URL=https://api.yourdomain.com`
> - This value is **baked into the built JavaScript** at compile time. If you change it later, you must rebuild the frontend (`npm run build`) for it to take effect.

A reference template is also available at `client/.env.example`.

### Step 5b — Build the Frontend

Now that `VITE_API_URL` is set, build the React app:

```bash
cd /var/www/bluetick/client
npm run build
```

This creates the `client/dist/` folder containing your compiled, optimised static files ready to be served by Nginx.

### Step 5c — The Backend Environment Variable (`FRONTEND_URL`)

The backend needs to know your **frontend's domain** so it can correctly configure CORS (Cross-Origin Resource Sharing) — the security mechanism that controls which websites are allowed to talk to your API.

**You do not need to set this manually.** The Installation Wizard (Step 7) collects your frontend domain URL and automatically writes it as `FRONTEND_URL` into `server/.env` when you complete the wizard.

The backend uses it here in `server/index.js`:
```js
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
```

### Summary: What to set where

```
┌─────────────────────────────────────────────────────────────────┐
│  YOU SET MANUALLY (before build):                               │
│  client/.env  →  VITE_API_URL=https://yourdomain.com           │
│                                                                 │
│  WIZARD SETS AUTOMATICALLY (during setup):                      │
│  server/.env  →  FRONTEND_URL=https://yourdomain.com           │
│  server/.env  →  DB_NAME, DB_USER, DB_PASS, JWT_SECRET, etc.  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Start the Server

Start the server for the first time. It will run in "setup mode" since `server/.env` is not yet configured:

```bash
cd /var/www/bluetick/server
npm start
```

You should see the server start on port 5000. Leave this running (or use PM2 — see Step 8 to set that up first, then come back to the wizard).

---

## 7. Run the Installation Wizard (Graphical UI)

> ✅ This is the core of the new setup process. All backend configuration is done here — no terminal editing of `server/.env` files needed.

Open your browser and navigate to:

```
http://your-server-ip:5000/setup
```

> If you're using Nginx already: `https://yourdomain.com/setup`

### The wizard walks you through 7 steps:

| Step | What It Configures |
|---|---|
| **1. System Check** | Auto-validates Node.js version, memory, and file write permissions |
| **2. Database** | Enter DB host/port/name/user/password and click "Test Connection" |
| **3. Admin Account** | Creates the Superadmin user (name, email, phone, password) |
| **4. App Identity** | Set the app name and your **production frontend domain URL** |
| **5. WhatsApp / Meta** | Facebook App ID/Secret and Webhook Verify Token (auto-generated) |
| **6. AI & Email** | Gemini API key and SMTP email settings (both optional — can skip) |
| **7. Install** | Review summary and click "Install Bluetick" |

> ⚠️ **Step 4 — App Identity URL is critical.**
> The domain URL you enter here (e.g. `https://yourdomain.com`) is saved as `FRONTEND_URL` in `server/.env`.
> This is what the backend uses for CORS security — it must **exactly match** the domain your frontend is served from.
> It must also match the value you set as `VITE_API_URL` in `client/.env` (if both frontend and backend share the same domain via Nginx).

### What the Wizard writes to `server/.env` automatically:

```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com   # ← from your Step 4 input
DB_NAME=...                            # ← from your Step 2 input
DB_USER=...
DB_PASS=...
DB_HOST=...
DB_PORT=5432
JWT_SECRET=...                         # ← auto-generated (64-char hex)
WEBHOOK_VERIFY_TOKEN=...               # ← auto-generated
FB_CLIENT_ID=...                       # ← from your Step 5 input
FB_CLIENT_SECRET=...                   # ← from your Step 5 input
GEMINI_API_KEY=...                     # ← from your Step 6 input
SMTP_HOST=...                          # ← from your Step 6 input
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
SMTP_FROM_NAME=...                     # ← defaults to app name
APP_NAME=Bluetick                      # ← from your Step 4 input
SETUP_COMPLETE=true
```

### After the wizard completes:

1. `server/.env` is written automatically — no manual editing required.
2. The admin account is created in the database.
3. A **restart command** is shown on the success screen. Run it:

```bash
pm2 restart bluetick-api
# or if not using PM2 yet:
# CTRL+C and npm start again
```

4. The Webhook URL and Verify Token are shown — copy them for Step 11.

> **Security:** Once setup is complete, the `/api/setup` endpoints are permanently locked with a `403 Forbidden` response. The wizard cannot be run a second time.

---

## 8. Process Management with PM2

Run these commands to keep the server alive 24/7:

```bash
cd /var/www/bluetick/server
pm2 start index.js --name "bluetick-api"
pm2 save
pm2 startup   # Copy and run the command it prints
```

| Command | Action |
|---|---|
| `pm2 list` | See all processes |
| `pm2 logs bluetick-api` | View live logs |
| `pm2 restart bluetick-api` | Restart after config changes |

---

## 9. Nginx Reverse Proxy Setup (Manual)

```bash
sudo nano /etc/nginx/sites-available/bluetick
```

Paste this config (**replace `yourdomain.com`**):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/bluetick/client/dist;
    index index.html;

    # ── Gzip Compression ──────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml
        font/woff2;

    # ── Static Assets (JS/CSS/Fonts) — 1 year cache ──────────────────
    # Vite uses content-hash filenames (e.g. index-D_5H0q7x.js).
    # When you rebuild, the hash changes → browser auto-fetches new file.
    # This is why browser caching is SAFE — no stale data risk.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # ── Uploaded Media (Images/Files) — 7 day cache ──────────────────
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public";
    }

    # ── SPA Fallback ─────────────────────────────────────────────────
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── API Proxy (never cached by browser) ──────────────────────────
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 200M;

        # Prevent browser from caching API responses
        add_header Cache-Control "no-store, no-cache";
    }

    # ── WebSocket (Socket.IO) ────────────────────────────────────────
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # ── NFC Card Scan Redirect ───────────────────────────────────────
    location /n/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/bluetick /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 10. SSL / HTTPS with Let's Encrypt (Manual)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Choose option **2 (Redirect)** when prompted. Verify auto-renewal:

```bash
sudo certbot renew --dry-run
```

---

## 11. Meta / WhatsApp Webhook Setup

After the wizard completes, it shows you your Webhook URL and Verify Token.

1. Go to **developers.facebook.com** → Your App → WhatsApp → Configuration
2. Click **Edit** next to Webhook
3. Paste your **Webhook URL**: `https://yourdomain.com/api/webhook`
4. Paste your **Verify Token** (from the wizard success screen)
5. Click **Verify and Save**
6. Subscribe to: `messages`, `message_deliveries`, `message_reads`

> The Verify Token is stored in your `.env` as `WEBHOOK_VERIFY_TOKEN`. You can always view it there.

---

## 12. Keeping the App Updated

```bash
cd /var/www/bluetick
git pull origin master
cd server && npm install && cd ..
cd client && npm install && npm run build && cd ..
pm2 restart bluetick-api
```

> **Note:** The `client/.env` file with `VITE_API_URL` is **not tracked by git** (it's in `.gitignore`). After pulling updates, verify the file still exists before rebuilding:
> ```bash
> cat /var/www/bluetick/client/.env
> # Should output: VITE_API_URL=https://yourdomain.com
> ```
> If it's missing, recreate it before running `npm run build`.

---

## 13. Troubleshooting

| Problem | Fix |
|---|---|
| `502 Bad Gateway` | `pm2 restart bluetick-api` — check `pm2 logs` for error |
| `Cannot connect to database` | Verify credentials in `server/.env` match what you set up in PostgreSQL |
| `Wizard shows 503` | Server is not running — start it with `npm start` or `pm2 start` |
| `Wizard is locked (403)` | Setup already completed. Edit `server/.env` manually if you need to change settings |
| `CORS error in browser` | `FRONTEND_URL` in `server/.env` doesn't match your domain — fix and `pm2 restart` |
| `Page refresh shows 404` | Add `try_files $uri $uri/ /index.html;` to Nginx `location /` block |
| `Webhook fails verification` | `WEBHOOK_VERIFY_TOKEN` in `server/.env` must exactly match what's in Meta Dashboard |
| `API calls fail in production` | `client/.env` is missing or `VITE_API_URL` is wrong — recreate the file and run `npm run build` again |
| `AI Chatbot says "trouble connecting"` | `VITE_API_URL` in `client/.env` is pointing to localhost — update it to your production domain and rebuild |
| `App works locally but not in production` | `VITE_API_URL` was not set before building. Rebuild the frontend after setting it correctly in `client/.env` |

---

## 14. Security Hardening Checklist

```
Server:
[ ] UFW firewall enabled: sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
[ ] SSH key-based auth only (password login disabled)
[ ] PostgreSQL bound to localhost only

Environment Files:
[ ] client/.env  — contains VITE_API_URL (not secret, but must exist before building)
[ ] server/.env  — contains secrets (auto-written by Wizard; NEVER commit to git)
[ ] Both .env files are listed in .gitignore (verify before pushing)

Application (auto-configured by Wizard):
[x] JWT_SECRET is a randomly generated 64-char hex string
[x] WEBHOOK_VERIFY_TOKEN is a randomly generated 64-char hex string
[x] NODE_ENV=production
[x] FRONTEND_URL is set for CORS security
[ ] HTTPS enforced (Certbot redirect active)

Post-Setup (Superadmin Dashboard):
[ ] Set minimum password length ≥ 8 characters
[ ] Disable public registration if running a closed platform
[ ] Configure cloud storage (S3) for scalable file uploads
[ ] Set up daily PostgreSQL backups
```

---

## Quick Reference

| Item | Value |
|---|---|
| **Backend Port** | 5000 |
| **Frontend Build** | `client/dist/` |
| **PM2 Process** | `bluetick-api` |
| **Nginx Config** | `/etc/nginx/sites-available/bluetick` |
| **Setup Wizard URL** | `http://your-ip:5000/setup` or `https://yourdomain.com/setup` |
| **Superadmin Dashboard** | `/superadmin` |
| **Webhook URL** | `https://yourdomain.com/api/webhook` |
| **Server Logs** | `pm2 logs bluetick-api` |
| **Crash Logs** | `server/crash.log` |
| **Winston Logs** | `server/logs/` (daily rotated) |

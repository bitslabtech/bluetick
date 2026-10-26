# Domain Migration Guide: `bluetick.cloud` → `onedash.cloud`

> [!IMPORTANT]
> **Code changes are already done.** All hardcoded domains have been replaced with env vars, and `APP_URL` has been combined into `FRONTEND_URL` with automatic backward-compatible fallbacks.
> This guide is purely about what to update in **Coolify environment variables, external dashboards, and DNS**.

---

## Quick Overview — All Services That Need Changes

| # | Service | What needs updating | Priority |
|---|---------|---------------------|----------|
| 1 | **Coolify** (your server) | Env vars (server + client build args) | 🔴 Critical |
| 2 | **Meta / Facebook Developer App** | OAuth redirect URI + Webhook callback URL | 🔴 Critical |
| 3 | **Cloudflare DNS** | A/CNAME records for all subdomains | 🔴 Critical |
| 4 | **Cloudflare for SaaS** | Zone ID linked to new domain | 🔴 Critical |
| 5 | **Cloudflare Turnstile** | Allowed domains list | 🟠 High |
| 6 | **Cloudflare R2** | CORS allowed origins | 🟠 High |
| 7 | **PhonePe** | Redirect URL (`onedash.cloud`) + Callback URL (`api.onedash.cloud`) | 🟠 High |
| 8 | **Razorpay** | Webhook URL (`api.onedash.cloud`) | 🟡 Medium |
| 9 | **DNS Registrar** | Point `onedash.cloud` nameservers to Cloudflare | 🔴 Critical |

---

## 1. 🖥️ Coolify — Environment Variables

### Backend (Server) Environment Variables

Here is your exact merged list for the backend container. Only the domain-specific values change or are newly added; all your database, Redis, JWT, and third-party secrets remain intact:

```env
NIXPACKS_NODE_VERSION=22
PORT=5000
NODE_ENV=production

# Database
DB_HOST=c10lsv94o
DB_PORT=5432
DB_NAME=whatsapp_saas
DB_USER=bluetick_user
DB_PASS=eG6ld8LHcem

# App & Domain Settings (UPDATED / CLEANED)
APP_NAME=OneDash
FRONTEND_URL=https://onedash.cloud
VITE_API_URL=https://api.onedash.cloud
PLATFORM_DOMAIN=onedash.cloud
ROUTER_HOSTNAME=router.onedash.cloud
CDN_HOST=cdn.onedash.cloud

# Auth & Security
JWT_SECRET=f7d98b4c2a
WEBHOOK_VERIFY_TOKEN=a1b2
SETUP_COMPLETE=true
TURNSTILE_SECRET_KEY=0x4AAAAAA

# Meta / WhatsApp
FB_CLIENT_ID=1390210586190723
FB_CLIENT_SECRET=47db1e632
WA_REGISTRATION_PIN=805609

# AI & Cache
GEMINI_API_KEY=AQ.Ab8RN6JB
REDIS_URL=redis://default:Vg1TMc9HCOPLTF0o4etvm83H86wjK3TxwUgEf4CKc2bfriDWNggAdm3w

# Cloudflare for SaaS (UPDATE ZONE ID FOR ONEDASH)
CLOUDFLARE_ZONE_ID=<new_zone_id_of_onedash_from_cloudflare>
CLOUDFLARE_API_TOKEN=cfut_3MQ
```

> **Summary of Backend Changes:**
> - `FRONTEND_URL` updated to `https://onedash.cloud` (Used for CORS whitelist, store buyer redirects, and email links).
> - `VITE_API_URL=https://api.onedash.cloud` added to backend env (Used for PhonePe server callbacks, storage, and self-referencing APIs).
> - **`APP_URL` is no longer required** — the code now automatically uses `FRONTEND_URL` for storefront links and `VITE_API_URL` for server callbacks. *(Existing `APP_URL` values are still supported in code as a fallback so nothing breaks).*
> - `PLATFORM_DOMAIN=onedash.cloud` added (used for CORS and domain detection).
> - `ROUTER_HOSTNAME=router.onedash.cloud` added (merchant CNAME target).
> - `CDN_HOST=cdn.onedash.cloud` added (image proxy).
> - `CLOUDFLARE_ZONE_ID` replaced with the new Zone ID of `onedash.cloud`.
> - `APP_NAME` updated to `OneDash` (or keep your preferred display name).

---

### Frontend (Client) Environment Variables

Here is your exact merged list for the frontend build arguments:

```env
NIXPACKS_NODE_VERSION=22

# API Server Connection (Express backend container)
VITE_API_URL=https://api.onedash.cloud

# Platform & Store Routing
VITE_PLATFORM_DOMAIN=onedash.cloud
VITE_ROUTER_HOSTNAME=router.onedash.cloud

# Cloudflare Turnstile & Facebook Embedded Signup
VITE_TURNSTILE_SITE_KEY=0x4AAAA
VITE_FB_APP_ID=139021058619
VITE_FB_CONFIG_ID=104375096
```

> **Frontend Variable Reference:**
> - `VITE_API_URL`: Points to your Express API container (`https://api.onedash.cloud`). Used by Axios/fetch for all dashboard and store data requests.
> - `VITE_PLATFORM_DOMAIN`: Root domain (`onedash.cloud`). Used by the client-side router to detect whether a visitor is on the main dashboard or a merchant custom store.
> - `VITE_ROUTER_HOSTNAME`: CNAME target shown in the merchant store settings UI (`router.onedash.cloud`).

> [!TIP]
> **Buildtime vs Runtime in Coolify:**
> Since you have **"Available at buildtime"** enabled in Coolify, Vite reads these variables when compiling the JavaScript bundle (`npm run build`).
> **Important:** Anytime you change any `VITE_*` variable, you **MUST click Redeploy** in Coolify. Static React/Vite builds inject variables into the compiled `.js` files only at build time.

---

## 2. 📘 Meta / Facebook Developer App

Your app uses Facebook for:
- **WhatsApp Embedded Signup** (OAuth flow)  
- **WhatsApp Cloud API Webhook** (incoming messages)

### A — OAuth / Login Settings

Go to: [developers.facebook.com](https://developers.facebook.com) → Your App → **Facebook Login** → **Settings**

Update **Valid OAuth Redirect URIs**:
```
# Remove:
https://bluetick.cloud/api/auth/facebook/callback
https://bluetick.cloud/api/auth/callback

# Add:
https://onedash.cloud/api/auth/facebook/callback
https://onedash.cloud/api/auth/callback
```

### B — WhatsApp > Configuration > Webhook

Go to: Your App → **WhatsApp** → **Configuration** → **Webhook**

| Field | Old value | New value |
|-------|-----------|-----------|
| Callback URL | `https://api.bluetick.cloud/api/webhook` | `https://api.onedash.cloud/api/webhook` |
| Verify Token | *(unchanged — same value from env)* | *(unchanged)* |

**Steps:**
1. Click **Edit** next to the Webhook URL
2. Enter `https://api.onedash.cloud/api/webhook`
3. Enter your `WEBHOOK_VERIFY_TOKEN` (same value, unchanged)
4. Click **Verify and Save**
5. Confirm all subscribed fields are still ticked (messages, message_reactions, etc.)

### C — App Domains (Basic Settings)

Go to: Your App → **Settings** → **Basic**

Update **App Domains**:
```
# Remove: bluetick.cloud
# Add:    onedash.cloud
```

---

## 3. 🌐 DNS Registrar — Point Domain to Cloudflare

> **Q: Where to get the exact nameservers? Can I reuse Bluetick's nameservers?**  
> **Answer:** **No, do NOT assume or reuse Bluetick's nameservers without checking Cloudflare.**  
> Cloudflare assigns specific nameserver pairs per domain. While they might occasionally match if created on the same account, you must follow the steps below to see the exact pair Cloudflare assigns to `onedash.cloud`.

### Steps to get your exact Cloudflare Nameservers:
1. Log into [dash.cloudflare.com](https://dash.cloudflare.com).
2. Click **Add a domain** (or **Add site** in the top navigation).
3. Enter `onedash.cloud` and click **Continue**.
4. Select the **Free** plan (scroll down to the bottom) and click **Continue**.
5. Cloudflare will scan for existing DNS records. Click **Continue**.
6. Cloudflare will display a page titled **"Change your nameservers"**:
   - It will show:
     ```text
     Remove these nameservers: (your current registrar default nameservers)
     Add Cloudflare's nameservers:
       1. <assigned-name-1>.ns.cloudflare.com
       2. <assigned-name-2>.ns.cloudflare.com
     ```
7. Log into your domain registrar (GoDaddy, Namecheap, Hostinger, Spaceship, etc.):
   - Open domain management for `onedash.cloud` → **DNS** / **Nameservers**.
   - Switch from "Default / Registrar DNS" to **Custom Nameservers**.
   - Enter the two exact nameservers Cloudflare gave you in step 6.
   - Save changes.

---

## 4. ☁️ Cloudflare DNS — Add Records for `onedash.cloud`

> **Q: In Cloudflare DNS, do I enter `onedash.cloud` or `@`?**  
> **Answer:** In Cloudflare, **`@` is standard DNS shorthand for the root domain (`onedash.cloud`)**.
> - When adding the root record in Cloudflare: In the **Name** field, simply type `@`. Cloudflare will automatically treat it as `onedash.cloud`. (You can also type `onedash.cloud` directly; Cloudflare accepts both identically).
> - **Never** type `"onedash.cloud (or @)"` literally.

Go to: [dash.cloudflare.com](https://dash.cloudflare.com) → `onedash.cloud` → **DNS** → **Records**

Add the following records (replace `YOUR_SERVER_IP` with your Coolify server's public IP address):

| Type | Name | Content (IPv4 Address) | Proxy Status | Description |
|------|------|------------------------|--------------|-------------|
| `A` | `@` | `YOUR_SERVER_IP` | 🟧 Proxied | Main web app (`https://onedash.cloud`) |
| `A` | `www` | `YOUR_SERVER_IP` | 🟧 Proxied | WWW redirect (`https://www.onedash.cloud`) |
| `A` | `api` | `YOUR_SERVER_IP` | 🟧 Proxied | Backend API & Webhook (`https://api.onedash.cloud`) |
| `A` | `router` | `YOUR_SERVER_IP` | 🟧 Proxied | Merchant CNAME target (`router.onedash.cloud`) |
| `A` | `staging` | `YOUR_SERVER_IP` | 🟧 Proxied | Staging environment (`staging.onedash.cloud`) |

*(Note: For `cdn.onedash.cloud`, see Section 7 below — it is managed directly via Cloudflare R2 Custom Domain).*

---

## 5. ☁️ Cloudflare for SaaS — Custom Hostnames Zone

> **Q: Will a new Zone ID be generated, or can I use the old Zone ID and API token? How to edit?**  
> **Answer:**
> - **Zone ID: MUST BE CHANGED.** Every domain in Cloudflare has its own unique 32-character Zone ID. `bluetick.cloud` and `onedash.cloud` have different Zone IDs. If you keep the old Zone ID, your server will try to issue SSL certificates under Bluetick instead of OneDash!
> - **API Token: CAN BE REUSED** if the token was created with Account-level permissions (e.g. "All zones in account"). If it was scoped strictly to "bluetick.cloud", edit the token in Cloudflare to include `onedash.cloud`.

### Step-by-Step Setup for `onedash.cloud`:

1. **Find the new Zone ID:**
   - In Cloudflare, select `onedash.cloud`.
   - On the **Overview** page, scroll down the right-hand column to the **API** section.
   - Copy the **Zone ID** string.
   - Paste this into your Coolify server environment as `CLOUDFLARE_ZONE_ID`.

2. **Enable Cloudflare for SaaS on `onedash.cloud`:**
   - In the left sidebar for `onedash.cloud`, go to **SSL/TLS** → **Custom Hostnames**.
   - Click **Enable Cloudflare for SaaS** (100 free custom hostnames included).
   - Enter `router.onedash.cloud` as your **Fallback Origin** and click **Add Fallback Origin**.

3. **Check API Token Permissions:**
   - Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens).
   - Find your API token (matching `CLOUDFLARE_API_TOKEN`).
   - Click **Edit**. Under **Zone Resources**, ensure either **All zones** or `onedash.cloud` is included with permissions:
     - `Zone` → `Zone` → `Read`
     - `Zone` → `Custom Hostnames (SSL)` → `Edit`

---

## 6. 🛡️ Cloudflare Turnstile (CAPTCHA)

Your app uses Turnstile on login/register forms. Turnstile widgets are domain-locked.

Go to: [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile** → Select your widget

**Steps:**
1. Find your existing Turnstile widget (the one whose site key is in `VITE_TURNSTILE_SITE_KEY`).
2. Click **Settings** / **Edit**.
3. Under **Allowed Domains / Hostnames**, add:
   ```
   onedash.cloud
   staging.onedash.cloud
   ```
4. You can keep `bluetick.cloud` during migration or remove it.
5. Click **Save**.

> [!NOTE]
> The site key (`VITE_TURNSTILE_SITE_KEY`) and secret key (`TURNSTILE_SECRET_KEY`) **do not need to change** — only the allowed domains list inside the Turnstile dashboard needs to include the new domain.

---

## 7. ☁️ Cloudflare R2 (File Storage / CDN)

> **Q: Explain "must have a CNAME in Cloudflare DNS pointing to the R2 bucket URL" in brief.**  
> **Explanation in brief:**
> 1. By default, Cloudflare R2 gives your bucket an unbranded URL like `pub-xxxxxxxxxxxx.r2.dev`.
> 2. To serve store images under your own brand (`https://cdn.onedash.cloud/uploads/image.png`), you connect a Custom Domain to the bucket.
> 3. Cloudflare does this automatically with 1 click:
>    - Go to **R2** → Select your bucket → **Settings** tab.
>    - Scroll to **Public Access** → Click **Connect Domain** under **Custom Domains**.
>    - Enter: `cdn.onedash.cloud` and click **Continue** → **Connect Domain**.
>    - Cloudflare **automatically creates the CNAME DNS record** in your `onedash.cloud` DNS zone pointing to the bucket! You do not need to look up or manually write the bucket URL.

### Update Bucket CORS Policy:
In the same bucket **Settings** → **CORS Policy**, update the allowed origins to include OneDash:

```json
[
  {
    "AllowedOrigins": [
      "https://onedash.cloud",
      "https://www.onedash.cloud",
      "https://staging.onedash.cloud",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 8. 💳 PhonePe Payment Gateway

PhonePe requires exact redirect and callback URLs to be whitelisted in their merchant dashboard.

Your code at `wastore.js` uses:
```js
// Browser redirect (to frontend store):
redirectUrl: `${process.env.FRONTEND_URL || process.env.APP_URL}/store/${store.slug}/verify?order=${order.orderNumber}`

// Server-to-server webhook callback (to backend API):
callbackUrl: `${process.env.VITE_API_URL || process.env.APP_URL || process.env.FRONTEND_URL}/api/wastore/public/${store.slug}/phonepe-callback`
```

Go to: [PhonePe Business Dashboard](https://business.phonepe.com) → Your integration → **Webhook / Callback Settings**

| Field | New value | Description |
|-------|-----------|-------------|
| Redirect URL pattern | `https://onedash.cloud/*` | Buyer browser return after payment |
| Callback URL | `https://api.onedash.cloud/api/wastore/public/*/phonepe-callback` | Backend server payment notification |

> [!WARNING]
> Without whitelisting, PhonePe will reject the callback URL and payments will appear stuck even after the customer pays. Notice that the callback URL targets `api.onedash.cloud` where your backend API lives.

---

## 9. 💳 Razorpay Webhook

Razorpay uses an in-page modal popup inside the storefront for purchases, so it does not require a browser redirect URL. It only requires your webhook endpoint for server verification.

Go to: [Razorpay Dashboard](https://dashboard.razorpay.com) → **Account & Settings** → **Webhooks**

**Steps:**
1. Click **Edit** on your existing webhook
2. Update **Webhook URL**:
   ```
   # Old: https://api.bluetick.cloud/api/wastore/public/razorpay-webhook
   # New: https://api.onedash.cloud/api/wastore/public/razorpay-webhook
   ```
3. The **Webhook Secret** stays the same
4. Click **Save**

---

## Staging-Specific Setup

For `staging.onedash.cloud`, you need a **separate Coolify service** (separate deployment pointing to the same codebase but different env):

```env
# Staging server env
PLATFORM_DOMAIN=onedash.cloud         ← same root domain
FRONTEND_URL=https://staging.onedash.cloud
VITE_API_URL=https://api.onedash.cloud # or staging-api.onedash.cloud

# Staging client build args
VITE_PLATFORM_DOMAIN=onedash.cloud    ← same root domain
VITE_API_URL=https://api.onedash.cloud # or staging-api.onedash.cloud
```

Staging is automatically recognized as a platform subdomain — no code changes or extra third-party configs needed (except adding `staging.onedash.cloud` to Turnstile's allowed domains list).

---

## Migration Checklist

```
[ ] 1. Coolify — update server env vars (FRONTEND_URL, VITE_API_URL, PLATFORM_DOMAIN, ROUTER_HOSTNAME, CDN_HOST)
[ ] 2. Coolify — update client build arguments (VITE_API_URL, VITE_PLATFORM_DOMAIN, VITE_ROUTER_HOSTNAME) + redeploy
[ ] 3. DNS Registrar — point onedash.cloud nameservers to Cloudflare
[ ] 4. Cloudflare — add DNS records (A records for @, www, api, cdn, router, staging)
[ ] 5. Cloudflare for SaaS — get new Zone ID, update CLOUDFLARE_ZONE_ID in Coolify
[ ] 6. Cloudflare Turnstile — add onedash.cloud + staging.onedash.cloud to allowed domains
[ ] 7. Cloudflare R2 — update CORS policy + custom domain on bucket
[ ] 8. Meta Developer App — update Webhook callback URL (https://api.onedash.cloud/api/webhook)
[ ] 9. Meta Developer App — update OAuth redirect URIs (https://onedash.cloud/api/auth/callback)
[ ] 10. Meta Developer App — update App Domains (Basic Settings: onedash.cloud)
[ ] 11. PhonePe — whitelist redirect (onedash.cloud) and callback (api.onedash.cloud)
[ ] 12. Razorpay — update webhook endpoint URL (api.onedash.cloud)
[ ] 13. Test login flow end-to-end on onedash.cloud
[ ] 14. Test WhatsApp message delivery (webhook working)
[ ] 15. Test a payment on a store (PhonePe + Razorpay)
[ ] 16. Test a merchant custom domain still resolves to their store
```

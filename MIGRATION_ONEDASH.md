# OneDash Migration Guide
Rebrand: bluetick / bluetick.cloud to onedash / onedash.cloud
Last updated: 2026-10-23

---

## Progress Overview

| # | Section | Status |
|---|---------|--------|
| 1 | Critical Frontend Code | DONE |
| 2 | Backend Server Code | Pending |
| 3 | Brand Names, Defaults & AI Prompts | Pending |
| 4 | Environment Variables & Coolify | Pending |
| 5 | Third-Party Services | Pending |
| 6 | Database Records | Pending |

---

## SECTION 1 - Critical Frontend Code
Status: COMPLETE - Build verified

| File | Change |
|------|--------|
| client/src/utils/platformDomain.js | NEW FILE - auto-derives platform domain from VITE_API_URL |
| client/src/App.jsx | Use isPlatformDomain() instead of hardcoded bluetick.cloud check |
| client/src/utils/storeRouting.js | Use isPlatformDomain() instead of hardcoded domain list |
| client/src/pages/WaStoreManager/WaStoreSettings.jsx | CNAME target router.bluetick.cloud -> {CNAME_TARGET} (auto-derived) |
| client/src/pages/WaStoreManager/ShippingLabelGenerator.js | Store URL fallback bluetick.cloud -> {PLATFORM_HOST} (auto-derived) |
| client/src/pages/WaStoreManager/ShippingLabelModal.jsx | Same as above + CDN check cdn.bluetick.cloud -> {CDN_HOST} |
| server/routes/imgProxy.js | CDN_HOST reads from env var instead of hardcoded cdn.bluetick.cloud |
| cloudflare-worker/custom-domain-worker.js | Bypass + backend URL read from PLATFORM_DOMAIN / BACKEND_URL env vars |

---

## SECTION 2 - Backend Server Code

### server/index.js
| Line | What to change |
|------|---------------|
| 348 | 'Bluetick Backend Running (PostgreSQL)' -> 'OneDash Backend Running (PostgreSQL)' |
| 404 | const CDN_HOST = 'cdn.bluetick.cloud' -> read from process.env.CDN_HOST or derive from FRONTEND_URL |
| 543-544 | PLATFORM_HOSTS set: replace 'bluetick.cloud', 'www.bluetick.cloud' -> derive from process.env.FRONTEND_URL |
| 554 | Comment: api.bluetick.cloud -> platform API |

### server/routes/wastore.js
| Line | What to change |
|------|---------------|
| 49 | Comment: bluetick.cloud -> onedash.cloud |
| 1781 | blockedDomains: replace 'bluetick.cloud', 'www.bluetick.cloud' -> derive from process.env.FRONTEND_URL |
| 1854 | validTargets: replace 'router.bluetick.cloud' -> process.env.CNAME_TARGET or derive from FRONTEND_URL |
| 1855 | displayTarget: same as above |
| 1859 | dns.resolve4('router.bluetick.cloud') -> use derived routerHost variable |

### server/routes/whatsappAuth.js
| Line | What to change |
|------|---------------|
| 262 | 'Bluetick_API_SysUser' -> 'OneDash_API_SysUser' |

### server/middleware/csrf.js
| Line | What to change |
|------|---------------|
| 45 | Comment: api.bluetick.cloud -> platform API |

### server/.env.example
| Line | What to change |
|------|---------------|
| 2 | Bluetick - Server Environment Variables Template -> OneDash - Server Environment Variables Template |
| 18 | DB_USER=bluetick_user -> DB_USER=onedash_user |
| 39-40 | Comments: Bluetick -> OneDash |
| 54-55 | Comments: bluetick.cloud -> onedash.cloud |

---

## SECTION 3 - Brand Names, Defaults & AI Prompts

| File | Line(s) | What to change |
|------|---------|---------------|
| server/models/Settings.js | 29 | defaultValue: 'Bluetick' -> 'OneDash' |
| server/models/SystemConfig.js | 75 | appName: 'Bluetick' -> 'OneDash' |
| server/models/LandingPage.js | 56, 58, 89 | name, footerText, title: Bluetick -> OneDash |
| server/models/WaStore.js | 111 | Comment: Bluetick.cloud -> OneDash.cloud |
| server/routes/auth.js | 103, 260, 367 | || 'Bluetick' -> || 'OneDash' |
| server/routes/setup.js | 241-242 | || 'Bluetick' -> || 'OneDash' |
| server/routes/settings.js | 71, 85, 97 | 'Bluetick' -> 'OneDash' |
| server/routes/settings.js | 807, 812 | 'bluetick_test_msg' -> 'onedash_test_msg'; message text Bluetick -> OneDash |
| server/routes/settings.js | 849-873 | All bluetick_test_msg -> onedash_test_msg |
| server/routes/settings.js | 1014 | 'SMTP Connection Test - Bluetick' -> 'SMTP Connection Test - OneDash' |
| server/routes/vcards.js | 110, 112 | 'Bluetick' -> 'OneDash' |
| server/routes/system.js | 715-716, 829-830 | AI prompt: Bluetick -> OneDash (4 occurrences) |
| server/routes/ctwa.js | 650, 695 | 'BlueTick-CAPI-Test/1.0' / 'BlueTick-CAPI/1.0' -> OneDash-CAPI-Test/1.0 / OneDash-CAPI/1.0 |
| server/routes/privacy.js | 6, 40 | URL and badge text: Bluetick -> OneDash |
| server/utils/inactivityNotifier.js | 151 | 'https://app.bluetick.com' -> 'https://onedash.cloud' |
| client/index.html | title + preconnect hrefs | Bluetick -> OneDash; api/cdn.bluetick.cloud -> api/cdn.onedash.cloud |
| client/public/llms.txt | All lines | bluetick.cloud -> onedash.cloud |

---

## SECTION 4 - Environment Variables & Coolify

### Client Container (Coolify)
| Variable | New Value |
|----------|-----------|
| VITE_API_URL | https://api.onedash.cloud |
| VITE_TURNSTILE_SITE_KEY | New key if Turnstile widget recreated |
| Domain | onedash.cloud or app.onedash.cloud |

### Server Container (Coolify)
| Variable | New Value |
|----------|-----------|
| FRONTEND_URL | https://onedash.cloud |
| APP_URL | https://onedash.cloud |
| CDN_HOST | cdn.onedash.cloud |
| CNAME_TARGET | router.onedash.cloud |
| CLOUDFLARE_ZONE_ID | Zone ID of onedash.cloud from Cloudflare Dashboard -> Overview |
| CLOUDFLARE_API_TOKEN | Confirm token has permissions for onedash.cloud zone |
| Domain | api.onedash.cloud |

### Cloudflare Worker
| Variable | New Value |
|----------|-----------|
| BACKEND_URL | https://onedash.cloud |
| PLATFORM_DOMAIN | onedash.cloud |

---

## SECTION 5 - Third-Party Services

### Meta for Developers - developers.facebook.com -> Your App
| Where | What to do |
|-------|-----------|
| Settings -> Basic -> App Domains | Add onedash.cloud |
| Settings -> Basic -> Privacy Policy URL | https://onedash.cloud/privacy |
| Settings -> Basic -> Terms of Service URL | https://onedash.cloud/terms |
| Facebook Login for Business -> Valid OAuth Redirect URIs | Add https://api.onedash.cloud/api/whatsapp/embedded-signup/callback |
| WhatsApp -> Configuration -> Webhook Callback URL | https://api.onedash.cloud/api/whatsapp/webhook -> click Verify and Save |

### Cloudflare - dash.cloudflare.com -> onedash.cloud
| Where | What to do |
|-------|-----------|
| DNS | Add A records: @, www, api, app -> VPS IP (Proxied ON) |
| DNS | Add A record: router -> VPS IP (DNS Only OFF) |
| DNS | Add A record: cdn -> VPS/storage IP (Proxied ON) |
| SSL/TLS -> Custom Hostnames | Set Fallback Origin: router.onedash.cloud |
| Turnstile -> your widget -> Allowed Hostnames | Add onedash.cloud |

### Google OAuth - console.cloud.google.com -> Credentials
| Where | What to do |
|-------|-----------|
| Authorized JS Origins | Add https://onedash.cloud |
| Authorized Redirect URIs | Add https://api.onedash.cloud/api/auth/google/callback |

### Email / SMTP
| Where | What to do |
|-------|-----------|
| DNS | Add SPF, DKIM, DMARC records for onedash.cloud from email provider |
| App Admin Settings | Update sender address to support@onedash.cloud |

---

## SECTION 6 - Database

Run after server migration. Back up DB first.

UPDATE settings SET "appName" = 'OneDash' WHERE "appName" = 'Bluetick';

UPDATE system_configs SET settings = jsonb_set(settings, '{appName}', '"OneDash"')
WHERE settings->>'appName' = 'Bluetick';

UPDATE landing_pages SET name = 'OneDash' WHERE name = 'Bluetick';

UPDATE landing_pages SET "footerText" = '2025 OneDash. All rights reserved.'
WHERE "footerText" LIKE '%Bluetick%';

UPDATE wa_stores SET "footerText" = REPLACE("footerText", 'Bluetick', 'OneDash')
WHERE "footerText" LIKE '%Bluetick%';

---

## Audit Command (check remaining references)

Run in project root (PowerShell):

Get-ChildItem -Recurse -Include "*.js","*.jsx","*.ts","*.tsx","*.html","*.json" |
  Where-Object { $_.FullName -notmatch 'node_modules|\.git|dist|build|MIGRATION' } |
  Select-String -Pattern 'bluetick' -CaseSensitive:$false |
  Select-Object Filename, LineNumber, Line

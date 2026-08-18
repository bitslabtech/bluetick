/**
 * Bluetick - Custom Domain Cloudflare Worker
 * ============================================
 * Architecture: Long-Term Custom Domain Solution
 *
 * HOW IT WORKS:
 * 1. A customer visits https://www.amardryfruits.in (the store owner's domain)
 * 2. DNS for amardryfruits.in is proxied through Cloudflare (orange cloud)
 * 3. This Worker intercepts the request BEFORE it reaches any server
 * 4. The Worker rewrites the Host header to api.bluetick.cloud (bypasses Coolify/Traefik host matching)
 * 5. The Worker adds X-Forwarded-Host: www.amardryfruits.in (so our Node.js app knows the real domain)
 * 6. Node.js reads X-Forwarded-Host, looks up the store, and serves SSR HTML
 *
 * SETUP INSTRUCTIONS:
 * -----------------------------------------------------------------
 * STEP 1 - Create the Worker
 *   1. Go to dash.cloudflare.com - Workers and Pages - Create Application - Create Worker
 *   2. Name it: "bluetick-custom-domain-router"
 *   3. Replace the default code with this file's contents
 *   4. Click Deploy
 *
 * STEP 2 - Add Environment Variable
 *   - Workers - Your Worker - Settings - Variables
 *   - Add: BACKEND_URL = https://bluetick.cloud  (your FRONTEND URL, NOT the API URL)
 *
 * STEP 3 - Assign Custom Domains to the Worker
 *   Option A (Recommended - "Cloudflare for SaaS"):
 *     - Use Cloudflare for SaaS to let each store owner add their own domain
 *     - Free tier: up to 100 custom hostnames
 *     - Docs: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
 *
 *   Option B (Manual - for testing):
 *     - Workers - Your Worker - Settings - Domains and Routes - Add Route
 *     - Route pattern: *.amardryfruits.in/* (customer's domain)
 *     - Zone: amardryfruits.in
 *
 * STEP 4 - For each customer domain:
 *   - Customer adds CNAME at their registrar: www to bluetick.cloud
 *   - Or with Cloudflare for SaaS: automated via API
 * -----------------------------------------------------------------
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originalHost = url.hostname; // e.g., "www.amardryfruits.in"

    // IMPORTANT: Bypass the worker for our main system domains!
    // If we don't do this, the worker will intercept requests to the backend
    // and cause an infinite loop (Error 522 or 1000).
    if (originalHost.endsWith('bluetick.cloud')) {
      return fetch(request);
    }

    // Target Backend - set via Worker environment variable BACKEND_URL
    // IMPORTANT: This MUST point to your FRONTEND URL (e.g., https://bluetick.cloud) 
    // where your React app is hosted, NOT your API backend!
    const backendUrl = env.BACKEND_URL || 'https://bluetick.cloud';
    const backendHostname = new URL(backendUrl).hostname;

    // Rewrite the target URL
    url.hostname = backendHostname;
    url.port = '';
    url.protocol = 'https:';

    // Build the forwarded request with corrected headers
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', backendHostname);
    newHeaders.set('X-Forwarded-Host', originalHost);
    newHeaders.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
    newHeaders.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    newHeaders.set('X-Forwarded-Proto', 'https');

    const proxyRequest = new Request(url.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow',
    });

    try {
      const response = await fetch(proxyRequest);

      // Fix response headers
      const responseHeaders = new Headers(response.headers);

      // Rewrite any Location redirect headers back to the customer's domain
      const location = responseHeaders.get('Location');
      if (location && location.includes(backendHostname)) {
        responseHeaders.set('Location', location.replace(backendHostname, originalHost));
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(
        '<!DOCTYPE html><html><head><title>Temporarily Unavailable</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}.card{background:white;padding:2rem 2.5rem;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:420px}h1{color:#1e293b;font-size:1.5rem;margin:0 0 .5rem}p{color:#64748b;font-size:.95rem;margin:0}</style></head><body><div class="card"><h1>Store Temporarily Unavailable</h1><p>We are having trouble reaching this store. Please try again in a few minutes.</p></div></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  },
};

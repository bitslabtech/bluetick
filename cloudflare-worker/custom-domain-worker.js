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
 * STEP 2 - Add Environment Variables
 *   - Workers - Your Worker - Settings - Variables
 *   - BACKEND_URL       = https://onedash.cloud        (required — your platform's root URL)
 *   - EXTRA_BYPASS_DOMAINS = bluetick.cloud            (optional — comma-separated legacy/whitelabel
 *                                                        domains to also bypass. E.g. if you had a
 *                                                        previous domain or run a whitelabel tenant,
 *                                                        add their root domains here. All subdomains
 *                                                        of each listed domain are auto-bypassed.)
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
 *   - Customer adds CNAME at their registrar: www to router.onedash.cloud (or your ROUTER_HOSTNAME)
 *   - Or with Cloudflare for SaaS: automated via API
 * -----------------------------------------------------------------
 */

// ─────────────────────────────────────────────────────────────────────────────
// STORE SEO (title / description / canonical / Open Graph / JSON-LD)
// ─────────────────────────────────────────────────────────────────────────────
// The storefront is a static React app, so the HTML every crawler (Google, WhatsApp,
// Facebook link previews) receives carries the generic OneDash tags. This section swaps
// them for the store's own tags on the way out, using the store's public API.
//
// Safe by design — it never makes a page worse than it was:
//   * only GET requests whose response is a 200 HTML page are touched
//   * any failure (API down, store not found, timeout, bad data) returns the original page
//   * store details are cached at the edge, so the API sees ~1 request / store / 5 minutes
//   * kill switch: set the Worker variable SEO_REWRITE = off and redeploy
//   * optional Worker variable API_URL overrides the API base (default https://api.<root domain>)

const SEO_CACHE_TTL = 300;      // seconds a store's details are cached
const SEO_MISS_TTL = 60;        // seconds an unknown store is remembered
const SEO_FETCH_TIMEOUT = 2500; // ms to wait for the API before serving the page untouched

const escHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const safeJsonLd = (obj) => JSON.stringify(obj)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

// kind: 'domain' (custom domain) or 'slug' (platform /store/<slug>). Returns meta or null.
async function getStoreMeta(kind, key, apiBase) {
  const cache = caches.default;
  const cacheKey = new Request(`https://seo-cache.invalid/${kind}/${encodeURIComponent(key.toLowerCase())}`);

  try {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const cached = await hit.json();
      return cached.found ? cached.meta : null;
    }
  } catch (e) { /* cache problems must never break the page */ }

  const path = kind === 'domain'
    ? `/api/wastore/public/domain/${encodeURIComponent(key)}`
    : `/api/wastore/public/${encodeURIComponent(key)}`;

  let res;
  try {
    // limit=1 keeps the response small — only the store's own fields are needed
    res = await fetch(`${apiBase}${path}?limit=1`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(SEO_FETCH_TIMEOUT),
    });
  } catch (e) {
    return null; // API unreachable / slow → serve the page as-is, cache nothing
  }

  const remember = async (payload, ttl) => {
    try {
      await cache.put(cacheKey, new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` },
      }));
    } catch (e) { /* ignore */ }
  };

  if (res.status === 404 || res.status === 403) {
    await remember({ found: false }, SEO_MISS_TTL);
    return null;
  }
  if (!res.ok) return null; // 5xx etc. — don't cache failures

  let store;
  try {
    store = (await res.json()).store;
  } catch (e) {
    return null;
  }
  if (!store || !store.name) return null;

  const slides = Array.isArray(store.heroSlides) ? store.heroSlides : [];
  const image = [store.logo, store.coverImage, slides[0] && slides[0].imageUrl]
    .find(u => typeof u === 'string' && /^https?:\/\//i.test(u)) || '';

  const meta = {
    name: clip(store.name, 120),
    description: clip(store.description, 300),
    image,
    telephone: store.whatsappNumber ? String(store.whatsappNumber) : '',
    email: store.email ? String(store.email) : '',
    currency: store.currency || '',
  };
  await remember({ found: true, meta }, SEO_CACHE_TTL);
  return meta;
}

// Replace the generic head tags of an HTML response with the store's own.
function applyStoreSeo(response, meta, pageUrl) {
  const title = `${meta.name} | Shop Online`;
  const desc = meta.description || `Shop at ${meta.name} — fast checkout via WhatsApp.`;
  const desc160 = clip(desc, 160);
  const desc200 = clip(desc, 200);

  const tags = [
    `<title>${escHtml(title)}</title>`,
    `<meta name="description" content="${escHtml(desc160)}">`,
    `<link rel="canonical" href="${escHtml(pageUrl)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escHtml(meta.name)}">`,
    `<meta property="og:title" content="${escHtml(title)}">`,
    `<meta property="og:description" content="${escHtml(desc200)}">`,
    `<meta property="og:url" content="${escHtml(pageUrl)}">`,
    meta.image ? `<meta property="og:image" content="${escHtml(meta.image)}">` : '',
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${escHtml(title)}">`,
    `<meta name="twitter:description" content="${escHtml(desc200)}">`,
    meta.image ? `<meta name="twitter:image" content="${escHtml(meta.image)}">` : '',
    `<script type="application/ld+json">${safeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: meta.name,
      description: desc,
      url: pageUrl,
      ...(meta.image ? { image: meta.image } : {}),
      ...(meta.currency ? { currenciesAccepted: meta.currency } : {}),
      ...(meta.telephone ? { telephone: meta.telephone } : {}),
      ...(meta.email ? { email: meta.email } : {}),
    })}</script>`,
  ].filter(Boolean).join('\n  ');

  const drop = { element(el) { el.remove(); } };

  return new HTMLRewriter()
    // remove the generic OneDash tags baked into index.html …
    .on('head > title', drop)
    .on('meta[name="description"]', drop)
    .on('link[rel="canonical"]', drop)
    .on('meta[property^="og:"]', drop)
    .on('meta[name^="twitter:"]', drop)
    .on('link[type="text/markdown"]', drop)
    .on('script[type="application/ld+json"]', drop)
    // … and put the store's own right before </head>
    .on('head', { element(el) { el.onEndTag(end => end.before(tags, { html: true })); } })
    .transform(response);
}

// Returns the response with store SEO applied, or the untouched response when not applicable.
async function withStoreSeo(response, request, env, kind, key, apiBase, pageUrl) {
  try {
    if (env.SEO_REWRITE === 'off') return response;
    if (request.method !== 'GET' || response.status !== 200) return response;
    const type = response.headers.get('Content-Type') || '';
    if (!type.toLowerCase().includes('text/html')) return response;

    const meta = await getStoreMeta(kind, key, apiBase);
    if (!meta) return response;

    const rewritten = applyStoreSeo(response, meta, pageUrl);
    const headers = new Headers(rewritten.headers);
    headers.delete('Content-Length'); // body size changes
    return new Response(rewritten.body, { status: rewritten.status, statusText: rewritten.statusText, headers });
  } catch (e) {
    return response;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originalHost = url.hostname; // e.g., "www.amardryfruits.in"

    // Target Backend — set via Worker env var BACKEND_URL (e.g. https://onedash.cloud)
    // This is the primary domain config. All bypass rules are derived from it.
    const backendUrl = env.BACKEND_URL || 'https://onedash.cloud';
    const backendHostname = new URL(backendUrl).hostname; // e.g. "onedash.cloud"

    // Extract root domain from backendHostname (handles subdomains like "www.onedash.cloud")
    // e.g. "onedash.cloud" → "onedash.cloud" | "www.onedash.cloud" → "onedash.cloud"
    const backendParts = backendHostname.split('.');
    const primaryRootDomain = backendParts.length > 2
      ? backendParts.slice(-2).join('.')
      : backendHostname; // e.g. "onedash.cloud"

    // Build the full list of platform root domains to bypass.
    // EXTRA_BYPASS_DOMAINS = comma-separated legacy/whitelabel domains (e.g. "bluetick.cloud,client.com")
    // All subdomains of each listed domain are auto-bypassed — no code changes needed.
    const extraDomains = (env.EXTRA_BYPASS_DOMAINS || '')
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean);
    const bypassDomains = [primaryRootDomain, ...extraDomains]; // ["onedash.cloud", "bluetick.cloud"]

    // BYPASS: If this request is for any platform domain (primary or legacy/whitelabel),
    // pass it through untouched — avoids infinite proxy loops (Error 522 / 1000).
    const isOwnDomain = bypassDomains.some(
      domain => originalHost === domain || originalHost.endsWith(`.${domain}`)
    );
    // API used to look up a store's name/description/logo for SEO tags
    const apiBase = (env.API_URL || `https://api.${primaryRootDomain}`).replace(/\/$/, '');

    if (isOwnDomain) {
      const passthrough = await fetch(request);
      // Platform store pages (onedash.cloud/store/<slug>) get the store's own SEO tags.
      // Only reached when a Worker route covers that path; every other platform page is untouched.
      const storeMatch = url.pathname.match(/^\/store\/([A-Za-z0-9_-]+)(?:\/|$)/);
      if (storeMatch) {
        return withStoreSeo(
          passthrough, request, env, 'slug', storeMatch[1].toLowerCase(), apiBase,
          `https://${originalHost}/store/${storeMatch[1].toLowerCase()}`
        );
      }
      return passthrough;
    }

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

      const proxied = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

      // Custom-domain store pages: swap the generic OneDash tags for the store's own
      return await withStoreSeo(
        proxied, request, env, 'domain', originalHost, apiBase,
        `https://${originalHost}${url.pathname}`
      );
    } catch (error) {
      return new Response(
        '<!DOCTYPE html><html><head><title>Temporarily Unavailable</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}.card{background:white;padding:2rem 2.5rem;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:420px}h1{color:#1e293b;font-size:1.5rem;margin:0 0 .5rem}p{color:#64748b;font-size:.95rem;margin:0}</style></head><body><div class="card"><h1>Store Temporarily Unavailable</h1><p>We are having trouble reaching this store. Please try again in a few minutes.</p></div></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  },
};

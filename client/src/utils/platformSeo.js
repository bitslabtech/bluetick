/**
 * platformSeo.js — Production SEO & Analytics Tracker for OneDash Platform
 *
 * Dynamically synchronizes:
 * - Primary Meta Tags (Title, Description, Keywords, Robots)
 * - Google Search Console Ownership Verification (<meta name="google-site-verification">)
 * - Bing Webmaster Verification (<meta name="msvalidate.01">)
 * - Canonical Link (<link rel="canonical">)
 * - Open Graph & Twitter Cards (Social Previews)
 * - Schema.org JSON-LD Structured Data (Organization, WebSite, SoftwareApplication)
 * - Google Analytics 4 (GA4) / Google Tag Manager (GTM) with non-blocking async execution
 */

const PLATFORM_SEO_ATTR = 'data-platform-seo';

function cleanVerificationCode(rawCode) {
    if (!rawCode) return '';
    const trimmed = String(rawCode).trim();
    // If user pasted full meta tag: <meta name="google-site-verification" content="xxx" />
    const contentMatch = trimmed.match(/content=["']([^"']+)["']/i);
    if (contentMatch) return contentMatch[1];
    // If user pasted: google-site-verification=xxx
    const eqMatch = trimmed.match(/google-site-verification=([^\s"'>]+)/i);
    if (eqMatch) return eqMatch[1];
    return trimmed.replace(/[<>'"]/g, '');
}

function injectMeta(nameOrProp, content, isProperty = false) {
    if (!content) {
        removeMeta(nameOrProp, isProperty);
        return;
    }
    const attr = isProperty ? 'property' : 'name';
    let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, nameOrProp);
        el.setAttribute(PLATFORM_SEO_ATTR, 'true');
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function removeMeta(nameOrProp, isProperty = false) {
    const attr = isProperty ? 'property' : 'name';
    const el = document.querySelector(`meta[${attr}="${nameOrProp}"][${PLATFORM_SEO_ATTR}]`);
    if (el) el.remove();
}

function injectCanonical(href) {
    if (!href) return;
    let el = document.querySelector(`link[rel="canonical"]`);
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        el.setAttribute(PLATFORM_SEO_ATTR, 'true');
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
}

function injectJsonLd(id, data) {
    if (!data) return;
    let script = document.querySelector(`script[type="application/ld+json"][data-platform-schema="${id}"]`);
    if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-platform-schema', id);
        script.setAttribute(PLATFORM_SEO_ATTR, 'true');
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data, null, 2);
}

function injectGoogleAnalytics(gaId) {
    if (!gaId || typeof window === 'undefined') return;
    const cleanId = String(gaId).trim().toUpperCase();
    if (!/^G-[A-Z0-9]+$/i.test(cleanId) && !/^UA-\d+-\d+$/i.test(cleanId)) return;

    if (!document.querySelector(`script[data-ga-id="${cleanId}"]`)) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${cleanId}`;
        script.setAttribute('data-ga-id', cleanId);
        script.setAttribute(PLATFORM_SEO_ATTR, 'true');
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = window.gtag || gtag;
        window.gtag('js', new Date());
        window.gtag('config', cleanId, {
            send_page_view: true,
            anonymize_ip: true
        });
    } else if (window.gtag) {
        // Track page view on route transitions
        window.gtag('config', cleanId, {
            page_path: window.location.pathname + window.location.search
        });
    }
}

function injectGoogleTagManager(gtmId) {
    if (!gtmId || typeof window === 'undefined') return;
    const cleanId = String(gtmId).trim().toUpperCase();
    if (!/^GTM-[A-Z0-9]+$/i.test(cleanId)) return;

    if (!document.querySelector(`script[data-gtm-id="${cleanId}"]`)) {
        const script = document.createElement('script');
        script.async = true;
        script.setAttribute('data-gtm-id', cleanId);
        script.setAttribute(PLATFORM_SEO_ATTR, 'true');
        script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${cleanId}');`;
        document.head.appendChild(script);
    }
}

/**
 * Apply full SEO, Search Console tags, Social Cards, and Tracking
 */
export function applyPlatformSeo(seo = {}, brand = {}, publicSettings = {}) {
    const appName = publicSettings?.appName || brand?.name || 'OneDash';
    const title = seo.title || `${appName} - All-In-One Ecommerce, WhatsApp Automation & CRM Platform`;
    const description = seo.description || 'All-In-One Ecommerce Platform, WhatsApp Marketing Automation, CRM & Digital Business Cards.';
    const keywords = Array.isArray(seo.keywords) ? seo.keywords.join(', ') : (seo.keywords || '');
    const canonical = (seo.canonicalUrl || window.location.origin).replace(/\/+$/, '');
    const currentUrl = `${canonical}${window.location.pathname}`;
    const ogImage = seo.ogImage || publicSettings?.logoUrl || `${canonical}/og-image.png`;
    const robots = seo.robots || 'index, follow';

    // ── 1. Document Title & Basic Meta ───────────────────────────────────────
    document.title = title;
    injectMeta('description', description);
    if (keywords) injectMeta('keywords', keywords);
    injectMeta('robots', robots);

    // ── 2. Canonical URL ──────────────────────────────────────────────────────
    injectCanonical(currentUrl);

    // ── 3. Google Search Console & Bing Verification ─────────────────────────
    const gscCode = cleanVerificationCode(seo.googleSiteVerification);
    if (gscCode) {
        injectMeta('google-site-verification', gscCode);
    } else {
        removeMeta('google-site-verification');
    }

    const bingCode = cleanVerificationCode(seo.bingSiteVerification);
    if (bingCode) {
        injectMeta('msvalidate.01', bingCode);
    } else {
        removeMeta('msvalidate.01');
    }

    // ── 4. Open Graph Meta Tags (Facebook, WhatsApp, LinkedIn) ───────────────
    injectMeta('og:type', 'website', true);
    injectMeta('og:site_name', appName, true);
    injectMeta('og:title', seo.socialTitle || title, true);
    injectMeta('og:description', seo.socialDescription || description, true);
    injectMeta('og:url', currentUrl, true);
    if (ogImage) injectMeta('og:image', ogImage, true);

    // ── 5. Twitter Card Meta Tags ─────────────────────────────────────────────
    injectMeta('twitter:card', seo.twitterCard || 'summary_large_image');
    injectMeta('twitter:title', seo.socialTitle || title);
    injectMeta('twitter:description', seo.socialDescription || description);
    if (ogImage) injectMeta('twitter:image', ogImage);

    // ── 6. Schema.org JSON-LD Structured Data ────────────────────────────────
    const socialLinks = Object.values(seo.socialLinks || {}).filter(Boolean);
    const schemaData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${canonical}/#organization`,
                'name': appName,
                'url': canonical,
                'logo': publicSettings?.logoUrl || `${canonical}/logo.png`,
                'sameAs': socialLinks
            },
            {
                '@type': 'WebSite',
                '@id': `${canonical}/#website`,
                'url': canonical,
                'name': appName,
                'description': description,
                'publisher': { '@id': `${canonical}/#organization` },
                'potentialAction': {
                    '@type': 'SearchAction',
                    'target': {
                        '@type': 'EntryPoint',
                        'urlTemplate': `${canonical}/blog?search={search_term_string}`
                    },
                    'query-input': 'required name=search_term_string'
                }
            },
            {
                '@type': 'SoftwareApplication',
                '@id': `${canonical}/#software`,
                'name': appName,
                'operatingSystem': 'Cloud, Web, Mobile',
                'applicationCategory': 'BusinessApplication',
                'description': description,
                'offers': {
                    '@type': 'Offer',
                    'price': '0',
                    'priceCurrency': 'USD'
                }
            }
        ]
    };
    injectJsonLd('platform-core', schemaData);

    // ── 7. Site Stats Tracking (GA4 & GTM) ────────────────────────────────────
    if (seo.googleAnalyticsId) {
        injectGoogleAnalytics(seo.googleAnalyticsId);
    }
    if (seo.googleTagManagerId) {
        injectGoogleTagManager(seo.googleTagManagerId);
    }
}

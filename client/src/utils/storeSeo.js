/**
 * storeSeo.js — Shared SEO utility for WaStore public pages
 *
 * Provides clean helpers to inject, update, and remove:
 *  - <meta name/property> tags
 *  - <link rel="canonical"> tags
 *  - <script type="application/ld+json"> structured data blocks
 *
 * All injected nodes are marked with data-store-seo="true" so they can
 * be fully cleaned up on component unmount without touching pre-existing tags.
 */

const SEO_ATTR = 'data-store-seo';

// ─── Meta Tags ───────────────────────────────────────────────────────────────

/**
 * Inject or update a <meta> tag.
 * @param {string} nameOrProp  - e.g. "description" or "og:title"
 * @param {string} content     - the meta value
 * @param {boolean} isProperty - true → use property= attr (Open Graph), false → name=
 */
export function injectMeta(nameOrProp, content, isProperty = false) {
    if (!content) return;
    const attr = isProperty ? 'property' : 'name';
    let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, nameOrProp);
        el.setAttribute(SEO_ATTR, 'true');
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

/**
 * Remove a specific meta tag injected by this utility.
 */
export function removeMeta(nameOrProp, isProperty = false) {
    const attr = isProperty ? 'property' : 'name';
    const el = document.querySelector(`meta[${attr}="${nameOrProp}"][${SEO_ATTR}]`);
    if (el) el.remove();
}

// ─── Canonical ────────────────────────────────────────────────────────────────

/**
 * Inject or update <link rel="canonical" href="...">
 */
export function injectCanonical(href) {
    if (!href) return;
    let el = document.querySelector(`link[rel="canonical"]`);
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        el.setAttribute(SEO_ATTR, 'true');
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

/**
 * Inject or replace a <script type="application/ld+json"> block.
 * @param {string} id    - unique identifier used as data-seo-id attr (e.g. "product", "breadcrumb")
 * @param {object} data  - the schema.org object to serialize
 */
export function injectJsonLd(id, data) {
    if (!data) return;
    let el = document.querySelector(`script[type="application/ld+json"][data-seo-id="${id}"]`);
    if (!el) {
        el = document.createElement('script');
        el.setAttribute('type', 'application/ld+json');
        el.setAttribute('data-seo-id', id);
        el.setAttribute(SEO_ATTR, 'true');
        document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
}

/**
 * Remove a specific JSON-LD block by id.
 */
export function removeJsonLd(id) {
    const el = document.querySelector(`script[type="application/ld+json"][data-seo-id="${id}"]`);
    if (el) el.remove();
}

// ─── Robots ───────────────────────────────────────────────────────────────────

/**
 * Set the robots meta directive.
 * @param {string} directive - e.g. "index, follow" or "noindex, nofollow"
 */
export function setRobots(directive) {
    injectMeta('robots', directive);
}

// ─── Bulk Cleanup ─────────────────────────────────────────────────────────────

/**
 * Remove ALL tags injected by this utility.
 * Call this in useEffect cleanup / componentWillUnmount.
 */
export function cleanupStoreSeo() {
    document.querySelectorAll(`[${SEO_ATTR}="true"]`).forEach(el => el.remove());
}

// ─── Convenience: Full Store Page SEO ────────────────────────────────────────

/**
 * Apply all SEO for the main store listing page or a category view.
 *
 * @param {object} store         - store data object from API
 * @param {string} category      - active category ("All" or a specific name)
 * @param {Array}  products      - filtered products currently visible
 * @param {string} baseUrl       - window.location.origin
 */
export function applyStoreSeo(store, category, products, baseUrl) {
    if (!store) return;

    const seo = store.seoConfig || {};
    const isCategory = category && category !== 'All';

    const storeUrl = `${baseUrl}/store/${store.slug}`;
    const categoryUrl = isCategory
        ? `${storeUrl}?cat=${encodeURIComponent(category)}`
        : storeUrl;

    // Get category specific details if available
    let catDetails = {};
    if (isCategory) {
        try {
            const parsedDetails = typeof store.categoryDetails === 'string' ? JSON.parse(store.categoryDetails) : (store.categoryDetails || {});
            catDetails = parsedDetails[category] || {};
        } catch(e) {}
    }

    // ── Title & Description ──────────────────────────────────────────────────
    const title = isCategory
        ? (catDetails.metaTitle || `${category} | ${seo.metaTitle || store.name}`)
        : (seo.metaTitle || `${store.name} | Online Store`);

    const description = isCategory
        ? (catDetails.metaDesc || catDetails.description || `Browse ${category} products at ${store.name}. ${seo.metaDescription || store.description || ''}`)
        : (seo.metaDescription || store.description || `Shop at ${store.name}`);

    document.title = title;

    // ── Standard Meta ────────────────────────────────────────────────────────
    injectMeta('description', description.slice(0, 160));
    injectMeta('keywords', seo.metaKeywords || '');
    injectMeta('robots', 'index, follow');

    // ── Open Graph ───────────────────────────────────────────────────────────
    injectMeta('og:type', isCategory ? 'website' : 'website', true);
    injectMeta('og:site_name', store.name, true);
    injectMeta('og:title', title, true);
    injectMeta('og:description', description.slice(0, 200), true);
    injectMeta('og:url', categoryUrl, true);
    injectMeta('og:image', seo.ogImage || store.logo || '', true);

    // ── Twitter Card ─────────────────────────────────────────────────────────
    injectMeta('twitter:card', 'summary_large_image');
    injectMeta('twitter:title', title);
    injectMeta('twitter:description', description.slice(0, 200));
    injectMeta('twitter:image', seo.ogImage || store.logo || '');

    // ── Canonical ────────────────────────────────────────────────────────────
    injectCanonical(categoryUrl);

    // ── JSON-LD: WebSite (only on home, not category) ────────────────────────
    if (!isCategory) {
        injectJsonLd('website', {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: store.name,
            url: storeUrl,
            description: store.description || '',
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${storeUrl}?search={search_term_string}`
                },
                'query-input': 'required name=search_term_string'
            }
        });
    } else {
        removeJsonLd('website');
    }

    // ── JSON-LD: BreadcrumbList ───────────────────────────────────────────────
    const breadcrumbItems = [
        {
            '@type': 'ListItem',
            position: 1,
            name: store.name,
            item: storeUrl
        }
    ];
    if (isCategory) {
        breadcrumbItems.push({
            '@type': 'ListItem',
            position: 2,
            name: category,
            item: categoryUrl
        });
    }
    injectJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems
    });

    // ── JSON-LD: ItemList (products currently visible) ────────────────────────
    if (products && products.length > 0) {
        const resolveImgUrl = (url) => {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        };

        injectJsonLd('itemlist', {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: isCategory ? `${category} — ${store.name}` : `Products — ${store.name}`,
            url: categoryUrl,
            numberOfItems: products.length,
            itemListElement: products.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${storeUrl}/product/${p.id}`,
                name: p.name,
                image: resolveImgUrl(p.imageUrls?.[0] || ''),
            }))
        });
    } else {
        removeJsonLd('itemlist');
    }

    // ── Analytics Pixels ─────────────────────────────────────────────────────
    if (seo.googleAnalyticsId && !document.querySelector(`script[data-ga="${seo.googleAnalyticsId}"]`)) {
        const gaScript = document.createElement('script');
        gaScript.setAttribute('data-ga', seo.googleAnalyticsId);
        gaScript.setAttribute(SEO_ATTR, 'true');
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${seo.googleAnalyticsId}`;
        gaScript.async = true;
        document.head.appendChild(gaScript);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', seo.googleAnalyticsId);
    }

    if (seo.facebookPixelId && !document.querySelector(`script[data-fbpx="${seo.facebookPixelId}"]`)) {
        const fbScript = document.createElement('script');
        fbScript.setAttribute('data-fbpx', seo.facebookPixelId);
        fbScript.setAttribute(SEO_ATTR, 'true');
        fbScript.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.facebookPixelId}');fbq('track','PageView');`;
        document.head.appendChild(fbScript);
    }
}

// ─── Convenience: Full Product Page SEO ──────────────────────────────────────

/**
 * Apply all SEO for a single product detail page.
 *
 * @param {object} product   - product data object
 * @param {object} store     - store data object
 * @param {string} baseUrl   - window.location.origin
 */
export function applyProductSeo(product, store, baseUrl) {
    if (!product || !store) return;

    const storeUrl = `${baseUrl}/store/${store.slug}`;
    const productUrl = `${storeUrl}/product/${product.id}`;
    const seo = store.seoConfig || {};

    const resolveImgUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const title = `${product.name} | ${store.name}`;
    const description = (product.description || `Buy ${product.name} from ${store.name}.`).slice(0, 160);
    const image = resolveImgUrl(product.imageUrls?.[0] || seo.ogImage || store.logo || '');
    const price = parseFloat(product.price).toFixed(2);
    const currency = store.currency || 'USD';

    // ── Title ────────────────────────────────────────────────────────────────
    document.title = title;

    // ── Standard Meta ────────────────────────────────────────────────────────
    injectMeta('description', description);
    injectMeta('robots', 'index, follow');

    // ── Open Graph (Product) ─────────────────────────────────────────────────
    injectMeta('og:type', 'og:product', true);
    injectMeta('og:site_name', store.name, true);
    injectMeta('og:title', title, true);
    injectMeta('og:description', description, true);
    injectMeta('og:url', productUrl, true);
    injectMeta('og:image', image, true);
    injectMeta('og:image:alt', product.name, true);
    injectMeta('product:price:amount', price, true);
    injectMeta('product:price:currency', currency, true);
    injectMeta('product:availability', product.inStock ? 'in stock' : 'out of stock', true);

    // ── Twitter Card ─────────────────────────────────────────────────────────
    injectMeta('twitter:card', 'summary_large_image');
    injectMeta('twitter:title', title);
    injectMeta('twitter:description', description);
    injectMeta('twitter:image', image);

    // ── Canonical ────────────────────────────────────────────────────────────
    injectCanonical(productUrl);

    // ── JSON-LD: BreadcrumbList ───────────────────────────────────────────────
    const breadcrumbItems = [
        { '@type': 'ListItem', position: 1, name: store.name, item: storeUrl }
    ];
    if (product.category) {
        breadcrumbItems.push({
            '@type': 'ListItem',
            position: 2,
            name: product.category,
            item: `${storeUrl}?cat=${encodeURIComponent(product.category)}`
        });
    }
    breadcrumbItems.push({
        '@type': 'ListItem',
        position: product.category ? 3 : 2,
        name: product.name,
        item: productUrl
    });

    injectJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems
    });

    // ── JSON-LD: Product ─────────────────────────────────────────────────────
    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || '',
        image: (product.imageUrls || []).map(u => resolveImgUrl(u)).filter(Boolean),
        url: productUrl,
        sku: product.id,
        brand: {
            '@type': 'Brand',
            name: store.name
        },
        offers: {
            '@type': 'Offer',
            url: productUrl,
            priceCurrency: currency,
            price: price,
            availability: product.inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: store.name
            }
        }
    };

    // Add compareAtPrice as priceValidUntil if discount exists
    if (product.compareAtPrice) {
        productSchema.offers.highPrice = parseFloat(product.compareAtPrice).toFixed(2);
        productSchema.offers.lowPrice = price;
        productSchema.offers['@type'] = 'AggregateOffer';
    }

    // Add variants as additionalProperty
    if (product.options && product.options.length > 0) {
        productSchema.additionalProperty = product.options.map(opt => ({
            '@type': 'PropertyValue',
            name: opt.name,
            value: Array.isArray(opt.values) ? opt.values.join(', ') : opt.values
        }));
    }

    injectJsonLd('product', productSchema);
}

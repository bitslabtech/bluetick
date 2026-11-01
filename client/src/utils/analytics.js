/**
 * analytics.js — Centralized Google Analytics (GA4) and Meta Pixel Manager
 *
 * Provides safe, idempotent helpers for:
 *  - Initializing GA4 and Meta Pixel
 *  - Tracking SPA route changes (page_view)
 *  - Tracking Lead generation forms (generate_lead)
 *  - Tracking User Registrations (sign_up)
 *  - Tracking E-commerce events (view_item, add_to_cart, purchase)
 */

const initializedGAs = new Set();
const initializedPixels = new Set();

/**
 * Initialize Google Analytics (GA4)
 * @param {string} measurementId - e.g. "G-XXXXXXXXXX"
 */
export function initGA(measurementId) {
    if (!measurementId || typeof window === 'undefined') return;
    const cleanId = measurementId.trim();
    if (!cleanId) return;

    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
        window.gtag = function () {
            window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
    }

    if (!initializedGAs.has(cleanId)) {
        initializedGAs.add(cleanId);

        // Inject script tag if not already on the page
        if (!document.querySelector(`script[data-ga-id="${cleanId}"]`)) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${cleanId}`;
            script.setAttribute('data-ga-id', cleanId);
            document.head.appendChild(script);
        }

        // Configure GA4 with send_page_view: false so SPA route listener handles page_views cleanly
        window.gtag('config', cleanId, {
            send_page_view: false
        });
    }
}

/**
 * Initialize Meta (Facebook) Pixel
 * @param {string} pixelId - e.g. "1234567890"
 */
export function initPixel(pixelId) {
    if (!pixelId || typeof window === 'undefined') return;
    const cleanId = String(pixelId).trim();
    if (!cleanId) return;

    if (!window.fbq) {
        /* eslint-disable */
        (function (f, b, e, v, n, t, s) {
            if (f.fbq) return;
            n = f.fbq = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = !0;
            t.src = v;
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
    }

    if (!initializedPixels.has(cleanId)) {
        initializedPixels.add(cleanId);
        window.fbq('init', cleanId);
    }
}

/**
 * Track SPA Route change (page_view)
 * @param {string} path - pathname + search
 * @param {string} title - document.title
 */
export function trackPageView(path, title) {
    if (typeof window === 'undefined') return;
    const resolvedPath = path || (window.location.pathname + window.location.search);
    const resolvedTitle = title || document.title;

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
            page_path: resolvedPath,
            page_title: resolvedTitle,
            page_location: window.location.href
        });
    }

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
    }
}

/**
 * Generic custom event tracker
 * @param {string} eventName
 * @param {object} params
 */
export function trackEvent(eventName, params = {}) {
    if (typeof window === 'undefined') return;

    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
    }

    if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', eventName, params);
    }
}

/**
 * Track Lead Form submissions (e.g. Book Demo, Contact Us)
 * @param {object} param0
 * @param {string} param0.formName
 * @param {object} [param0.details]
 */
export function trackLead({ formName = 'Lead', details = {} } = {}) {
    if (typeof window === 'undefined') return;

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
            form_name: formName,
            ...details
        });
    }

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', {
            content_name: formName,
            ...details
        });
    }
}

/**
 * Track User Registration
 * @param {object} param0
 * @param {string} [param0.method]
 * @param {string} [param0.planName]
 */
export function trackSignUp({ method = 'Email', planName = 'Default' } = {}) {
    if (typeof window === 'undefined') return;

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'sign_up', {
            method,
            plan: planName
        });
    }

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'CompleteRegistration', {
            content_name: planName,
            status: 'success'
        });
    }
}

/**
 * Track Single Product View in WaStore (view_item)
 * @param {object} product
 * @param {string} [currency]
 */
export function trackViewItem(product, currency = 'INR') {
    if (!product || typeof window === 'undefined') return;
    const price = parseFloat(product.price || 0);

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'view_item', {
            currency: currency || 'INR',
            value: price,
            items: [{
                item_id: String(product.id || ''),
                item_name: product.name || '',
                price: price,
                item_category: product.category || ''
            }]
        });
    }

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'ViewContent', {
            content_ids: [String(product.id || '')],
            content_name: product.name || '',
            content_type: 'product',
            value: price,
            currency: currency || 'INR'
        });
    }
}

/**
 * Track Add to Cart in WaStore (add_to_cart)
 * @param {object} product
 * @param {number} [quantity]
 * @param {string} [currency]
 */
export function trackAddToCart(product, quantity = 1, currency = 'INR') {
    if (!product || typeof window === 'undefined') return;
    const price = parseFloat(product.price || 0);
    const qty = parseInt(quantity || 1, 10);

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'add_to_cart', {
            currency: currency || 'INR',
            value: price * qty,
            items: [{
                item_id: String(product.id || ''),
                item_name: product.name || '',
                price: price,
                quantity: qty,
                item_category: product.category || ''
            }]
        });
    }

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'AddToCart', {
            content_ids: [String(product.id || '')],
            content_name: product.name || '',
            content_type: 'product',
            value: price * qty,
            currency: currency || 'INR'
        });
    }
}

/**
 * Track Purchase Order in WaStore (purchase)
 * @param {object} order
 * @param {string} [currency]
 */
export function trackPurchase(order, currency = 'INR') {
    if (!order || typeof window === 'undefined') return;
    const total = parseFloat(order.total || order.subtotal || 0);
    const items = (order.items || []).map(item => ({
        item_id: String(item.id || ''),
        item_name: item.name || '',
        price: parseFloat(item.price || 0),
        quantity: parseInt(item.qty || 1, 10)
    }));

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'purchase', {
            transaction_id: String(order.orderNumber || order.id || Date.now()),
            value: total,
            currency: currency || order.currency || 'INR',
            items: items
        });
    }

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
            value: total,
            currency: currency || order.currency || 'INR',
            content_type: 'product',
            num_items: items.length
        });
    }
}

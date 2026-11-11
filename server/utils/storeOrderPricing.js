/**
 * Server-side pricing for online store orders.
 *
 * Mirrors the storefront cart maths (PublicWaStore.jsx / PublicWaProduct.jsx /
 * WaStoreCheckoutModal.jsx) but uses product data from the database, so a shopper
 * cannot change what they pay by editing the request. The server result is what is
 * saved on the order and charged by the gateway.
 *
 * Notes on parity with the storefront:
 *  - Wholesale prices are NOT applied: the public store API strips wholesalePrice,
 *    so shoppers never see or pay wholesale prices online.
 *  - Variant price: the variant whose combo matches every selected option; falls
 *    back to the product's base price when there is no match or no price.
 *  - Tax: per-product rate (or the store rate); inclusive or exclusive; prorated by
 *    the coupon discount ratio.
 *  - Shipping: flat rate unless (subtotal + exclusive tax) reaches the free-shipping threshold.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Unit price for one cart line.
 * @param {object} product          WaProduct (plain or instance)
 * @param {object|null} selection   { optionName: value } chosen by the shopper
 * @param {number|string} clientUnitPrice  price the cart sent (used only for older
 *        storefront bundles that don't send the selection, and only if it is one
 *        of this product's real prices)
 */
function resolveUnitPrice(product, selection, clientUnitPrice) {
    const base = parseFloat(product.price) || 0;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.length) return base;

    if (selection && typeof selection === 'object' && Object.keys(selection).length > 0) {
        const match = variants.find(v =>
            v && v.combo && Object.entries(selection).every(([k, val]) => v.combo[k] === val)
        );
        if (match && match.price != null) {
            const p = parseFloat(match.price);
            return Number.isFinite(p) ? p : base;
        }
        return base;
    }

    const realPrices = [base, ...variants
        .map(v => (v && v.price != null ? parseFloat(v.price) : NaN))
        .filter(Number.isFinite)];
    const cp = parseFloat(clientUnitPrice);
    if (Number.isFinite(cp) && realPrices.some(p => Math.abs(p - cp) < 0.005)) return cp;
    return base;
}

/**
 * @param {object} store   WaStore (taxConfig, checkoutConfig)
 * @param {Array<{ product: object, qty: number, selection: object|null, clientUnitPrice: any, imageUrls: any }>} lines
 * @param {object|null} coupon  WaStoreCoupon already checked for active/dates/usage
 * @returns {{
 *   items: Array, cartSubtotal: number, discountAmount: number, taxAmount: number,
 *   taxRate: number, shippingCost: number, subtotal: number, total: number,
 *   originalTotal: number|null, couponMinOrderValue: number, couponMinimumMet: boolean
 * }}
 */
function priceStoreCart(store, lines, coupon) {
    const taxConfig = store.taxConfig || {};
    const taxEnabled = !!taxConfig.enabled;
    const taxInclusive = !!taxConfig.taxInclusive;
    const storeRate = parseFloat(taxConfig.rate) || 0;

    let cartSubtotal = 0;   // sum(price * qty), before coupon
    let taxRaw = 0;         // tax before coupon proration
    let taxBase = 0;        // for the effective-rate figure shown on invoices
    let estimatedTax = 0;   // exclusive tax used for the free-shipping threshold

    const items = lines.map(({ product, qty, selection, clientUnitPrice, imageUrls }) => {
        const price = resolveUnitPrice(product, selection, clientUnitPrice);
        const rate = (product.taxRate !== null && product.taxRate !== undefined)
            ? (parseFloat(product.taxRate) || 0)
            : storeRate;

        cartSubtotal += price * qty;
        if (taxEnabled) {
            const itemTax = taxInclusive ? price - (price / (1 + rate / 100)) : price * (rate / 100);
            taxRaw += itemTax * qty;
            taxBase += price * qty;
            if (taxConfig.taxInclusive === false) estimatedTax += price * (rate / 100) * qty;
        }

        const item = {
            id: product.id,
            name: product.name,
            price,
            qty,
            imageUrls: product.imageUrls || imageUrls || []
        };
        if (selection && typeof selection === 'object' && Object.keys(selection).length > 0) {
            item.selectedVariants = selection;
        }
        return item;
    });

    // Shipping (threshold compares against subtotal + exclusive tax, before coupon)
    const checkoutConfig = store.checkoutConfig || {};
    const flatRate = parseFloat(checkoutConfig.flatShippingRate) || 0;
    const threshold = parseFloat(checkoutConfig.freeShippingThreshold) || 0;
    const shippingCost = (flatRate > 0 && (threshold === 0 || (cartSubtotal + estimatedTax) < threshold)) ? flatRate : 0;

    // Coupon
    let discountedSubtotal = cartSubtotal;
    let couponMinOrderValue = 0;
    let couponMinimumMet = true;
    if (coupon) {
        couponMinOrderValue = parseFloat(coupon.minOrderValue) || 0;
        const cartTotalForCoupon = cartSubtotal + shippingCost + estimatedTax;
        if (couponMinOrderValue > 0 && cartTotalForCoupon < couponMinOrderValue) couponMinimumMet = false;

        const value = parseFloat(coupon.discountValue) || 0;
        if (coupon.discountType === 'percentage') {
            discountedSubtotal = cartSubtotal - (cartSubtotal * (value / 100));
        } else {
            discountedSubtotal = cartSubtotal - value;
        }
        discountedSubtotal = Math.min(cartSubtotal, Math.max(0, discountedSubtotal));
    }
    const discountAmount = cartSubtotal - discountedSubtotal;

    let taxAmount = 0;
    if (taxEnabled) {
        taxAmount = taxRaw;
        if (coupon && cartSubtotal > 0) taxAmount = taxAmount * Math.max(0, 1 - (discountAmount / cartSubtotal));
    }

    const finalTotal = discountedSubtotal + ((taxEnabled && !taxInclusive) ? taxAmount : 0);
    const taxRate = (taxEnabled && taxBase > 0) ? parseFloat(((taxRaw / taxBase) * 100).toFixed(2)) : 0;

    return {
        items,
        cartSubtotal: round2(cartSubtotal),
        discountAmount: round2(discountAmount),
        taxAmount: round2(taxAmount),
        taxRate,
        shippingCost: round2(shippingCost),
        subtotal: round2(finalTotal),                 // stored as "subtotal" (discounted, incl. exclusive tax)
        total: round2(finalTotal + shippingCost),
        originalTotal: coupon ? round2(cartSubtotal) : null,
        couponMinOrderValue,
        couponMinimumMet
    };
}

module.exports = { priceStoreCart, resolveUnitPrice, round2 };

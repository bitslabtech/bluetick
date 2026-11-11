/**
 * Partner coupon rules.
 *
 * A coupon created by a tech partner (Coupon.techPartnerId set) is funded out of
 * that partner's commission, so it may only be used by a buyer whose purchase
 * actually pays that partner a commission, and the discount may not exceed that
 * commission. This mirrors the two commission paths in billing.js applyUpgrade():
 *
 *   1. B2B partner link   — buyer.techPartnerId === partner.id (signed up with ?partner=CODE)
 *   2. Referral partner   — buyer.referredBy === partner.userId and that user is an
 *                           approved tech partner (uses the global commission rate)
 *
 * The cap is the commission on the pre-discount amount. Combined with the
 * commission deduction in applyUpgrade (clamped at 0), the platform's net
 * revenue is never lower than it would have been without the coupon.
 */
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {object} coupon     Coupon model instance
 * @param {string} buyerId    User id of the buyer
 * @param {number} baseAmount Amount the coupon is applied to (before the coupon)
 * @returns {Promise<{ allowed: boolean, maxDiscount: number }>}
 */
async function getPartnerCouponCap(coupon, buyerId, baseAmount) {
    if (!coupon || !coupon.techPartnerId) return { allowed: true, maxDiscount: Infinity };

    const base = Math.max(0, parseFloat(baseAmount) || 0);
    const TechPartner = require('../models/TechPartner');
    const [partner, buyer, config] = await Promise.all([
        TechPartner.findByPk(coupon.techPartnerId),
        User.findByPk(buyerId, { attributes: ['id', 'referredBy', 'techPartnerId'] }),
        SystemConfig.getCachedConfig()
    ]);
    if (!partner || !buyer) return { allowed: false, maxDiscount: 0 };

    const tpConfig = config?.settings?.techPartnerProgram || {};
    if (tpConfig.enabled === false) return { allowed: false, maxDiscount: 0 };

    let maxDiscount = 0;

    // Path 2 in applyUpgrade: B2B partner commission
    if (buyer.techPartnerId && buyer.techPartnerId === partner.id && partner.enabled) {
        if (partner.commissionType === 'percentage') {
            maxDiscount = Math.max(maxDiscount, round2(base * (parseFloat(partner.commissionValue) || 0) / 100));
        } else if (partner.commissionType === 'flat') {
            maxDiscount = Math.max(maxDiscount, parseFloat(partner.commissionValue) || 0);
        }
        // 'validity_months' pays no cash commission, so it cannot fund a discount
    }

    // Path 1 in applyUpgrade: referral commission for an approved partner account
    if (partner.userId && buyer.referredBy && buyer.referredBy === partner.userId) {
        const referrer = await User.findByPk(partner.userId, { attributes: ['id', 'techPartnerStatus'] });
        if (referrer && referrer.techPartnerStatus === 'approved') {
            const rate = parseFloat(tpConfig.commissionRate) || 20;
            maxDiscount = Math.max(maxDiscount, round2(base * rate / 100));
        }
    }

    return { allowed: maxDiscount > 0, maxDiscount };
}

module.exports = { getPartnerCouponCap };

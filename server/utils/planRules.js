/**
 * Shared plan purchase rules (billing checkout, bank-transfer requests, trials, sign-up).
 */

// Internal plans are never sold or trialled.
const INTERNAL_PLAN_NAMES = ['System CRM'];

/**
 * Which plans a user may buy or trial.
 * Hidden (non-public) plans can only be bought by someone renewing the plan they
 * are already on (e.g. an admin-assigned custom plan). The default plan is hidden
 * by design but is what direct sign-ups are sent to checkout for.
 * @param {object} plan  Plan model instance
 * @param {object|null} user  User model instance, or null during sign-up
 */
const isPlanPurchasable = (plan, user) => {
    if (!plan) return false;
    if (INTERNAL_PLAN_NAMES.includes(plan.name)) return false;
    if (user && user.plan === plan.name) return true; // renewal of own current plan
    if (plan.isActive === false) return false;
    return !!(plan.isPublic || plan.isDefault);
};

/**
 * Resolve the price + duration for a requested billing interval.
 * Only month / half-year / year can be chosen, and only when the admin set a
 * price for that interval (an empty/0 price means the interval is hidden).
 * Legacy single-price plans keep the interval stored on the plan itself.
 * @returns {{ price: number, interval: string } | null}  null when not sold
 */
const PLAN_INTERVALS = ['month', 'half-year', 'year'];
const resolvePlanPricing = (plan, requestedInterval) => {
    const prices = {
        month: parseFloat(plan.monthlyPrice) || 0,
        'half-year': parseFloat(plan.halfYearlyPrice) || 0,
        year: parseFloat(plan.yearlyPrice) || 0
    };
    const legacyPrice = parseFloat(plan.price) || 0;
    const hasIntervalPrices = Object.values(prices).some(p => p > 0);
    const interval = requestedInterval || 'month';

    if (!hasIntervalPrices) {
        if (legacyPrice > 0) return { price: legacyPrice, interval: plan.interval || 'month' };
        // Free plan (every price is 0)
        if (!PLAN_INTERVALS.includes(interval)) return null;
        return { price: 0, interval };
    }
    if (!PLAN_INTERVALS.includes(interval) || prices[interval] <= 0) return null;
    return { price: prices[interval], interval };
};

/**
 * True when the plan costs money on ANY billing interval.
 * Plans are priced per interval (monthly / half-yearly / yearly); the old single `price`
 * column is only a fallback and can be 0 on a paid plan, so never test it alone.
 */
const isPaidPlan = (plan) => {
    if (!plan) return false;
    return [plan.price, plan.monthlyPrice, plan.halfYearlyPrice, plan.yearlyPrice]
        .some(v => (parseFloat(v) || 0) > 0);
};

module.exports = { INTERNAL_PLAN_NAMES, isPlanPurchasable, isPaidPlan, PLAN_INTERVALS, resolvePlanPricing };

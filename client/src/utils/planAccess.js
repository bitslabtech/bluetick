/**
 * Whether the user's CURRENT plan lets them use the app right now.
 *
 * Mirrors the server's subscription check (server/middleware/auth.js): an account is
 * only blocked when it is Pending / Suspended / Expired, or its expiry date has passed.
 * A plan with no expiry date (Free plan, free default plan, lifetime or admin-granted
 * plans) is usable — so opening checkout to look at an upgrade must never lock them in.
 */
export const hasUsablePlan = (user) => {
    if (!user) return false;
    if (!['Active', 'Trial'].includes(user.planStatus)) return false;
    if (!user.planExpiry) return true;
    return new Date(user.planExpiry) >= new Date();
};

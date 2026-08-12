/**
 * retryConfig.js
 *
 * Single source of truth for the 131049 retry system constants.
 * Both webhook.js and retryProcessor.js import from here so they
 * can never drift out of sync.
 *
 * Progressive retry schedule (from original failure):
 *   Retry 1: fires +8h  after initial failure  (retryCount 0 -> 1)
 *   Retry 2: fires +16h after retry 1 fails    (retryCount 1 -> 2)
 *   Retry 3: fires +24h after retry 2 fails    (retryCount 2 -> 3)
 *   After 3 failures: permanently FAILED
 */

const MAX_RETRIES = 3;
const RETRY_DELAYS_HOURS = [8, 16, 24]; // Index === current retryCount at time of failure

module.exports = { MAX_RETRIES, RETRY_DELAYS_HOURS };

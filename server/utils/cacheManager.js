/**
 * Centralized Cache Manager
 * 
 * All server-side in-memory caches register here so the "Purge Cache" 
 * admin action can flush everything at once.
 * 
 * HOW IT WORKS:
 * - API endpoints cache their responses in-memory with a short TTL (60s).
 * - When an admin saves changes (plans, landing page, settings), the specific
 *   cache is invalidated IMMEDIATELY so the next request gets fresh data.
 * - The "Purge System Cache" button in System Control clears ALL caches at once.
 * - Browser never caches API responses — only static assets (JS/CSS) are 
 *   browser-cached via Nginx, and Vite's content hashing ensures cache-busting
 *   on every new build.
 */

const _caches = new Map();

const cacheManager = {
    /**
     * Register a named cache with get/set/clear functions.
     * @param {string} name - Human-readable cache name (e.g. 'public_settings')
     * @param {object} cache - { get, set, clear } interface
     */
    register(name, cache) {
        _caches.set(name, cache);
    },

    /**
     * Clear a specific cache by name.
     * @param {string} name
     */
    invalidate(name) {
        const cache = _caches.get(name);
        if (cache && cache.clear) cache.clear();
    },

    /**
     * Flush ALL registered caches. Called by the admin "Purge Cache" action.
     * @returns {string[]} Names of caches that were cleared.
     */
    purgeAll() {
        const cleared = [];
        for (const [name, cache] of _caches) {
            if (cache && cache.clear) {
                cache.clear();
                cleared.push(name);
            }
        }
        console.log(`[CACHE MANAGER] Purged ${cleared.length} caches: ${cleared.join(', ')}`);
        return cleared;
    },

    /**
     * Get list of registered cache names (for diagnostics).
     * @returns {string[]}
     */
    list() {
        return Array.from(_caches.keys());
    },

    /**
     * Create a simple TTL cache and auto-register it.
     * Returns { get(), set(data), clear() } helper.
     * @param {string} name - Cache name
     * @param {number} ttlMs - TTL in milliseconds (default 60s)
     */
    createSimpleCache(name, ttlMs = 60_000) {
        let _data = null;
        let _expiresAt = 0;

        const cache = {
            get() {
                if (_data && Date.now() < _expiresAt) return _data;
                return null;
            },
            set(data) {
                _data = data;
                _expiresAt = Date.now() + ttlMs;
            },
            clear() {
                _data = null;
                _expiresAt = 0;
            }
        };

        _caches.set(name, cache);
        return cache;
    }
};

module.exports = cacheManager;

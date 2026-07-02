// ── Shared public settings cache ──────────────────────────────────────────────
// Both ThemeContext and UIContext call /api/settings/public on mount.
// Without caching this fires 2 separate network requests on every page load,
// including public store pages where neither result is even needed.
// This module ensures the request is made at most ONCE per page load.

let cache = null;
let inFlight = null;

export async function getPublicSettings() {
    // Return cached result immediately if already fetched
    if (cache) return cache;

    // Return the in-flight promise if request is already underway
    if (inFlight) return inFlight;

    // Fire the request and cache the promise
    inFlight = fetch(`${import.meta.env.VITE_API_URL}/api/settings/public`)
        .then(res => res.json())
        .then(data => {
            cache = data;
            inFlight = null;
            return data;
        })
        .catch(err => {
            inFlight = null; // Allow retry on error
            throw err;
        });

    return inFlight;
}

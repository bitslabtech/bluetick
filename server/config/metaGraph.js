// One Meta Graph API version for every call the server makes (WhatsApp, templates, media, ads, pixel).
// Change it here or with META_GRAPH_API_VERSION. Meta keeps each version for at least two years and
// silently upgrades calls to retired versions, so a single, current version avoids surprises.
// (The usage page's pricing_analytics sync has its own setting, META_GRAPH_VERSION, in utils/waUsage.js.)
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

module.exports = { GRAPH_VERSION, GRAPH_URL };

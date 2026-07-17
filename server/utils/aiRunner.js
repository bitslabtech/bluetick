/**
 * aiRunner.js — Shared Gemini AI call utility
 *
 * Handles:
 *  - Reading primary model + fallback model + retry count from SystemConfig
 *  - Retrying the primary model N times (with exponential backoff on 429)
 *  - Falling back to the fallback model if all retries fail
 *  - Logging which model was ultimately used
 *
 * Usage:
 *   const { runAi } = require('../utils/aiRunner');
 *   const text = await runAi(sysConfig, systemInstruction, userPrompt, generationConfig);
 */

const axios = require('axios');

// Since the frontend dynamically fetches models from the Google API,
// we no longer hardcode SUPPORTED_MODELS here. We trust the sysConfig value.

const DEFAULT_PRIMARY  = 'gemini-2.5-flash';
const DEFAULT_FALLBACK = 'gemini-2.5-flash-lite';
const DEFAULT_RETRIES  = 3;

/**
 * Build a Gemini REST URL for a given model.
 */
function buildUrl(model, apiKey) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

/**
 * Make a single Gemini generateContent call.
 * Throws on HTTP error.
 */
async function callGemini(model, apiKey, payload) {
    const url = buildUrl(model, apiKey);
    const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
    return res.data;
}

/**
 * Attempt a Gemini call with exponential back-off retries.
 * Only retries on 429 (rate limit) and 503 (overloaded).
 * Throws on other errors or when retries are exhausted.
 *
 * @param {string}  model      — Gemini model ID
 * @param {string}  apiKey     — GEMINI_API_KEY
 * @param {object}  payload    — generateContent request body
 * @param {number}  maxRetries — max attempts (not including the first try)
 * @returns {object} Gemini response data
 */
async function callWithRetry(model, apiKey, payload, maxRetries) {
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const data = await callGemini(model, apiKey, payload);
            if (attempt > 0) {
                console.log(`[aiRunner] Model ${model} succeeded on attempt ${attempt + 1}`);
            }
            return data;
        } catch (err) {
            lastErr = err;
            const status = err.response?.status;
            const isRetryable = status === 429 || status === 503;

            if (!isRetryable || attempt >= maxRetries) {
                throw err; // Non-retryable or retries exhausted
            }

            const waitMs = Math.pow(2, attempt) * 1200 + Math.random() * 800;
            console.warn(`[aiRunner] ${model} attempt ${attempt + 1} failed (${status}). Retrying in ${Math.round(waitMs)}ms...`);
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw lastErr;
}

/**
 * Run an AI call with primary model → retry → fallback model logic.
 *
 * @param {object} sysConfig  — result of SystemConfig.getCachedConfig() or getConfig()
 * @param {string} systemInstruction — system prompt
 * @param {string} userPrompt         — user message
 * @param {object} [generationConfig] — optional { temperature, maxOutputTokens, responseMimeType, ... }
 * @returns {{ text: string, modelUsed: string, usedFallback: boolean }}
 */
async function runAi(sysConfig, systemInstruction, userPrompt, generationConfig = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

    const settings    = sysConfig?.settings || {};
    const primary     = settings.aiModel || DEFAULT_PRIMARY;
    const fallback    = settings.aiFallbackModel || DEFAULT_FALLBACK;
    const maxRetries  = Math.min(Math.max(parseInt(settings.aiRetryAttempts) || DEFAULT_RETRIES, 1), 5);

    const payload = {
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            ...generationConfig
        }
    };

    // ── 1. Try primary model ───────────────────────────────────────────────
    let data = null;
    let usedFallback = false;
    let modelUsed = primary;

    try {
        console.log(`[aiRunner] Calling primary model: ${primary} (max retries: ${maxRetries})`);
        data = await callWithRetry(primary, apiKey, payload, maxRetries - 1);
    } catch (primaryErr) {
        // ── 2. Primary exhausted — try fallback ────────────────────────────
        if (fallback && fallback !== primary) {
            console.warn(`[aiRunner] Primary model ${primary} failed. Falling back to ${fallback}. Error: ${primaryErr.message}`);
            try {
                data = await callWithRetry(fallback, apiKey, payload, 0); // fallback gets 1 attempt only
                usedFallback = true;
                modelUsed = fallback;
                console.log(`[aiRunner] Fallback model ${fallback} succeeded.`);
            } catch (fallbackErr) {
                console.error(`[aiRunner] Fallback model ${fallback} also failed:`, fallbackErr.message);
                throw new Error(`AI unavailable. Primary (${primary}) and fallback (${fallback}) both failed.`);
            }
        } else {
            throw primaryErr;
        }
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text, modelUsed, usedFallback };
}

module.exports = {
    runAi,
    DEFAULT_PRIMARY,
    DEFAULT_FALLBACK,
    DEFAULT_RETRIES
};

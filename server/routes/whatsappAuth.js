const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');

// POST /api/whatsapp/exchange-token
// Exchanges the Facebook OAuth code for a System User Access Token and retrieves the WABA ID
router.post('/exchange-token', auth, async (req, res) => {
    try {
        const { code, hintWabaId, hintPhoneNumberId } = req.body;
        console.log('[WA DEBUG] ========== /exchange-token START ==========');
        console.log('[WA DEBUG] User ID:', req.user?.id);
        console.log('[WA DEBUG] Received code:', code ? `${code.substring(0, 20)}... (length: ${code.length})` : '(MISSING!)');
        console.log('[WA DEBUG] Hint WABA ID from browser postMessage:', hintWabaId || '(none)');
        console.log('[WA DEBUG] Hint Phone Number ID from browser postMessage:', hintPhoneNumberId || '(none)');


        if (!code) {
            console.error('[WA DEBUG] ❌ No code provided in request body');
            return res.status(400).json({ error: 'OAuth code is required from the frontend' });
        }

        const clientId = process.env.FB_CLIENT_ID;
        const clientSecret = process.env.FB_CLIENT_SECRET;
        console.log('[WA DEBUG] FB_CLIENT_ID:', clientId ? `${clientId.substring(0, 8)}...` : '(MISSING!)');
        console.log('[WA DEBUG] FB_CLIENT_SECRET:', clientSecret ? `${clientSecret.substring(0, 8)}...` : '(MISSING!)');

        if (!clientId || !clientSecret) {
            console.error("[WA DEBUG] ❌ Missing FB_CLIENT_ID or FB_CLIENT_SECRET in .env");
            return res.status(500).json({ error: 'Server configuration missing for WhatsApp integration' });
        }

        // Detect if we received an OAuth code (starts with 'AQ') or a direct access token (starts with 'EA')
        const isDirectToken = code.startsWith('EA');
        let shortLivedToken;

        if (isDirectToken) {
            // Frontend sent accessToken directly (FB.login fallback mode)
            console.log('[WA DEBUG] Step 1: Received DIRECT access token (starts with EA), skipping code exchange');
            shortLivedToken = code;
        } else {
            // Standard OAuth flow: exchange 'code' for 'access_token'
            console.log("[WA DEBUG] Step 1: Exchanging code for token via Graph API...");
            console.log("[WA DEBUG] GET https://graph.facebook.com/v22.0/oauth/access_token");
            const tokenResponse = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
                params: {
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code
                }
            });
            console.log('[WA DEBUG] ✅ Token exchange response status:', tokenResponse.status);
            console.log('[WA DEBUG] Token response data keys:', Object.keys(tokenResponse.data));

            shortLivedToken = tokenResponse.data.access_token;
            if (!shortLivedToken) {
                console.error('[WA DEBUG] ❌ No access_token in response:', JSON.stringify(tokenResponse.data));
                return res.status(400).json({ error: 'Failed to retrieve access token from Meta' });
            }
        }
        console.log('[WA DEBUG] ✅ Got short-lived token (length:', shortLivedToken.length, ')');

        // 1b. Immediately upgrade to a long-lived token (valid ~60 days)
        console.log("[WA DEBUG] Step 1b: Upgrading to long-lived token...");
        let accessToken = shortLivedToken;
        try {
            const longLivedRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: clientId,
                    client_secret: clientSecret,
                    fb_exchange_token: shortLivedToken
                }
            });
            if (longLivedRes.data?.access_token) {
                accessToken = longLivedRes.data.access_token;
                const expiresIn = longLivedRes.data.expires_in;
                console.log(`[WA DEBUG] ✅ Got long-lived token (length: ${accessToken.length}, expires_in: ${expiresIn}s ≈ ${Math.round(expiresIn / 86400)} days)`);
            } else {
                console.warn('[WA DEBUG] ⚠️ Long-lived token exchange returned no token, using short-lived token as fallback.');
            }
        } catch (longLivedErr) {
            console.error('[WA DEBUG] ⚠️ Failed to get long-lived token, using short-lived as fallback:', longLivedErr.response?.data || longLivedErr.message);
        }

        // 2. Debug the token to extract 'waba_id' (WhatsApp Business Account ID)
        console.log("[WA DEBUG] Step 2: Debugging token to fetch WABA ID...");
        console.log("[WA DEBUG] GET https://graph.facebook.com/v22.0/debug_token");
        const debugResponse = await axios.get('https://graph.facebook.com/v22.0/debug_token', {
            params: {
                input_token: accessToken,
                access_token: `${clientId}|${clientSecret}` // App Access Token
            }
        });
        console.log('[WA DEBUG] ✅ Debug token response status:', debugResponse.status);

        const debugData = debugResponse.data.data;
        console.log('[WA DEBUG] Debug data:', JSON.stringify(debugData, null, 2));

        if (!debugData || !debugData.is_valid) {
            console.error('[WA DEBUG] ❌ Token is invalid! debugData.is_valid =', debugData?.is_valid);
            return res.status(401).json({ error: 'Generated token is invalid according to Meta Debug Tool' });
        }
        console.log('[WA DEBUG] ✅ Token is valid');
        console.log('[WA DEBUG] granular_scopes:', JSON.stringify(debugData.granular_scopes, null, 2));

        // 2. Extract WABA ID — prioritise the hint from browser postMessage (most reliable source)
        let wabaId = hintWabaId || null;
        console.log('[WA DEBUG] wabaId from postMessage hint:', wabaId || '(not provided, will try granular_scopes)');

        if (!wabaId) {
            wabaId = debugData.granular_scopes?.find(s => s.scope === 'whatsapp_business_management')?.target_ids?.[0];
            console.log('[WA DEBUG] wabaId from granular_scopes:', wabaId || '(not found, will try Graph API fallback)');
        }

        // Fallback: if granular_scopes didn't yield a WABA ID, query Graph API directly
        if (!wabaId) {
            console.log('[WA DEBUG] Attempting Graph API fallback to fetch WABA ID...');
            try {
                const wabaListRes = await axios.get('https://graph.facebook.com/v22.0/me/businesses', {
                    params: {
                        fields: 'whatsapp_business_accounts{id,name}',
                        access_token: accessToken
                    }
                });
                const businesses = wabaListRes.data?.data || [];
                console.log('[WA DEBUG] businesses from /me/businesses:', JSON.stringify(businesses));
                for (const biz of businesses) {
                    const accounts = biz.whatsapp_business_accounts?.data;
                    if (accounts && accounts.length > 0) {
                        wabaId = accounts[0].id;
                        console.log('[WA DEBUG] Found WABA ID via /me/businesses:', wabaId);
                        break;
                    }
                }
            } catch (fbErr) {
                console.error('[WA DEBUG] /me/businesses fallback failed:', fbErr.response?.data || fbErr.message);
            }
        }

        if (!wabaId) {
            console.error('[WA DEBUG] ❌ Could not determine WABA ID from any source. User must enter manually.');
        }
        console.log('[WA DEBUG] Final wabaId:', wabaId || '(not found)');

        // 3. Save to User Model
        console.log('[WA DEBUG] Step 3: Saving to User model...');
        const user = await User.findByPk(req.user.id);
        if (!user) {
            console.error('[WA DEBUG] ❌ User not found for id:', req.user.id);
            return res.status(404).json({ error: 'User not found' });
        }

        // IMPORTANT: Clear stale WhatsApp fields before populating fresh data
        // This prevents old wrong values (e.g. email-as-phone-id from a previous broken run) from persisting
        user.metaPhoneNumberId = null;
        user.metaDisplayPhoneNumber = null;
        user.metaQualityRating = null;
        user.metaTier = null;
        user.metaVerifiedName = null;
        user.metaNameStatus = null;

        // 4. Fetch Phone Number details using the most reliable available source
        console.log('[WA DEBUG] Step 4: Fetching Phone Number details...');
        const phoneIdToUse = hintPhoneNumberId || null;

        if (phoneIdToUse) {
            // Best path: we have the exact Phone Number ID from the browser postMessage
            console.log('[WA DEBUG] Using hintPhoneNumberId directly:', phoneIdToUse);
            try {
                const phoneRes = await axios.get(`https://graph.facebook.com/v22.0/${phoneIdToUse}`, {
                    params: {
                        fields: 'id,display_phone_number,quality_rating,messaging_limit_tier,verified_name,name_status,code_verification_status',
                        access_token: accessToken
                    }
                });
                const phoneData = phoneRes.data;
                if (phoneData?.id) {
                    console.log('[WA DEBUG] ✅ Phone Data via hintPhoneNumberId:', JSON.stringify(phoneData));
                    console.log('[WA DEBUG] code_verification_status:', phoneData.code_verification_status);
                    user.metaPhoneNumberId = phoneData.id;
                    user.metaDisplayPhoneNumber = phoneData.display_phone_number;
                    user.metaQualityRating = phoneData.quality_rating;
                    user.metaTier = phoneData.messaging_limit_tier;
                    user.metaVerifiedName = phoneData.verified_name;
                    user.metaNameStatus = phoneData.name_status;
                }
            } catch (phoneErr) {
                console.error('[WA DEBUG] Error fetching by hintPhoneNumberId, falling back to WABA list:', phoneErr.response?.data || phoneErr.message);
            }
        }

        // Fallback: fetch phone list from WABA if hint didn't populate metaPhoneNumberId
        if (!user.metaPhoneNumberId && wabaId) {
            console.log('[WA DEBUG] Fetching phone list from WABA:', wabaId);
            try {
                const phoneResponse = await axios.get(`https://graph.facebook.com/v22.0/${wabaId}/phone_numbers`, {
                    params: {
                        fields: 'id,display_phone_number,quality_rating,messaging_limit_tier,verified_name,name_status,code_verification_status',
                        access_token: accessToken
                    }
                });
                if (phoneResponse.data?.data?.length > 0) {
                    const phoneData = phoneResponse.data.data[0];
                    console.log('[WA DEBUG] Phone Data fetched from WABA list:', JSON.stringify(phoneData));
                    console.log('[WA DEBUG] code_verification_status:', phoneData.code_verification_status);
                    user.metaPhoneNumberId = phoneData.id;
                    user.metaDisplayPhoneNumber = phoneData.display_phone_number;
                    user.metaQualityRating = phoneData.quality_rating;
                    user.metaTier = phoneData.messaging_limit_tier;
                    user.metaVerifiedName = phoneData.verified_name;
                    user.metaNameStatus = phoneData.name_status;
                } else {
                    console.warn('[WA DEBUG] ⚠️ No phone numbers found under WABA:', wabaId);
                }
            } catch (phoneErr) {
                console.error('[WA DEBUG] Error fetching phone numbers from WABA:', phoneErr.response?.data || phoneErr.message);
            }
        }

        if (!user.metaPhoneNumberId) {
            console.warn('[WA DEBUG] ⚠️ metaPhoneNumberId could not be determined. User must set it manually.');
        }

        // --- Fetch WABA Portfolio Limit ---
        if (wabaId) {
            try {
                const wabaRes = await axios.get(`https://graph.facebook.com/v22.0/${wabaId}`, {
                    params: {
                        fields: 'whatsapp_business_manager_messaging_limit',
                        access_token: accessToken
                    }
                });
                if (wabaRes.data && wabaRes.data.whatsapp_business_manager_messaging_limit) {
                    user.metaTier = wabaRes.data.whatsapp_business_manager_messaging_limit.toString();
                    console.log('[WA DEBUG] Set WABA Portfolio Limit:', user.metaTier);
                }
            } catch (wabaErr) {
                console.warn('[WA DEBUG] Could not fetch WABA portfolio limit during OAuth:', wabaErr.response?.data?.error?.message || wabaErr.message);
            }
        }

        // 3a. Generate a permanent System User Token (never expires)
        console.log('[WA DEBUG] Step 3a: Generating permanent System User Token...');
        let permanentToken = null;
        let businessId = null; // capture here so we can reuse below
        try {
            const bizRes = await axios.get('https://graph.facebook.com/v22.0/me/businesses', {
                params: { access_token: accessToken }
            });
            businessId = bizRes.data?.data?.[0]?.id;
            console.log('[WA DEBUG] Business Manager ID:', businessId || '(not found)');

            if (businessId) {
                // Create (or re-use existing) System User under this business
                const sysUserRes = await axios.post(
                    `https://graph.facebook.com/v22.0/${businessId}/system_users`,
                    null,
                    {
                        params: {
                            name: 'Bluetick_API_SysUser',
                            role: 'ADMIN',
                            access_token: accessToken
                        }
                    }
                );
                const systemUserId = sysUserRes.data?.id;
                console.log('[WA DEBUG] System User ID:', systemUserId || '(not created)');

                if (systemUserId) {
                    // Generate a never-expiring token for this system user
                    const sysTokenRes = await axios.post(
                        `https://graph.facebook.com/v22.0/${systemUserId}/access_tokens`,
                        null,
                        {
                            params: {
                                business_app: clientId,
                                appsecret_proof: require('crypto')
                                    .createHmac('sha256', clientSecret)
                                    .update(accessToken)
                                    .digest('hex'),
                                scope: 'whatsapp_business_messaging,whatsapp_business_management,business_management',
                                access_token: accessToken
                            }
                        }
                    );
                    permanentToken = sysTokenRes.data?.access_token;
                    if (permanentToken) {
                        console.log('[WA DEBUG] ✅ Got permanent System User Token (never expires), length:', permanentToken.length);
                    } else {
                        console.warn('[WA DEBUG] ⚠️ System User token request returned no token:', JSON.stringify(sysTokenRes.data));
                    }
                }
            }
        } catch (sysErr) {
            console.error('[WA DEBUG] ⚠️ System User token generation failed — will fall back to long-lived token:', sysErr.response?.data || sysErr.message);
        }

        // Use permanent token if we got one, otherwise keep the long-lived token
        const finalToken = permanentToken || accessToken;
        const tokenType = permanentToken ? 'PERMANENT (never expires)' : 'LONG-LIVED (~60 days)';
        console.log(`[WA DEBUG] ✅ finalToken type: ${tokenType}, length: ${finalToken.length}`);

        // =====================================================================
        // STEP: Register the phone number on the WhatsApp Cloud API
        // ─────────────────────────────────────────────────────────────────────
        // This is REQUIRED for Tech Providers after Embedded Signup.
        // Without this POST, the phone number stays in "Pending" in WhatsApp
        // Manager and cannot send or receive any messages.
        //
        // PIN strategy: last 6 digits of the customer's WhatsApp Business
        // phone number. This is:
        //   • Unique per customer
        //   • Deterministic — always recoverable from the phone number
        //   • Requires no extra DB storage
        // =====================================================================
        if (user.metaPhoneNumberId && finalToken) {
            try {
                // Derive PIN from last 6 digits of the display phone number
                // e.g. "+91 98765 43210" → "919876543210" → PIN: "543210"
                const rawPhone = user.metaDisplayPhoneNumber || '';
                const digitsOnly = rawPhone.replace(/\D/g, '');
                const registrationPin = digitsOnly.length >= 6
                    ? digitsOnly.slice(-6)
                    : (process.env.WA_REGISTRATION_PIN || '000000'); // fallback if phone not yet known

                console.log(`[WA DEBUG] Step REGISTER: Registering phone ${user.metaDisplayPhoneNumber} (ID: ${user.metaPhoneNumberId}) with PIN derived from last 6 digits...`);

                const regRes = await axios.post(
                    `https://graph.facebook.com/v22.0/${user.metaPhoneNumberId}/register`,
                    {
                        messaging_product: 'whatsapp',
                        pin: registrationPin
                    },
                    {
                        headers: { Authorization: `Bearer ${finalToken}` }
                    }
                );

                console.log('[WA DEBUG] ✅ Phone registration successful:', JSON.stringify(regRes.data));

            } catch (regErr) {
                const regErrData = regErr.response?.data?.error;
                // Error code 80007 = phone number is already registered — not a real error, skip silently
                if (regErrData?.code === 80007) {
                    console.log('[WA DEBUG] ℹ️ Phone number already registered on Cloud API — skipping re-registration.');
                } else {
                    // Log the failure but do NOT block the rest of the signup flow.
                    // The user is connected — registration can be retried via /api/whatsapp/register-phone.
                    console.error('[WA DEBUG] ⚠️ Phone registration failed (number may remain Pending):', regErrData || regErr.message);
                    console.error('[WA DEBUG] Registration error code:', regErrData?.code, '| message:', regErrData?.message);
                }
            }
        } else {
            console.warn('[WA DEBUG] ⚠️ Skipping phone registration — metaPhoneNumberId or finalToken is missing.');
        }

        // Save all fields to User model
        // If the WABA ID changed, clear old templates
        if (wabaId && user.wabaId && user.wabaId !== wabaId) {
            try {
                const Template = require('../models/Template');
                await Template.destroy({ where: { userId: req.user.id } });
                console.log('[WA OAUTH] 🗑️ WABA ID changed. Cleared old cached templates.');
            } catch (err) {
                console.error('[WA OAUTH] Failed to clear old templates:', err.message);
            }
        }

        user.fbAccessToken = finalToken;
        user.wabaId = wabaId || user.wabaId || null;       // keep existing if we couldn't get a new one
        user.metaBusinessId = businessId || user.metaBusinessId || null; // reuse from step 3a
        await user.save();
        console.log('[WA DEBUG] ✅ User saved → wabaId:', user.wabaId, '| metaPhoneNumberId:', user.metaPhoneNumberId, '| metaBusinessId:', user.metaBusinessId);

        // =====================================================================
        // CRITICAL: Sync the final token + phone number ID into the Settings table
        // The entire messaging system (campaigns, chat, FlowRunner, systemMessenger)
        // reads from Settings.metaAccessToken and Settings.metaPhoneNumberId —
        // NOT from User.fbAccessToken. Without this sync, messaging will fail silently.
        // =====================================================================
        try {
            const Settings = require('../models/Settings');
            let settings = await Settings.findOne({ where: { userId: user.id } });
            if (!settings) {
                settings = await Settings.create({ userId: user.id });
            }
            // Always set the token
            settings.metaAccessToken = finalToken;
            // Only overwrite phone number ID if we actually retrieved one —
            // never write an empty string, which would break all "not configured" guards.
            if (user.metaPhoneNumberId) {
                settings.metaPhoneNumberId = user.metaPhoneNumberId;
            }
            // Only overwrite WABA ID if we have a fresh value
            if (wabaId) {
                settings.metaBusinessAccountId = wabaId;
            }
            await settings.save();
            console.log('[WA DEBUG] ✅ Settings table synced → token set, metaPhoneNumberId:', settings.metaPhoneNumberId || '(kept existing)', ', wabaId:', settings.metaBusinessAccountId || '(kept existing)');
        } catch (syncErr) {
            console.error('[WA DEBUG] ⚠️ Failed to sync token to Settings table:', syncErr.message);
        }

        console.log('[WA DEBUG] ========== /exchange-token SUCCESS ==========');

        res.json({
            message: 'WhatsApp Business connected successfully',
            wabaId: user.wabaId,
            user: {
                wabaId: user.wabaId,
                metaBusinessId: user.metaBusinessId,
                metaPhoneNumberId: user.metaPhoneNumberId,
                metaDisplayPhoneNumber: user.metaDisplayPhoneNumber,
                metaQualityRating: user.metaQualityRating,
                metaTier: user.metaTier,
                metaVerifiedName: user.metaVerifiedName,
                metaNameStatus: user.metaNameStatus
            }
        });

    } catch (error) {
        console.error('[WA DEBUG] ❌ /exchange-token FAILED');
        console.error('[WA DEBUG] Error message:', error.message);
        console.error('[WA DEBUG] Error response data:', error?.response?.data);
        console.error('[WA DEBUG] Error response status:', error?.response?.status);
        console.error('[WA DEBUG] Full error:', error);
        res.status(500).json({
            error: 'Failed to complete WhatsApp signup process. Please try again.',
            details: error?.response?.data?.error?.message || error.message
        });
    }
});

// GET /api/whatsapp/status
// Fetches the latest tier and quality rating from Meta
// Supports both setup paths:
//   A) Embedded Signup (OAuth) → fbAccessToken + wabaId on User model
//   B) Manual Settings page  → metaAccessToken + metaBusinessAccountId on Settings model
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne({ where: { userId: req.user.id } });

        // Determine which token + WABA ID to use
        let accessToken = user.fbAccessToken;
        let wabaId = user.wabaId;

        // Fallback: use Settings-based WhatsApp credentials
        if (!accessToken || !wabaId) {
            if (settings?.metaAccessToken && settings?.metaBusinessAccountId) {
                accessToken = settings.metaAccessToken;
                wabaId = settings.metaBusinessAccountId;
            } else if (settings?.metaAccessToken && settings?.metaPhoneNumberId) {
                // Settings path without WABA ID — fetch phone number info directly
                try {
                    const phoneRes = await axios.get(`https://graph.facebook.com/v22.0/${settings.metaPhoneNumberId}`, {
                        params: {
                            fields: 'id,display_phone_number,quality_rating,messaging_limit_tier,verified_name,name_status',
                            access_token: settings.metaAccessToken
                        }
                    });
                    const phoneData = phoneRes.data;
                    if (phoneData && phoneData.id) {
                        user.metaPhoneNumberId = phoneData.id;
                        user.metaDisplayPhoneNumber = phoneData.display_phone_number;
                        user.metaQualityRating = phoneData.quality_rating;
                        user.metaTier = phoneData.messaging_limit_tier;
                        user.metaVerifiedName = phoneData.verified_name;
                        user.metaNameStatus = phoneData.name_status;
                        user.metaConversations24h = 0;
                        user.metaConversationsFetchedAt = new Date();
                        await user.save();
                        return res.json({
                            message: 'Status refreshed successfully',
                            user: {
                                wabaId: user.wabaId,
                                metaPhoneNumberId: user.metaPhoneNumberId,
                                metaDisplayPhoneNumber: user.metaDisplayPhoneNumber,
                                metaQualityRating: user.metaQualityRating,
                                metaTier: user.metaTier,
                                metaVerifiedName: user.metaVerifiedName,
                                metaNameStatus: user.metaNameStatus
                            }
                        });
                    }
                } catch (phoneErr) {
                    console.error('[WA STATUS] Error fetching phone number directly:', phoneErr.response?.data || phoneErr.message);
                }
                return res.status(400).json({ error: 'WhatsApp Business Account ID (WABA ID) is not configured. Please re-connect via WhatsApp Settings.' });
            } else {
                return res.status(400).json({ error: 'WhatsApp is not fully connected. Please complete setup in WhatsApp Settings.' });
            }
        }

        // Fetch phone numbers from WABA
        const phoneResponse = await axios.get(`https://graph.facebook.com/v22.0/${wabaId}/phone_numbers`, {
            params: {
                fields: 'id,display_phone_number,quality_rating,messaging_limit_tier,verified_name,name_status',
                access_token: accessToken
            }
        });

        if (phoneResponse.data?.data?.length > 0) {
            const phoneData = phoneResponse.data.data[0];
            user.metaPhoneNumberId = phoneData.id;
            user.metaDisplayPhoneNumber = phoneData.display_phone_number;
            user.metaQualityRating = phoneData.quality_rating;
            user.metaVerifiedName = phoneData.verified_name;
            user.metaNameStatus = phoneData.name_status;

            // Fetch new portfolio-level messaging limit from WABA
            let portfolioLimit = null;
            try {
                const wabaRes = await axios.get(`https://graph.facebook.com/v22.0/${wabaId}`, {
                    params: {
                        fields: 'whatsapp_business_manager_messaging_limit',
                        access_token: accessToken
                    }
                });
                if (wabaRes.data && wabaRes.data.whatsapp_business_manager_messaging_limit) {
                    portfolioLimit = wabaRes.data.whatsapp_business_manager_messaging_limit.toString();
                }
            } catch (err) {
                console.warn('[WA STATUS] Could not fetch WABA portfolio limit, falling back to legacy tier:', err.response?.data?.error?.message || err.message);
            }

            // Prefer new portfolio limit if available, otherwise fallback to legacy phone tier
            user.metaTier = portfolioLimit || phoneData.messaging_limit_tier || 'UNKNOWN';

            // ── Fetch 24-hour Conversation Analytics from Meta ──────────────────
            // This gives us the real count of unique business-initiated conversations opened
            // in the last 24 hours, which is what the messaging limit tier actually governs.
            try {
                const nowTs = Math.floor(Date.now() / 1000);
                const dayAgoTs = nowTs - (24 * 60 * 60);
                const analyticsRes = await axios.get(`https://graph.facebook.com/v22.0/${wabaId}`, {
                    params: {
                        fields: `conversation_analytics.start(${dayAgoTs}).end(${nowTs}).granularity(DAILY).conversation_types(["BUSINESS_INITIATED"]).dimensions(["conversation_type"])`,
                        access_token: accessToken
                    }
                });
                const analyticsData = analyticsRes.data?.conversation_analytics?.data || [];
                let totalConversations = 0;
                for (const entry of analyticsData) {
                    for (const point of (entry.data_points || [])) {
                        totalConversations += (point.conversation || 0);
                    }
                }
                user.metaConversations24h = totalConversations;
                user.metaConversationsFetchedAt = new Date();
                console.log(`[WA STATUS] 24h conversation count fetched: ${totalConversations}`);
            } catch (analyticsErr) {
                console.warn('[WA STATUS] Could not fetch 24h conversation analytics:', analyticsErr.response?.data?.error?.message || analyticsErr.message);
                // Don't block status refresh if analytics fails
                if (user.metaConversations24h === null) {
                    user.metaConversations24h = 0;
                }
                user.metaConversationsFetchedAt = new Date();
            }

            await user.save();
        }

        res.json({
            message: 'Status refreshed successfully',
            user: {
                wabaId: user.wabaId,
                metaPhoneNumberId: user.metaPhoneNumberId,
                metaDisplayPhoneNumber: user.metaDisplayPhoneNumber,
                metaQualityRating: user.metaQualityRating,
                metaTier: user.metaTier,
                metaVerifiedName: user.metaVerifiedName,
                metaNameStatus: user.metaNameStatus,
                metaConversations24h: user.metaConversations24h,
                metaConversationsFetchedAt: user.metaConversationsFetchedAt
            }
        });
    } catch (error) {
        console.error('[WA DEBUG] Error refreshing Meta status:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh WhatsApp status' });
    }
});


// DELETE /api/whatsapp/disconnect
// Disconnects WhatsApp by clearing Meta tokens and WABA ID
router.delete('/disconnect', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Clear User model fields
        user.fbAccessToken = null;
        user.wabaId = null;
        user.metaPhoneNumberId = null;
        user.metaDisplayPhoneNumber = null;
        user.metaQualityRating = null;
        user.metaTier = null;
        user.metaVerifiedName = null;
        user.metaNameStatus = null;
        user.metaBusinessId = null;
        await user.save();

        // Clear all cached templates for this user since the WABA is disconnected
        try {
            const Template = require('../models/Template');
            await Template.destroy({ where: { userId: req.user.id } });
            console.log('[WA DISCONNECT] ✅ Cleared cached templates');
        } catch (templateErr) {
            console.error('[WA DISCONNECT] Failed to clear templates:', templateErr.message);
        }

        // Also clear the Settings table — this is what the messaging system actually reads
        try {
            const Settings = require('../models/Settings');
            const settings = await Settings.findOne({ where: { userId: req.user.id } });
            if (settings) {
                settings.metaAccessToken = '';
                settings.metaPhoneNumberId = '';
                settings.metaBusinessAccountId = '';
                await settings.save();
                console.log('[WA DISCONNECT] ✅ Settings table cleared');
            }
        } catch (settingsErr) {
            console.error('[WA DISCONNECT] Failed to clear Settings table:', settingsErr.message);
        }

        res.json({ message: 'WhatsApp disconnected successfully' });
    } catch (error) {
        console.error('WhatsApp Disconnect Error:', error);
        res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
    }
});


// POST /api/whatsapp/heal-settings
// One-shot repair: if a user completed Embedded Signup but their Settings table is missing
// the phone number ID or access token (due to the old overwrite-with-empty bug), this
// endpoint re-syncs the User model data into Settings without requiring a full re-connect.
router.post('/heal-settings', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const Settings = require('../models/Settings');
        let settings = await Settings.findOne({ where: { userId: user.id } });
        if (!settings) {
            settings = await Settings.create({ userId: user.id });
        }

        let healed = [];

        if (user.fbAccessToken && !settings.metaAccessToken) {
            settings.metaAccessToken = user.fbAccessToken;
            healed.push('metaAccessToken');
        }
        if (user.metaPhoneNumberId && !settings.metaPhoneNumberId) {
            settings.metaPhoneNumberId = user.metaPhoneNumberId;
            healed.push('metaPhoneNumberId');
        }
        if (user.wabaId && !settings.metaBusinessAccountId) {
            settings.metaBusinessAccountId = user.wabaId;
            healed.push('metaBusinessAccountId');
        }

        // Also force-sync if Settings has empty string (which also fails the guards)
        if (user.fbAccessToken && settings.metaAccessToken === '') {
            settings.metaAccessToken = user.fbAccessToken;
            healed.push('metaAccessToken (was empty string)');
        }
        if (user.metaPhoneNumberId && settings.metaPhoneNumberId === '') {
            settings.metaPhoneNumberId = user.metaPhoneNumberId;
            healed.push('metaPhoneNumberId (was empty string)');
        }
        if (user.wabaId && settings.metaBusinessAccountId === '') {
            settings.metaBusinessAccountId = user.wabaId;
            healed.push('metaBusinessAccountId (was empty string)');
        }

        if (healed.length > 0) {
            await settings.save();
            console.log(`[WA HEAL] ✅ Healed settings for user ${user.id}:`, healed);
            return res.json({
                success: true,
                message: `Settings repaired successfully. Fields synced: ${healed.join(', ')}.`,
                healed
            });
        }

        // Check what's still missing after heal attempt
        const missing = [];
        if (!settings.metaAccessToken) missing.push('Access Token (not found in User model either — please reconnect)');
        if (!settings.metaPhoneNumberId) missing.push('Phone Number ID (not found in User model — please reconnect)');
        if (!settings.metaBusinessAccountId) missing.push('WABA ID (not found in User model — please reconnect)');

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Could not fully repair — some values are missing from the User model too.',
                missing
            });
        }

        return res.json({ success: true, message: 'Settings already correctly configured. No changes needed.' });
    } catch (err) {
        console.error('[WA HEAL] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/whatsapp/register-phone
// One-shot repair: registers the phone number on the Cloud API for customers
// who are stuck in "Pending" status without needing to redo Embedded Signup.
// Uses the same PIN strategy as /exchange-token: last 6 digits of display phone number.
router.post('/register-phone', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const Settings = require('../models/Settings');
        const settings = await Settings.findOne({ where: { userId: req.user.id } });

        const phoneNumberId  = user.metaPhoneNumberId  || settings?.metaPhoneNumberId;
        const displayPhone   = user.metaDisplayPhoneNumber || '';
        const accessToken    = user.fbAccessToken       || settings?.metaAccessToken;

        if (!phoneNumberId || !accessToken) {
            return res.status(400).json({ error: 'WhatsApp is not configured. Please complete Embedded Signup first.' });
        }

        // Derive PIN from last 6 digits of the customer's WhatsApp Business phone number
        const digitsOnly = displayPhone.replace(/\D/g, '');
        const registrationPin = digitsOnly.length >= 6
            ? digitsOnly.slice(-6)
            : (process.env.WA_REGISTRATION_PIN || '000000');

        console.log(`[WA REGISTER] Registering phone ${displayPhone} (ID: ${phoneNumberId}) for user ${user.id}...`);

        const regRes = await axios.post(
            `https://graph.facebook.com/v22.0/${phoneNumberId}/register`,
            {
                messaging_product: 'whatsapp',
                pin: registrationPin
            },
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        console.log('[WA REGISTER] ✅ Registration successful:', JSON.stringify(regRes.data));

        return res.json({
            success: true,
            message: `Phone number ${displayPhone || phoneNumberId} registered successfully on the WhatsApp Cloud API. Status should change to Connected within a few minutes.`,
            data: regRes.data
        });

    } catch (err) {
        const errData = err.response?.data?.error;

        // 80007 = already registered — treat as success
        if (errData?.code === 80007) {
            return res.json({
                success: true,
                message: 'Phone number is already registered on the Cloud API. No action needed.',
                alreadyRegistered: true
            });
        }

        console.error('[WA REGISTER] ❌ Registration failed:', errData || err.message);
        return res.status(500).json({
            error: errData?.message || err.message,
            code: errData?.code,
            hint: errData?.code === 10
                ? 'This phone number may already be registered under a different WABA or BSP. The customer must release it from that account first via Meta Business Manager.'
                : errData?.code === 131031
                ? 'Business verification is required before a phone number can be registered.'
                : null
        });
    }
});

// GET /api/whatsapp/quality-insights
// Fetches live quality score + block reasons from Meta for the user's phone number.
// Used by the Dashboard "Quality Rating" card to show a detailed popup modal.
router.get('/quality-insights', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const Settings = require('../models/Settings');
        const settings = await Settings.findOne({ where: { userId: req.user.id } });

        // Resolve phone number ID and access token (same fallback chain as /status)
        const phoneNumberId = user.metaPhoneNumberId || settings?.metaPhoneNumberId;
        const accessToken   = user.fbAccessToken || settings?.metaAccessToken;

        if (!phoneNumberId || !accessToken) {
            return res.status(400).json({ error: 'WhatsApp is not fully connected. Please complete setup in WhatsApp Settings.' });
        }

        // Call Meta Graph API — quality_score field returns: { score: "RED"|"YELLOW"|"GREEN", reasons: [...] }
        const metaRes = await axios.get(`https://graph.facebook.com/v22.0/${phoneNumberId}`, {
            params: {
                fields: 'quality_score,display_phone_number',
                access_token: accessToken
            }
        });

        const qualityScore = metaRes.data?.quality_score || {};
        const score        = qualityScore.score || user.metaQualityRating || 'UNKNOWN';
        const rawReasons   = qualityScore.reasons || [];

        // Log raw Meta response for debugging
        console.log(`[QUALITY INSIGHTS] Raw Meta quality_score:`, JSON.stringify(qualityScore));

        // Human-readable mapping for ALL known Meta block reason codes
        const reasonDescriptions = {
            // Standard block reason codes
            SPAM:                   { label: 'Spam Reports', description: 'Users flagged your messages as spam. Avoid bulk promotional messages and only contact opted-in users.', prevention: 'Ensure strict opt-in compliance and avoid sending repetitive promotional blasts.', severity: 'high' },
            STOP_SENDING:           { label: 'Stop Sending Requests', description: 'Users explicitly replied asking you to stop. Always include a clear opt-out mechanism in every marketing message.', prevention: 'Add interactive "Opt-out" or "Stop" quick reply buttons to marketing templates.', severity: 'high' },
            BLOCKED_BY_USERS:       { label: 'Blocked by Users', description: 'A significant number of users blocked your number. This is the most common cause of quality drops — review your message content and frequency.', prevention: 'Segment your audience to send highly relevant, personalized messages instead of generic broadcasts.', severity: 'high' },
            UNDEFINED:              { label: 'Unspecified Reason', description: 'Users blocked without selecting a specific reason. This may indicate message irrelevance, too-high frequency, or unrecognized sender name.', prevention: 'Ensure your display name is recognizable and you provide clear value in the first interaction.', severity: 'medium' },
            UNKNOWN:                { label: 'Unknown Reason', description: 'Meta could not determine the specific reason for blocking.', prevention: 'Review your general messaging strategy against Meta\'s Commerce and Business policies.', severity: 'low' },
            HIGH_MESSAGE_FREQUENCY: { label: 'Too Many Messages', description: 'You are sending messages too frequently to the same users. Space out your campaigns and reduce daily message volume.', prevention: 'Implement frequency capping (e.g., maximum 2 marketing messages per user per week).', severity: 'high' },
            INAPPROPRIATE_CONTENT:  { label: 'Inappropriate Content', description: 'Messages contained content users found inappropriate or offensive. Review your templates against WhatsApp Commerce and Business policies.', prevention: 'Audit your message content and tone for professionalism and compliance.', severity: 'high' },
            NOT_OPTED_IN:           { label: 'No User Opt-in', description: 'You are sending messages to contacts who never explicitly opted in to receive them. Only contact users who have consented.', prevention: 'Implement double opt-in flows and regularly clean your contact list of inactive users.', severity: 'high' },
            SEE_GUIDELINES:         { label: 'Guideline Violation', description: 'Meta detected a general policy concern with your messaging patterns. Review the WhatsApp Business Messaging Policy and Meta\'s best practices for template messages.', prevention: 'Consult Meta\'s official guidelines on high-quality template writing and targeting.', severity: 'medium' },
            NONE:                   { label: 'No Specific Reason', description: 'Meta has not identified a specific block reason at this time. Monitor your quality rating over the next 24–48 hours.', prevention: 'Maintain baseline good practices: clear opt-outs, relevant content, and reasonable frequency.', severity: 'low' },
        };

        // Meta can return reasons as plain strings ["SPAM"] OR as objects [{ reason: "SPAM", description: "..." }]
        // Normalize both formats into a consistent shape
        const enrichedReasons = rawReasons.map((item) => {
            // Handle object format: { reason: "CODE", description: "Meta's text" }
            const code = (typeof item === 'object' && item !== null) ? (item.reason || item.code || 'UNKNOWN') : String(item);
            const metaDescription = (typeof item === 'object' && item !== null) ? item.description : null;

            const mapped = reasonDescriptions[code];
            return {
                code,
                label:       mapped?.label       || code.replace(/_/g, ' '),
                description: mapped?.description || metaDescription || 'No additional details available for this reason.',
                prevention:  mapped?.prevention  || 'Review your overall messaging practices for relevance and user consent.',
                severity:    mapped?.severity    || 'medium',
            };
        });

        // Fetch paused templates — use raw SQL so we can handle missing pauseReason column gracefully
        const Template = require('../models/Template');
        let pausedTemplates = [];
        try {
            pausedTemplates = await Template.findAll({
                where: { userId: user.id, status: 'PAUSED' },
                attributes: ['id', 'name', 'category', 'updatedAt']
            });
        } catch (dbErr) {
            console.warn('[QUALITY INSIGHTS] Could not fetch paused templates:', dbErr.message);
        }

        // Try to also get pauseReason — might not exist on older DB schemas
        let pauseReasonMap = {};
        try {
            const { sequelize } = require('../config/database');
            const rows = await sequelize.query(
                `SELECT id, "pauseReason" FROM "Templates" WHERE "userId" = :userId AND status = 'PAUSED'`,
                { replacements: { userId: user.id }, type: sequelize.QueryTypes.SELECT }
            );
            rows.forEach(r => { pauseReasonMap[r.id] = r.pauseReason; });
        } catch (_) {
            // Column doesn't exist yet — that's fine, will show blank
        }

        console.log(`[QUALITY INSIGHTS] User ${user.id} | Score: ${score} | Reasons: ${rawReasons.join(', ')}`);

        return res.json({
            score,
            reasons: enrichedReasons,
            displayPhoneNumber: metaRes.data?.display_phone_number || user.metaDisplayPhoneNumber,
            pausedTemplates: pausedTemplates.map(t => ({
                id: t.id,
                name: t.name,
                category: t.category,
                pauseReason: pauseReasonMap[t.id] || null,
                pausedAt: t.updatedAt
            })),
            fetchedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('[QUALITY INSIGHTS] Error:', error.response?.data || error.message);
        // Graceful degradation: return cached data from DB if Meta API call fails
        try {
            const userFallback = await User.findByPk(req.user.id);
            const Template = require('../models/Template');
            let pausedTemplates = [];
            try {
                pausedTemplates = await Template.findAll({
                    where: { userId: req.user.id, status: 'PAUSED' },
                    attributes: ['id', 'name', 'category', 'updatedAt']
                });
            } catch (_) { /* table might have issues */ }
            return res.json({
                score: userFallback?.metaQualityRating || 'UNKNOWN',
                reasons: [],
                displayPhoneNumber: userFallback?.metaDisplayPhoneNumber,
                pausedTemplates: pausedTemplates.map(t => ({ id: t.id, name: t.name, category: t.category, pauseReason: null, pausedAt: t.updatedAt })),
                fetchedAt: new Date().toISOString(),
                apiError: 'Could not reach Meta API. Showing cached data only.'
            });
        } catch (fallbackErr) {
            return res.status(500).json({ error: 'Failed to fetch quality insights.' });
        }
    }
});

// POST /api/whatsapp/log-onboarding-error
// Intercepts Meta Embedded Signup errors from the frontend popup and logs them to ActivityLog
router.post('/log-onboarding-error', auth, async (req, res) => {
    try {
        const { errorPayload } = req.body;
        if (!errorPayload) {
            return res.status(400).json({ error: 'Missing error payload' });
        }

        let rawError = errorPayload.error_message || errorPayload.errorMessage || JSON.stringify(errorPayload);
        let rootCause = 'Unknown Meta API Error';
        let fixAction = 'Please ensure your Meta App permissions and Business Manager roles are correctly configured.';

        // Meta Error Dictionary
        if (rawError.includes('1349246') || rawError.includes('assets were not granted')) {
            rootCause = 'Permission Denied: User lacks Admin rights, OR Meta App lacks Advanced Access.';
            fixAction = 'Ensure the Facebook user logging in is a Full Admin of their Meta Business Manager. If they are, ensure your Meta App has "Advanced Access" for the business_management permission in App Review.';
        } else if (rawError.includes('113') || rawError.includes('User cannot access')) {
            rootCause = 'Access Denied: The user does not have access to this WABA or App.';
            fixAction = 'Verify the user has access to the WhatsApp Business Account in Business Manager.';
        } else if (rawError.includes('1349139') || rawError.includes('User must verify their identity')) {
            rootCause = 'Identity Verification Required';
            fixAction = 'The user must go to business.facebook.com/support and complete identity verification or resolve restrictions on their account.';
        }

        const details = JSON.stringify({
            rawError,
            rootCause,
            fixAction,
            fullPayload: errorPayload
        }, null, 2);

        // Log to server console so it appears in Railway/Docker logs too
        console.warn('[WA ONBOARDING ERROR]', { userId: req.user.id, rootCause, rawError });

        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create({
            userId: req.user.id,
            action: 'WHATSAPP_ONBOARDING_ERROR',
            details: details,
            ip: req.ip || req.connection.remoteAddress
        });

        res.json({ success: true, message: 'Error logged for admin review.' });
    } catch (err) {
        console.error('[WA DEBUG] Failed to log onboarding error:', err.message);
        res.status(500).json({ error: 'Failed to log error' });
    }
});

module.exports = router;

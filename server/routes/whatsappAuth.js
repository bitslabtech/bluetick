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
                        fields: 'id,display_phone_number,quality_rating,messaging_limit_tier,verified_name,name_status',
                        access_token: accessToken
                    }
                });
                const phoneData = phoneRes.data;
                if (phoneData?.id) {
                    console.log('[WA DEBUG] ✅ Phone Data via hintPhoneNumberId:', JSON.stringify(phoneData));
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
                        fields: 'id,display_phone_number,quality_rating,messaging_limit_tier,verified_name,name_status',
                        access_token: accessToken
                    }
                });
                if (phoneResponse.data?.data?.length > 0) {
                    const phoneData = phoneResponse.data.data[0];
                    console.log('[WA DEBUG] Phone Data fetched from WABA list:', JSON.stringify(phoneData));
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

        // Save all fields to User model
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
            // Always clear stale phone/waba fields first — prevents old email-as-ID from persisting
            settings.metaPhoneNumberId = user.metaPhoneNumberId || '';
            settings.metaBusinessAccountId = wabaId || settings.metaBusinessAccountId || '';
            await settings.save();
            console.log('[WA DEBUG] ✅ Settings table synced → token set, metaPhoneNumberId:', settings.metaPhoneNumberId, ', wabaId:', settings.metaBusinessAccountId);
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
        let wabaId      = user.wabaId;

        // Fallback: use Settings-based WhatsApp credentials
        if (!accessToken || !wabaId) {
            if (settings?.metaAccessToken && settings?.metaBusinessAccountId) {
                accessToken = settings.metaAccessToken;
                wabaId      = settings.metaBusinessAccountId;
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
                        user.metaPhoneNumberId       = phoneData.id;
                        user.metaDisplayPhoneNumber  = phoneData.display_phone_number;
                        user.metaQualityRating        = phoneData.quality_rating;
                        user.metaTier                 = phoneData.messaging_limit_tier;
                        user.metaVerifiedName         = phoneData.verified_name;
                        user.metaNameStatus           = phoneData.name_status;
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
            user.metaPhoneNumberId      = phoneData.id;
            user.metaDisplayPhoneNumber = phoneData.display_phone_number;
            user.metaQualityRating       = phoneData.quality_rating;
            user.metaTier                = phoneData.messaging_limit_tier;
            user.metaVerifiedName        = phoneData.verified_name;
            user.metaNameStatus          = phoneData.name_status;
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
                metaNameStatus: user.metaNameStatus
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

module.exports = router;

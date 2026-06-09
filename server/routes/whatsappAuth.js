const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');

// POST /api/whatsapp/exchange-token
// Exchanges the Facebook OAuth code for a System User Access Token and retrieves the WABA ID
router.post('/exchange-token', auth, async (req, res) => {
    try {
        const { code } = req.body;
        console.log('[WA DEBUG] ========== /exchange-token START ==========');
        console.log('[WA DEBUG] User ID:', req.user?.id);
        console.log('[WA DEBUG] Received code:', code ? `${code.substring(0, 20)}... (length: ${code.length})` : '(MISSING!)');

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

        // 1. Exchange 'code' for 'access_token'
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

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            console.error('[WA DEBUG] ❌ No access_token in response:', JSON.stringify(tokenResponse.data));
            return res.status(400).json({ error: 'Failed to retrieve access token from Meta' });
        }
        console.log('[WA DEBUG] ✅ Got access_token (length:', accessToken.length, ')');

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

        const wabaId = debugData.granular_scopes?.find(s => s.scope === 'whatsapp_business_management')?.target_ids?.[0]
            || debugData.profile_id;
        console.log('[WA DEBUG] Extracted wabaId:', wabaId || '(not found)');

        // 3. Save to User Model
        console.log('[WA DEBUG] Step 3: Saving to User model...');
        const user = await User.findByPk(req.user.id);
        if (!user) {
            console.error('[WA DEBUG] ❌ User not found for id:', req.user.id);
            return res.status(404).json({ error: 'User not found' });
        }

        // 4. Fetch Phone Number details (Tier, Quality Rating)
        console.log('[WA DEBUG] Step 3: Fetching Phone Numbers for WABA...');
        try {
            const phoneResponse = await axios.get(`https://graph.facebook.com/v22.0/${wabaId}/phone_numbers`, {
                params: {
                    fields: 'id,display_phone_number,quality_rating,messaging_limit_tier,verified_name,name_status',
                    access_token: accessToken
                }
            });
            if (phoneResponse.data?.data?.length > 0) {
                const phoneData = phoneResponse.data.data[0];
                console.log('[WA DEBUG] Phone Data fetched:', JSON.stringify(phoneData));
                user.metaPhoneNumberId = phoneData.id;
                user.metaDisplayPhoneNumber = phoneData.display_phone_number;
                user.metaQualityRating = phoneData.quality_rating;
                user.metaTier = phoneData.messaging_limit_tier;
                user.metaVerifiedName = phoneData.verified_name;
                user.metaNameStatus = phoneData.name_status;
            }
        } catch (phoneErr) {
            console.error('[WA DEBUG] Error fetching phone numbers:', phoneErr.response?.data || phoneErr.message);
        }

        user.fbAccessToken = accessToken;
        if (wabaId) user.wabaId = wabaId;
        await user.save();
        console.log('[WA DEBUG] ✅ User saved. wabaId:', user.wabaId);
        console.log('[WA DEBUG] ========== /exchange-token SUCCESS ==========');

        res.json({
            message: 'WhatsApp Business connected successfully',
            wabaId: user.wabaId,
            user: {
                fbAccessToken: user.fbAccessToken,
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
                fbAccessToken: user.fbAccessToken,
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

        user.fbAccessToken = null;
        user.wabaId = null;
        user.metaPhoneNumberId = null;
        user.metaDisplayPhoneNumber = null;
        user.metaQualityRating = null;
        user.metaTier = null;
        user.metaVerifiedName = null;
        user.metaNameStatus = null;
        await user.save();

        res.json({ message: 'WhatsApp disconnected successfully' });
    } catch (error) {
        console.error('WhatsApp Disconnect Error:', error);
        res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
    }
});

module.exports = router;

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

        if (!code) {
            return res.status(400).json({ error: 'OAuth code is required from the frontend' });
        }

        const clientId = process.env.FB_CLIENT_ID;
        const clientSecret = process.env.FB_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error("Missing FB_CLIENT_ID or FB_CLIENT_SECRET in .env");
            return res.status(500).json({ error: 'Server configuration missing for WhatsApp integration' });
        }

        // 1. Exchange 'code' for 'access_token'
        console.log("Exchanging code for token via Graph API...");
        const tokenResponse = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
            params: {
                client_id: clientId,
                client_secret: clientSecret,
                code: code
            }
        });

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            return res.status(400).json({ error: 'Failed to retrieve access token from Meta' });
        }

        // 2. Debug the token to extract 'waba_id' (WhatsApp Business Account ID)
        // Note: The embedded signup token usually belongs to the newly shared WABA
        console.log("Debugging token to fetch WABA ID...");
        const debugResponse = await axios.get('https://graph.facebook.com/v22.0/debug_token', {
            params: {
                input_token: accessToken,
                access_token: `${clientId}|${clientSecret}` // App Access Token
            }
        });

        const debugData = debugResponse.data.data;
        if (!debugData || !debugData.is_valid) {
            return res.status(401).json({ error: 'Generated token is invalid according to Meta Debug Tool' });
        }

        // Specifically look for granular scopes or associated waba_id. 
        // With Embedded Signup, the waba_id is often returned in the debug response, or we have to query client's businesses
        const wabaId = debugData.granular_scopes?.find(s => s.scope === 'whatsapp_business_management')?.target_ids?.[0]
            || debugData.profile_id; // Fallback if scopes don't explicitly list it easily

        // 3. Save to User Model
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.fbAccessToken = accessToken;
        if (wabaId) user.wabaId = wabaId;
        await user.save();

        res.json({
            message: 'WhatsApp Business connected successfully',
            wabaId: user.wabaId
        });

    } catch (error) {
        console.error('WhatsApp Exchange Token Error:', error?.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to complete WhatsApp signup process. Please try again.',
            details: error?.response?.data?.error?.message || error.message
        });
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
        await user.save();

        res.json({ message: 'WhatsApp disconnected successfully' });
    } catch (error) {
        console.error('WhatsApp Disconnect Error:', error);
        res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
    }
});

module.exports = router;

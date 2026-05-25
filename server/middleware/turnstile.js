const axios = require('axios');

const verifyTurnstile = async (req, res, next) => {
    // Skip captcha check in development if needed, or if no secret is configured
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
        console.warn('[TURNSTILE] Secret key is missing. Bypassing captcha validation. Please add TURNSTILE_SECRET_KEY to .env');
        return next();
    }

    const token = req.body['cf-turnstile-response'];
    if (!token) {
        return res.status(403).json({ msg: 'Please complete the captcha challenge.' });
    }

    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);

    try {
        const formData = new URLSearchParams();
        formData.append('secret', turnstileSecret);
        formData.append('response', token);
        formData.append('remoteip', ip);

        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const outcome = response.data;
        if (outcome.success) {
            // Validation passed
            return next();
        } else {
            console.error('[TURNSTILE] Validation failed:', outcome['error-codes']);
            return res.status(403).json({ msg: 'Captcha validation failed. Please try again.' });
        }
    } catch (err) {
        console.error('[TURNSTILE] Server error during validation:', err.message);
        return res.status(500).json({ msg: 'Server error during captcha validation.' });
    }
};

module.exports = verifyTurnstile;

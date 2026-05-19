const express = require('express');
const router = express.Router();

// Public Privacy Policy page — required for Meta App Live Mode
router.get('/privacy-policy', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #333; line-height: 1.7; }
        .container { max-width: 820px; margin: 0 auto; padding: 48px 24px; background: white; min-height: 100vh; }
        h1 { font-size: 2rem; font-weight: 700; color: #111; margin-bottom: 8px; }
        .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        h2 { font-size: 1.15rem; font-weight: 600; color: #111; margin: 32px 0 12px; }
        p { color: #555; margin-bottom: 12px; font-size: 0.95rem; }
        ul { color: #555; margin: 8px 0 12px 20px; font-size: 0.95rem; }
        li { margin-bottom: 6px; }
        a { color: #25D366; text-decoration: none; }
        .badge { display: inline-block; background: #25D366; color: white; font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin-left: 10px; vertical-align: middle; }
    </style>
</head>
<body>
<div class="container">
    <h1>Privacy Policy <span class="badge">Bluetick</span></h1>
    <p class="subtitle">Last updated: February 2026</p>

    <p>This Privacy Policy describes how we collect, use, and protect information when you use our WhatsApp messaging platform.</p>

    <h2>1. Information We Collect</h2>
    <p>We collect the following types of information:</p>
    <ul>
        <li><strong>Account information:</strong> Name, email address, and business details when you register.</li>
        <li><strong>WhatsApp data:</strong> Phone numbers, message content, and delivery status of messages sent through our platform.</li>
        <li><strong>Usage data:</strong> Campaign statistics, contact lists, and message templates you create.</li>
        <li><strong>Technical data:</strong> IP addresses, browser type, and device information for security purposes.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
        <li>To provide and operate our WhatsApp messaging services</li>
        <li>To send WhatsApp messages on your behalf via the Meta WhatsApp Business API</li>
        <li>To display message delivery and read status in your dashboard</li>
        <li>To generate campaign analytics and reports</li>
        <li>To maintain security and prevent fraud</li>
    </ul>

    <h2>3. WhatsApp Business API</h2>
    <p>Our platform uses the Meta WhatsApp Business API to send and receive messages. By using our service, you agree to comply with <a href="https://www.whatsapp.com/legal/business-policy" target="_blank">WhatsApp's Business Policy</a> and <a href="https://www.whatsapp.com/legal/terms-of-service" target="_blank">Terms of Service</a>.</p>
    <p>Message content transmitted through our platform is subject to WhatsApp's own privacy practices. We do not sell message content to third parties.</p>

    <h2>4. Data Sharing</h2>
    <p>We do not sell, rent, or share your personal information with third parties except:</p>
    <ul>
        <li>Meta Platforms Inc. (for WhatsApp API delivery)</li>
        <li>When required by law or legal process</li>
        <li>With your explicit consent</li>
    </ul>

    <h2>5. Data Security</h2>
    <p>We implement industry-standard security measures including encryption, access controls, and secure data storage to protect your information. However, no system is 100% secure and we cannot guarantee absolute security.</p>

    <h2>6. Data Retention</h2>
    <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting us.</p>

    <h2>7. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
        <li>Access and export your personal data</li>
        <li>Correct inaccurate information</li>
        <li>Delete your account and associated data</li>
        <li>Opt-out of marketing communications</li>
    </ul>

    <h2>8. Contact Us</h2>
    <p>If you have questions about this Privacy Policy, please contact us through your account dashboard or reach out to our support team.</p>

    <h2>9. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of our service after changes constitutes acceptance of the updated policy.</p>
</div>
</body>
</html>`);
});

// Public Terms of Service page
router.get('/terms', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #333; line-height: 1.7; }
        .container { max-width: 820px; margin: 0 auto; padding: 48px 24px; background: white; min-height: 100vh; }
        h1 { font-size: 2rem; font-weight: 700; color: #111; margin-bottom: 8px; }
        .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        h2 { font-size: 1.15rem; font-weight: 600; color: #111; margin: 32px 0 12px; }
        p { color: #555; margin-bottom: 12px; font-size: 0.95rem; }
        ul { color: #555; margin: 8px 0 12px 20px; font-size: 0.95rem; }
        li { margin-bottom: 6px; }
    </style>
</head>
<body>
<div class="container">
    <h1>Terms of Service</h1>
    <p class="subtitle">Last updated: February 2026</p>

    <p>By using our WhatsApp Cloud messaging platform, you agree to these Terms of Service. Please read them carefully.</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using our service, you confirm that you are at least 18 years old, have the authority to accept these terms, and agree to comply with them.</p>

    <h2>2. Permitted Use</h2>
    <p>You may use our platform only for lawful business communication purposes in compliance with WhatsApp's Business Policy. You agree not to send spam, unsolicited messages, or violate Meta's messaging guidelines.</p>

    <h2>3. Account Responsibility</h2>
    <p>You are responsible for maintaining the security of your account and all activity that occurs under your account.</p>

    <h2>4. Termination</h2>
    <p>We reserve the right to terminate accounts that violate these Terms or WhatsApp's policies without prior notice.</p>

    <h2>5. Limitation of Liability</h2>
    <p>Our service is provided "as is". We are not liable for message delivery failures, API downtime, or any indirect damages resulting from use of our platform.</p>

    <h2>6. Governing Law</h2>
    <p>These Terms are governed by applicable laws. Disputes shall be resolved through good-faith negotiation.</p>
</div>
</body>
</html>`);
});

module.exports = router;

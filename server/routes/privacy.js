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
    <p class="subtitle">Last updated: May 2026</p>

    <p>This Privacy Policy ("Policy") explains how our platform ("we", "us", "our") collects, uses, shares, and protects your personal data and Meta Platform Data when you use our WhatsApp Cloud messaging services.</p>
    
    <p>This Policy is designed to comply with applicable data protection laws and the strict requirements set forth by Meta Platforms, Inc. ("Meta") for developers and Tech Providers.</p>

    <h2>1. Information We Collect</h2>
    <p>In order to provide our services, we collect and process the following categories of data:</p>
    <ul>
        <li><strong>Account Information:</strong> Your name, email address, billing information, and business details provided during registration.</li>
        <li><strong>Meta Platform Data:</strong> Data obtained via Meta APIs, including WhatsApp Business Account IDs, phone number IDs, system user access tokens, messaging limits, and related profile information.</li>
        <li><strong>End-User Messaging Data:</strong> Phone numbers, chat history, opt-in statuses, and message content sent or received through your WhatsApp Business API integration.</li>
        <li><strong>Technical & Usage Data:</strong> IP addresses, browser types, device identifiers, and analytics regarding campaign performance and platform usage.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>We strictly limit the use of your data to the following purposes:</p>
    <ul>
        <li>To provide, operate, and maintain our WhatsApp messaging, broadcasting, and CRM services.</li>
        <li>To authenticate your access and facilitate API communication with Meta's infrastructure.</li>
        <li>To process transactions, send billing notices, and provide customer support.</li>
        <li>To monitor system health, detect fraud, and prevent malicious activity.</li>
    </ul>
    <p><strong>Crucial Meta Compliance Notice:</strong> We do not use Meta Platform Data for any purpose other than providing the specific functionality you requested. We explicitly do not use Platform Data for surveillance, unauthorized profiling, or discriminatory practices.</p>

    <h2>3. How We Share Your Information</h2>
    <p><strong>We do not sell, rent, or monetize your personal data or Meta Platform Data.</strong> Your data is only shared under these specific circumstances:</p>
    <ul>
        <li><strong>Service Providers (Data Processors):</strong> We may share data with trusted third-party infrastructure providers (such as cloud hosting and database providers) solely for the purpose of operating our service. These providers are bound by strict confidentiality agreements.</li>
        <li><strong>Meta Platforms, Inc.:</strong> As a WhatsApp Cloud API Tech Provider, necessary data is exchanged with Meta to facilitate message delivery and account management.</li>
        <li><strong>Legal Requirements:</strong> We may disclose data if legally required by valid law enforcement requests, court orders, or to protect the safety and rights of our users.</li>
    </ul>

    <h2>4. Data Security</h2>
    <p>We implement robust, industry-standard technical and organizational measures to secure your data against unauthorized access, alteration, or destruction. This includes encryption in transit (HTTPS/TLS) and at rest, secure API token storage, and strict access controls based on the principle of least privilege.</p>

    <h2>5. Data Retention and Deletion</h2>
    <p>We retain your data only for as long as your account is active or as necessary to provide our services and comply with legal obligations.</p>
    <ul>
        <li>If you choose to delete your account, we will permanently delete or anonymize your personal data and Meta Platform Data within 30 days, unless legally required to retain it.</li>
        <li>Meta Platform Data that is no longer needed for its original permitted purpose is automatically purged from our systems.</li>
    </ul>

    <h2>6. Your Privacy Rights</h2>
    <p>Depending on your jurisdiction, you hold several rights regarding your data:</p>
    <ul>
        <li><strong>Access and Portability:</strong> You may request a copy of the personal data we hold about you.</li>
        <li><strong>Correction:</strong> You can update or correct inaccurate data via your dashboard.</li>
        <li><strong>Deletion ("Right to be Forgotten"):</strong> You may request the complete deletion of your account and associated data.</li>
        <li><strong>Revocation of Access:</strong> You can revoke our access to your Meta Platform Data at any time through your Meta Business Settings (Business Integrations).</li>
    </ul>

    <h2>7. Compliance with Meta Terms</h2>
    <p>We are a registered Tech Provider and strictly adhere to the <a href="https://developers.facebook.com/terms/" target="_blank">Meta Platform Terms</a> and the <a href="https://www.whatsapp.com/legal/business-policy" target="_blank">WhatsApp Business Policy</a>. We ensure that our data handling practices protect end-user privacy and prevent the unauthorized transfer of Meta Platform Data.</p>

    <h2>8. Contact Us</h2>
    <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact our Data Protection Officer / Support Team via the contact form on our website or through your dashboard.</p>
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

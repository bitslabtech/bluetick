import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';

const PrivacyPolicy = () => {
    return (
        <PublicLayout title="Privacy Policy" pageKey="privacy">
            <p className="text-slate-500 mb-8 font-medium">Last updated: July 2026 | Effective: July 2026</p>

            <p className="mb-6 text-slate-700 dark:text-slate-300 leading-relaxed">
                This Privacy Policy explains how Bluetick ("we", "our", or "us") collects, uses, stores, and protects your information when you use our SaaS platform. By using our services, you agree to the practices described in this policy.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4">1. Information We Collect</h2>

            <h3 className="text-lg font-semibold mt-6 mb-2 text-slate-800 dark:text-slate-200">1.1 Account &amp; Registration Information</h3>
            <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400">
                <li>Full name, business name, and email address</li>
                <li>Phone number (used for WhatsApp OTP verification and linking your WhatsApp Business Account)</li>
                <li>Password (stored in hashed format — never stored in plain text)</li>
                <li>Billing address and GST / Tax identification number (if applicable)</li>
                <li>Country and currency preference</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2 text-slate-800 dark:text-slate-200">1.2 Data from Meta Platforms (WhatsApp, Facebook, Instagram)</h3>
            <p className="mb-2 text-slate-600 dark:text-slate-400">
                When you connect your Meta WhatsApp Business Account via our Embedded Signup flow (powered by Facebook Login / Meta Business Manager), we collect and store the following data on your behalf:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400">
                <li><strong>WhatsApp Business Account (WABA) ID</strong> — your unique Meta WhatsApp Business Account identifier</li>
                <li><strong>WhatsApp Phone Number ID</strong> — the ID of the phone number linked to your WABA</li>
                <li><strong>WhatsApp Business Phone Number</strong> — the actual business phone number registered on WhatsApp</li>
                <li><strong>Display Name</strong> — the WhatsApp Business display name configured in Meta Business Manager</li>
                <li><strong>Facebook User Access Token &amp; System Token</strong> — OAuth 2.0 tokens used to authorize API calls on your behalf. Short-lived tokens are exchanged for long-lived system tokens, stored in AES-256 encrypted form on our servers. These are never exposed in client-side code, browser logs, or HTTP responses.</li>
                <li><strong>Business Verification Status</strong> — whether your Meta Business Manager is verified by Meta</li>
                <li><strong>Account Quality Rating</strong> — the quality score of your WhatsApp Business Account as reported by Meta</li>
                <li><strong>Messaging Tier</strong> — your WhatsApp messaging tier (e.g., 1K, 10K, 100K messages/day)</li>
                <li><strong>Message Template Status</strong> — approval, rejection, or pause status of templates submitted to Meta</li>
                <li><strong>Click-to-WhatsApp (CTWA) Analytics</strong> — ad performance data from Meta Ads including impressions, clicks, and conversations initiated from CTWA ads (only if CTWA Analytics is enabled in your plan)</li>
                <li><strong>Meta Ads Account ID &amp; Campaign Data</strong> — if you connect Meta Ads Manager, we access ad account IDs, campaign names, ad sets, budgets, and performance metrics (spend, reach, conversions)</li>
                <li><strong>Facebook Page ID</strong> — if a Facebook Page is linked to your WhatsApp Business Account</li>
                <li><strong>Instagram Business Account ID</strong> — if linked to your Meta Business Manager for Ads or audience insights</li>
                <li><strong>Meta Webhook Event Payloads</strong> — raw event data sent by Meta to our webhook endpoint, including: incoming message notifications, message status updates (sent, delivered, read, failed), template approval/rejection callbacks, and account quality change alerts</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2 text-slate-800 dark:text-slate-200">1.3 WhatsApp Message Data</h3>
            <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400">
                <li><strong>Contact phone numbers</strong> — numbers you import, add manually, or receive messages from</li>
                <li><strong>Message content</strong> — text body, media captions, and interactive button responses of messages sent and received via our platform</li>
                <li><strong>Media files</strong> — images, videos, audio, and documents exchanged via WhatsApp (stored in encrypted cloud storage)</li>
                <li><strong>Message templates</strong> — the content of templates you create and submit to Meta for approval</li>
                <li><strong>Delivery and read receipts</strong> — per-message status (sent, delivered, read, failed, expired)</li>
                <li><strong>Broadcast campaign data</strong> — recipient lists, campaign name, content, scheduled times, and performance analytics</li>
                <li><strong>FlowBot automation flows</strong> — trigger conditions, decision nodes, and response messages of automated chatbots you build</li>
                <li><strong>Quick replies and saved responses</strong> — pre-saved reply templates used in the Inbox</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2 text-slate-800 dark:text-slate-200">1.4 Contact &amp; CRM Data</h3>
            <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400">
                <li>Customer names, phone numbers, email addresses, and custom CRM fields</li>
                <li>Contact tags, segments, and groups you create</li>
                <li>Conversation history and agent notes</li>
                <li>Opt-in and opt-out status for WhatsApp marketing messages</li>
                <li>Lead source and demo request details (if captured via the Book Demo form)</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2 text-slate-800 dark:text-slate-200">1.5 Online Store &amp; eCommerce Data</h3>
            <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400">
                <li>Product catalog — names, prices, images, stock levels, categories</li>
                <li>Customer orders — items, quantities, delivery address, and order status</li>
                <li>Payment gateway transaction reference IDs — we do not store full card numbers; payments are processed by third-party gateways (e.g., Razorpay, Stripe)</li>
                <li>Coupon codes and discount rules</li>
                <li>Store theme and branding customizations</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2 text-slate-800 dark:text-slate-200">1.6 Digital Business Card (vCard) &amp; NFC Data</h3>
            <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400">
                <li>Profile information in your vCard — name, job title, photo, website, social links, and phone numbers</li>
                <li>QR code scan events and vCard view analytics (scan count, approximate region if available from browser)</li>
                <li>NFC card identifiers linked to your digital profile</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2 text-slate-800 dark:text-slate-200">1.7 Technical &amp; Usage Data</h3>
            <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400">
                <li>IP address and approximate geolocation (country/city — derived from IP, not GPS)</li>
                <li>Browser type, device type, and operating system</li>
                <li>Login timestamps and session activity</li>
                <li>Aggregated feature usage analytics for product improvement — not linked to individual identities</li>
                <li>Error logs and crash reports — used for debugging; message content is never included in error logs</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-600 dark:text-slate-400">
                <li>To authenticate you and maintain your account securely</li>
                <li>To send WhatsApp messages on your behalf via the Meta WhatsApp Business Cloud API</li>
                <li>To display message delivery, read status, and campaign analytics in your dashboard</li>
                <li>To process subscription payments and generate tax-compliant invoices</li>
                <li>To provide the Online Store, vCard, FlowBot Automation, Growth Hub, and all other platform features</li>
                <li>To sync and display data from Meta Ads Manager and CTWA analytics (if connected)</li>
                <li>To send transactional notifications — billing receipts, plan expiry alerts, WhatsApp quality alerts, OTP messages</li>
                <li>To improve our platform through aggregated, anonymized analytics</li>
                <li>To comply with Meta's Platform Policies, WhatsApp Business Policy, and applicable law</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4">3. WhatsApp Business API &amp; Meta Platform</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
                Our platform is a Meta Business Tech Provider using Meta's official WhatsApp Business Cloud API. We use Facebook Login (OAuth 2.0) for the Embedded Signup flow so you can connect your WABA without sharing your Meta password with us.
            </p>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
                <strong>Important:</strong> WhatsApp Business API messages are processed through Meta's cloud infrastructure and are not end-to-end encrypted in the same way as personal WhatsApp messages. Meta may access message content per their own policies. We recommend not transmitting highly sensitive data (e.g., passwords, financial credentials, health records) through WhatsApp Business API messages.
            </p>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
                Meta API data (ad performance, CTWA analytics, account status) is subject to Meta's own data retention and deletion policies. We act as a data processor for this data on your behalf — you remain the data controller.
            </p>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
                By using our platform, you agree to comply with{' '}
                <a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp's Business Policy</a>,{' '}
                <a href="https://developers.facebook.com/policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta's Platform Policies</a>, and{' '}
                <a href="https://www.whatsapp.com/legal/commerce-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp's Commerce Policy</a>.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4">4. Data Sharing</h2>
            <p className="mb-2 text-slate-600 dark:text-slate-400">We do not sell, rent, or share your personal data with third parties except in the following cases:</p>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-600 dark:text-slate-400">
                <li><strong>Meta Platforms Inc.</strong> — for WhatsApp Business Cloud API message delivery, template management, CTWA analytics, and Meta Ads Manager integration</li>
                <li><strong>Payment Gateways</strong> — Razorpay, Stripe, or similar processors for subscription billing</li>
                <li><strong>Cloud Infrastructure</strong> — AWS, Cloudflare for hosting, CDN, media storage, and DDoS protection</li>
                <li><strong>Email Service Providers</strong> — for transactional emails (billing receipts, OTPs, system alerts)</li>
                <li><strong>Legal Requirement</strong> — in response to a valid legal order, court subpoena, or government authority request under applicable law</li>
                <li><strong>Business Transfer</strong> — in a merger, acquisition, or asset sale, with advance notice provided to you</li>
                <li><strong>With Your Explicit Consent</strong> — for any other purpose disclosed to you at the time of collection</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4">5. Data Retention</h2>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-600 dark:text-slate-400">
                <li>Account and profile data is retained for the duration of your subscription plus 90 days after cancellation</li>
                <li>WhatsApp message logs and campaign data are retained for up to 12 months by default</li>
                <li>Billing and invoice records are retained for 7 years as required by Indian GST and tax law</li>
                <li>Meta access tokens are deleted when you disconnect your WhatsApp account</li>
                <li>You may request earlier deletion by emailing <a href="mailto:privacy@bluetick.in" className="text-primary hover:underline">privacy@bluetick.in</a> — subject to mandatory legal retention obligations</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4">6. Your Rights</h2>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-600 dark:text-slate-400">
                <li><strong>Right to Access:</strong> Request a copy of all personal data we hold about you</li>
                <li><strong>Right to Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Right to Deletion:</strong> Request deletion of your account and associated personal data</li>
                <li><strong>Right to Portability:</strong> Request an export of your contacts and campaign data</li>
                <li><strong>Right to Withdraw Meta Authorization:</strong> Revoke our access to your Meta account anytime via Meta Business Manager › Apps &amp; Integrations. Revoking access stops our platform from sending WhatsApp messages on your behalf.</li>
                <li><strong>Right to Object:</strong> Object to processing of your data for specific purposes</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4">7. Security</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
                We implement industry-standard security measures including AES-256 encryption for stored access tokens, TLS/HTTPS for all data in transit, Cloudflare WAF and DDoS protection, bcrypt-hashed passwords, rate limiting on all API endpoints, and role-based access controls. Our infrastructure is hosted in ISO-certified data centres. No system guarantees 100% security — you are responsible for keeping your login credentials confidential.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4">8. Cookies &amp; Local Storage</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
                We use session cookies and browser localStorage to maintain your logged-in state and save preferences (e.g., dark mode). We do not use third-party advertising or behavioural tracking cookies. Cloudflare Turnstile (our CAPTCHA provider) may set a functional cookie for bot-protection. Facebook's JavaScript SDK — used exclusively for the WhatsApp Embedded Signup flow — may set cookies governed by Meta's Cookie Policy.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4">9. Children's Privacy</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
                Our platform is designed for business use and is not intended for individuals under 18 years of age. We do not knowingly collect data from minors. If you believe a minor has submitted their data to us, contact <a href="mailto:privacy@bluetick.in" className="text-primary hover:underline">privacy@bluetick.in</a> for immediate removal.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4">10. Changes to This Policy</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
                We may update this Privacy Policy periodically. The "Last updated" date at the top reflects the most recent revision. For material changes, we will notify you via email and/or an in-dashboard notice at least 7 days before changes take effect.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4">11. Contact Us &amp; Grievance Officer</h2>
            <p className="mb-2 text-slate-600 dark:text-slate-400">
                For privacy questions, data access/deletion requests, or complaints under India's IT Act 2000 and IT (Intermediary Guidelines &amp; Digital Media Ethics Code) Rules 2021:
            </p>
            <ul className="list-none pl-0 mb-6 space-y-1 text-slate-600 dark:text-slate-400">
                <li><strong>Company:</strong> Bitslab Technologies</li>
                <li><strong>Grievance Officer:</strong> Authorised Representative</li>
                <li><strong>Email:</strong> <a href="mailto:privacy@bluetick.in" className="text-primary hover:underline">privacy@bluetick.in</a></li>
                <li><strong>Address:</strong> [Registered Business Address, India]</li>
                <li><strong>Response Time:</strong> Acknowledgement within 72 hours; resolution within 30 days as required by IT Rules 2021.</li>
            </ul>
        </PublicLayout>
    );
};

export default PrivacyPolicy;

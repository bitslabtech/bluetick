import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';

const PrivacyPolicy = () => {
    return (
        <PublicLayout title="Privacy Policy" pageKey="privacy">
            <p className="text-slate-500 mb-8 font-medium">Last updated: February 2026</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
            <p>We collect the following types of information when you use our platform:</p>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-600 dark:text-slate-400">
                <li><strong>Account information:</strong> Name, email address, and business details when you register.</li>
                <li><strong>WhatsApp data:</strong> Phone numbers, message content, and delivery status of messages sent through our platform.</li>
                <li><strong>Usage data:</strong> Campaign statistics, contact lists, and message templates you create.</li>
                <li><strong>Technical data:</strong> IP addresses, browser type, and device information for security purposes.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-600 dark:text-slate-400">
                <li>To provide and operate our WhatsApp messaging services.</li>
                <li>To send WhatsApp messages on your behalf via the Meta WhatsApp Business API.</li>
                <li>To display message delivery and read status in your dashboard.</li>
                <li>To generate campaign analytics and reports.</li>
                <li>To maintain security and prevent fraud.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. WhatsApp Business API</h2>
            <p className="mb-4">
                Our platform uses the Meta WhatsApp Business API to send and receive messages. By using our service, you agree to comply with WhatsApp's Business Policy and Terms of Service.
            </p>
            <p className="mb-6">
                Message content transmitted through our platform is subject to WhatsApp's own privacy practices. We do not sell message content to third parties.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Sharing</h2>
            <p className="mb-4">We do not sell, rent, or share your personal information with third parties except:</p>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-600 dark:text-slate-400">
                <li>Meta Platforms Inc. (for WhatsApp API delivery)</li>
                <li>When required by law or legal process</li>
                <li>With your explicit consent</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Contact Us</h2>
            <p>
                If you have questions about this Privacy Policy, please contact us through your account dashboard or reach out to our support team.
            </p>
        </PublicLayout>
    );
};

export default PrivacyPolicy;

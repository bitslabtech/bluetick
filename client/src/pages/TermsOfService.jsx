import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';

const TermsOfService = () => {
    return (
        <PublicLayout title="Terms of Service" pageKey="terms">
            <p className="text-slate-500 mb-8 font-medium">Last updated: February 2026</p>
            
            <p className="mb-6 text-lg text-slate-700 dark:text-slate-300">
                By using our WhatsApp Cloud messaging platform, you agree to these Terms of Service. Please read them carefully.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="mb-6">
                By accessing or using our service, you confirm that you are at least 18 years old, have the authority to accept these terms, and agree to comply with them.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. Permitted Use</h2>
            <p className="mb-6">
                You may use our platform only for lawful business communication purposes in compliance with WhatsApp's Business Policy. You agree not to send spam, unsolicited messages, or violate Meta's messaging guidelines.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. Account Responsibility</h2>
            <p className="mb-6">
                You are responsible for maintaining the security of your account and all activity that occurs under your account.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Termination</h2>
            <p className="mb-6">
                We reserve the right to terminate accounts that violate these Terms or WhatsApp's policies without prior notice.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Limitation of Liability</h2>
            <p className="mb-6">
                Our service is provided "as is". We are not liable for message delivery failures, API downtime, or any indirect damages resulting from use of our platform.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">6. Governing Law</h2>
            <p className="mb-6">
                These Terms are governed by applicable laws. Disputes shall be resolved through good-faith negotiation.
            </p>
        </PublicLayout>
    );
};

export default TermsOfService;

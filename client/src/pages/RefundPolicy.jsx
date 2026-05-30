import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';

const RefundPolicy = () => {
    return (
        <PublicLayout title="Cancellation & Refund Policy" pageKey="refund-policy">
            <p className="text-slate-500 mb-8 font-medium">Last updated: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            
            <p className="mb-6 text-lg text-slate-700 dark:text-slate-300">
                Thank you for choosing our WhatsApp Cloud messaging platform. Please read our cancellation and refund policy carefully before subscribing to any of our plans.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. No Refund Policy</h2>
            <p className="mb-6 text-slate-700 dark:text-slate-300">
                Due to the nature of digital software and direct integration costs with Meta's WhatsApp APIs, <strong>we do not offer refunds</strong> for any paid subscription plans or services once they are purchased. 
                This applies to all monthly, half-yearly, and annual plans.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. Free Trial & Evaluation</h2>
            <p className="mb-6 text-slate-700 dark:text-slate-300">
                We strongly encourage all users to utilize our free trial options or the basic free plan to fully evaluate our platform, features, and compatibility before committing to a paid subscription.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. Cancellation Policy</h2>
            <p className="mb-6 text-slate-700 dark:text-slate-300">
                You can cancel your subscription at any time directly from your billing dashboard. 
                When you cancel, your account will remain active for the remainder of your current paid billing cycle. 
                Once the cycle concludes, you will not be charged again, and your account will revert to the default free plan.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Dispute and Complaint Resolution</h2>
            <p className="mb-6 text-slate-700 dark:text-slate-300">
                If you encounter any critical bugs, downtime issues, or billing discrepancies, please reach out to our support team immediately. 
                While refunds are strictly not provided, we will actively work with you to resolve technical issues, apply service credits if deemed appropriate by management, or assist you with account configurations.
            </p>
            
            <p className="mt-10 font-bold text-slate-900 dark:text-white">
                By subscribing to our services, you acknowledge and agree to this Cancellation and Refund Policy.
            </p>
        </PublicLayout>
    );
};

export default RefundPolicy;

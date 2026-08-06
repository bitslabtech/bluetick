import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';

const RefundPolicy = () => {
    return (
        <PublicLayout title="Cancellation & Refund Policy" pageKey="refund-policy">
            <p className="text-slate-500 mb-8 font-medium">Last updated: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-10 shadow-sm">
                <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-2">48-Hour Satisfaction Guarantee</h3>
                <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    We stand behind the quality and reliability of our SaaS platform. If you are not entirely satisfied with your subscription, you may request a full refund within <strong>48 hours</strong> from the exact time of your initial purchase.
                </p>
            </div>

            <p className="mb-8 text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                This policy is designed to give you peace of mind while evaluating our platform. By subscribing to our services and authorizing payments through our partner gateways (e.g., Stripe, Razorpay), you agree to the following terms regarding cancellations and refunds.
            </p>

            <div className="space-y-10">
                <section>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">1</span>
                        Eligibility for Refunds
                    </h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <li><strong>Initial Purchases:</strong> You are eligible for a full refund on your first subscription purchase if the request is submitted within exactly 48 hours of the transaction timestamp.</li>
                        <li><strong>Renewals:</strong> Auto-renewals are generally non-refundable. We send reminder notices prior to billing, and you have full control to cancel your subscription at any time before the renewal date.</li>
                        <li><strong>API Usage Exception:</strong> If you have consumed a significant amount of Meta WhatsApp API resources, message credits, or server bandwidth within the first 48 hours, a proportionate amount may be deducted from the refund to cover these hard costs.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">2</span>
                        How to Request a Refund
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                        To initiate a refund request within the 48-hour window, please follow these steps:
                    </p>
                    <ol className="list-decimal pl-6 space-y-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <li>Log in to your account dashboard and navigate to the <strong>Support</strong> section.</li>
                        <li>Open a new support ticket categorized under <strong>Billing & Refunds</strong>.</li>
                        <li>Provide your registered email address, Order ID, and a brief explanation of why the platform did not meet your expectations. (Your feedback helps us improve!)</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">3</span>
                        Processing Timelines
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Once your refund request is received and approved by our billing team, the refund will be initiated immediately. 
                        Please note that depending on your banking institution and the payment gateway used, it may take <strong>5 to 7 business days</strong> for the funds to reflect in your original payment method. We can only issue refunds back to the original source of payment.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">4</span>
                        Subscription Cancellations
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        You may cancel your auto-renewing subscription at any time via the <strong>Billing & Plans</strong> section of your dashboard. 
                        Canceling your subscription prevents future charges but does not grant a refund for the current billing cycle. Your premium features will remain fully active until the end of your paid cycle.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">5</span>
                        Chargebacks and Payment Disputes
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        We kindly ask that you contact our support team to resolve any billing issues before initiating a dispute or chargeback with your bank. Unwarranted chargebacks may result in the immediate and permanent suspension of your account and associated WhatsApp API access while the dispute is investigated.
                    </p>
                </section>
            </div>
            
            <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                <p className="font-bold text-slate-900 dark:text-white mb-2">
                    Need Help with Billing?
                </p>
                <p className="text-sm text-slate-500">
                    Our dedicated support team is ready to assist you. Please reach out via the Support desk in your dashboard for prompt resolution.
                </p>
            </div>
        </PublicLayout>
    );
};

export default RefundPolicy;

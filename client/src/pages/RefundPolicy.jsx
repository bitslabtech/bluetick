import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';

const RefundPolicy = () => {
    return (
        <PublicLayout title="Cancellation & Refund Policy" pageKey="refund-policy">
            <p className="text-slate-500 mb-8 font-medium">Last updated: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-6 rounded-r-xl mb-10">
                <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-2">Strictly Non-Refundable Service</h3>
                <p className="text-amber-700 dark:text-amber-300">
                    As a digital Software-as-a-Service (SaaS) platform integrating directly with Meta's Official WhatsApp APIs, our services are provisioned instantaneously upon payment. <strong>All subscription fees, add-on purchases, and API consumption charges are strictly non-refundable.</strong>
                </p>
            </div>

            <p className="mb-8 text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                By subscribing to our platform and authorizing payment through our gateways (e.g., Stripe, Razorpay), you explicitly agree to this Cancellation and Refund Policy. We maintain this strict policy to ensure compliance with our banking partners and to sustain the continuous uptime of our high-bandwidth server infrastructure.
            </p>

            <div className="space-y-12">
                <section>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">1</span>
                        Nature of Digital Services
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Our platform provides immediate, irrevocable access to digital software, cloud hosting, and real-time API integrations. Once a payment is processed, the system automatically allocates server resources, database clusters, and registers your official WhatsApp Business profile with Meta. Because these backend resources are instantly consumed and cannot be "returned" like physical goods, we cannot offer refunds.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">2</span>
                        Evaluation via Free Tier
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        We provide ample opportunities to evaluate our platform before committing financially. Users are strongly encouraged to utilize our Free Tier or trial periods to test the interface, compatibility, and API stability. Upgrading to a paid subscription is a voluntary acknowledgment that the software meets your business requirements. "Lack of usage" or "change of mind" after purchase does not qualify for a refund.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">3</span>
                        Subscription Cancellations
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                        You hold full control over your billing cycle. You may cancel your auto-renewing subscription at any time via the <strong>Billing & Plans</strong> section of your dashboard. 
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
                        <li><strong>No Pro-rated Refunds:</strong> Canceling your subscription simply disables the auto-renewal for the next billing cycle. We do not provide partial or pro-rated refunds for unused days in your current cycle.</li>
                        <li><strong>Continued Access:</strong> Your account and premium features will remain fully active until the very last day of your paid cycle, after which it will safely downgrade to the free plan.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">4</span>
                        Chargebacks and Payment Disputes
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        We have a zero-tolerance policy for fraudulent chargebacks. If you initiate an unwarranted dispute or chargeback with your bank or credit card provider regarding a valid subscription charge, your account, associated phone numbers, and WhatsApp API access will be <strong>permanently suspended immediately</strong>. We will submit all necessary verifiable logs (including login history, API usage, and IP logs) to the payment gateway to contest the chargeback.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm">5</span>
                        Exceptional Circumstances
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        While our no-refund policy is firm, we recognize that extreme anomalies (such as duplicate billing errors caused by payment gateway timeouts) can occur. In the event of a verified double-charge for the exact same invoice, our billing team will manually reverse the duplicate transaction upon receiving a support ticket within 7 days of the occurrence.
                    </p>
                </section>
            </div>
            
            <div className="mt-12 p-6 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <p className="font-bold text-slate-900 dark:text-white">
                    By making a payment to our platform, you legally acknowledge and accept these terms.
                </p>
                <p className="text-sm text-slate-500 mt-2">
                    For billing inquiries or to report duplicate charges, please contact our support desk from your dashboard.
                </p>
            </div>
        </PublicLayout>
    );
};

export default RefundPolicy;

import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';

const AboutUs = () => {
    return (
        <PublicLayout title="About Us" pageKey="about">
            <h2 className="text-2xl font-bold mt-8 mb-4">Our Mission</h2>
            <p className="mb-6 text-lg text-slate-700 dark:text-slate-300">
                We are building the most powerful and intuitive WhatsApp Business API platform for modern businesses to connect with their customers at scale.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Why We Started</h2>
            <p className="mb-6">
                Customer communication has evolved, but the tools haven't kept up. We wanted to build a platform that isn't just a basic messaging tool, but an entire ecosystem for sales, marketing, and support — all within WhatsApp.
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 rounded-2xl p-4 md:p-8 my-10">
                <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">Our Values</h3>
                <ul className="list-disc pl-5 space-y-2 text-indigo-800 dark:text-indigo-200">
                    <li><strong>Customer First:</strong> We build for the people who use our product every day.</li>
                    <li><strong>Simplicity:</strong> Powerful shouldn't mean complicated.</li>
                    <li><strong>Reliability:</strong> 99.9% uptime isn't a goal, it's a standard.</li>
                    <li><strong>Innovation:</strong> Always shipping features that actually move the needle.</li>
                </ul>
            </div>
            
            <p className="text-center font-medium mt-12 text-slate-500">
                Want to know more? Feel free to reach out to our team at any time.
            </p>
        </PublicLayout>
    );
};

export default AboutUs;

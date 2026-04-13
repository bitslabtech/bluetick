import React from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../components/landing/PublicLayout';
import { Briefcase, Zap, DollarSign, ArrowRight } from 'lucide-react';

const PartnerWithUs = () => {
    return (
        <PublicLayout title="Partner with Us" pageKey="partner">
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                Join our ecosystem and grow your business. Help your clients leverage the power of official API messaging while earning recurring revenue.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Recurring Commissions</h3>
                    <p className="text-sm text-slate-500">Earn up to 30% recurring lifetime commission on every client you bring to the platform.</p>
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 mx-auto mb-4">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Agency Dashboard</h3>
                    <p className="text-sm text-slate-500">Manage all your client accounts from a single interface. Add team members and track everything.</p>
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                        <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Priority Support</h3>
                    <p className="text-sm text-slate-500">Get direct access to our tech team for onboarding your complex enterprise clients.</p>
                </div>
            </div>

            <div className="bg-indigo-600 rounded-3xl p-10 text-center text-white">
                <h3 className="text-3xl font-bold mb-4">Ready to become a partner?</h3>
                <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
                    Sign up, generate your unique partner code, and start earning today. Or contact our partnership team for custom agency deals.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link to="/register" className="px-8 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2">
                        Become a Partner <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link to="/contact" className="px-8 py-3 bg-indigo-700 text-white font-bold border border-indigo-500 rounded-xl hover:bg-indigo-800 transition-colors">
                        Contact Partner Team
                    </Link>
                </div>
            </div>
        </PublicLayout>
    );
};

export default PartnerWithUs;

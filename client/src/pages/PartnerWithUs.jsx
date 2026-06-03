import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PublicLayout from '../components/landing/PublicLayout';
import {
    Briefcase, Zap, DollarSign, ArrowRight, Layers,
    TrendingUp, Globe, CheckCircle2, Share2, Users,
    Code, Server, ShieldCheck, HeartHandshake, ArrowDown
} from 'lucide-react';

const PartnerWithUs = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <PublicLayout title="" pageKey="partner" fullWidth={true}>
            {/* 1. HERO SECTION */}
            <section className="relative pt-32 pb-7 sm:pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[#F5F5F7] dark:bg-black">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-w-full h-[600px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/40 rounded-full text-indigo-700 dark:text-indigo-400 text-sm font-black uppercase tracking-widest mb-6"
                    >
                        <HeartHandshake className="w-4 h-4" /> Partner Ecosystem
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight text-slate-900 dark:text-white leading-[1.1] max-w-4xl mx-auto"
                    >
                        Grow Your Business With <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Our Platform</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed"
                    >
                        Whether you are an individual looking to earn premium bonuses or a business / agency looking to partner with us for dedicated cash commissions, we have a path for you.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <a href="#affiliate" className="w-full sm:w-auto px-4 md:px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 dark:shadow-white/10 text-lg">
                            Referral Program <ArrowDown className="w-5 h-5" />
                        </a>
                        <a href="#tech-partner" className="w-full sm:w-auto px-4 md:px-8 py-4 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-lg">
                            Agency & Tech Partner <ArrowDown className="w-5 h-5" />
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* 2. AFFILIATE PROGRAM SECTION */}
            <section id="affiliate" className="py-24 bg-white dark:bg-[#05050A] border-t border-slate-200 dark:border-white/5 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 max-w-full h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-8 shadow-sm border border-emerald-200 dark:border-emerald-500/20">
                                <TrendingUp className="w-8 h-8" />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white leading-tight">
                                Referral Program
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                                Invite your friends and colleagues to the platform. When they join, <strong className="text-emerald-600 dark:text-emerald-400">both you and your referral get extra subscription months and bonus AI tokens</strong>.
                            </p>

                            <div className="space-y-6 mb-10">
                                {[
                                    { title: 'Double-Sided Rewards', desc: 'It is a win-win. Both you and your referral receive premium bonuses upon activation.' },
                                    { title: 'Free Subscription Months', desc: 'Extend your platform access automatically with free months of our premium plans.' },
                                    { title: 'Bonus AI Tokens', desc: 'Supercharge your FlowBot with thousands of free AI tokens for every successful invite.' }
                                ].map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{feature.title}</h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{feature.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-4 md:px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30">
                                Register to Get Link <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="lg:w-1/2 w-full">
                            {/* Infographic for Affiliate */}
                            <div className="bg-slate-50 dark:bg-[#111115] border border-slate-200 dark:border-white/10 rounded-3xl p-4 md:p-8 relative">
                                <h3 className="text-xl font-bold mb-8 text-center text-slate-900 dark:text-white">How it works</h3>
                                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[27px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-white/10 before:to-transparent">
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-14 h-14 rounded-full border-4 border-white dark:border-[#111115] bg-emerald-500 text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <Share2 className="w-6 h-6" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                                            <h4 className="font-bold text-slate-900 dark:text-white">1. Share Your Link</h4>
                                            <p className="text-sm text-slate-500 mt-1">Distribute your unique referral URL on social media, blogs, or emails.</p>
                                        </div>
                                    </div>
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-14 h-14 rounded-full border-4 border-white dark:border-[#111115] bg-emerald-500 text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                                            <h4 className="font-bold text-slate-900 dark:text-white">2. Clients Subscribe</h4>
                                            <p className="text-sm text-slate-500 mt-1">Users sign up through your link and purchase a premium subscription.</p>
                                        </div>
                                    </div>
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-14 h-14 rounded-full border-4 border-white dark:border-[#111115] bg-emerald-500 text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-500/20">
                                            <h4 className="font-bold text-emerald-900 dark:text-emerald-400">3. Both Get Rewarded</h4>
                                            <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1">Both of your accounts are instantly credited with free months and AI tokens!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. TECH PARTNER PROGRAM SECTION */}
            <section id="tech-partner" className="py-24 bg-slate-50 dark:bg-[#0A0A0F] border-t border-slate-200 dark:border-white/5 relative overflow-hidden">
                <div className="absolute left-0 bottom-0 w-96 max-w-full h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="lg:w-1/2">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-8 shadow-sm border border-blue-200 dark:border-blue-500/20">
                                <Layers className="w-8 h-8" />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white leading-tight">
                                Tech Partner Program
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                                Perfect for influencers, businesses, and agencies. Get approved as an official partner in our Tech Partner program to receive a unique tracking link and earn <strong className="text-blue-600 dark:text-blue-400">up to 30% cash commissions</strong> on every sale you drive.
                            </p>

                            <div className="space-y-6 mb-10">
                                {[
                                    { title: 'Custom Commission Structures', desc: 'Increase your earnings up to 30% on every subscription as you advance.' },
                                    { title: 'Custom Discount Coupons', desc: 'Secure deals by offering unique discount codes. You can even pass a portion of your commission as a discount to your clients.' },
                                    { title: 'Premium Marketing Assets', desc: 'Access a complete library of high-quality marketing materials, pitch decks, and graphics to help you close deals faster.' }
                                ].map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{feature.title}</h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{feature.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-4 md:px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                                Register to Apply <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="lg:w-1/2 w-full">
                            {/* Infographic for Tech Partner */}
                            <div className="bg-white dark:bg-[#15151A] border border-slate-200 dark:border-white/10 rounded-3xl p-4 md:p-8 relative shadow-xl">
                                <h3 className="text-xl font-bold mb-8 text-center text-slate-900 dark:text-white">Partner Payout Flow</h3>

                                <div className="flex flex-col items-center relative">
                                    {/* Layer 1: Partner Link */}
                                    <div className="w-full max-w-sm bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-500 rounded-2xl p-4 flex items-center gap-4 relative z-10 shadow-lg shadow-blue-500/10">
                                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                                            <Share2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Your Tracking Link</div>
                                            <div className="font-bold text-blue-900 dark:text-blue-100">?partner=YOURCODE</div>
                                        </div>
                                    </div>

                                    {/* Connection */}
                                    <div className="h-10 border-l-2 border-dashed border-slate-300 dark:border-white/20 w-0"></div>
                                    <ArrowDown className="w-5 h-5 text-slate-400 -mt-2 mb-2" />

                                    {/* Layer 2: Client Signs up */}
                                    <div className="w-full max-w-sm bg-slate-100 dark:bg-black border border-slate-300 dark:border-white/20 rounded-2xl p-4 flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-xl bg-slate-500 text-white flex items-center justify-center shrink-0">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Conversion</div>
                                            <div className="font-bold text-slate-900 dark:text-white">Client Purchases Plan</div>
                                        </div>
                                    </div>

                                    {/* Connection */}
                                    <div className="h-10 border-l-2 border-dashed border-slate-300 dark:border-white/20 w-0"></div>
                                    <ArrowDown className="w-5 h-5 text-slate-400 -mt-2 mb-2" />

                                    {/* Layer 3: Payout */}
                                    <div className="w-full max-w-sm bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Commission Earned</div>
                                            <div className="font-bold text-emerald-900 dark:text-emerald-100">Cash Payout Tracked</div>
                                        </div>
                                    </div>

                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-transparent via-blue-500/10 dark:via-blue-500/5 to-transparent pointer-events-none -z-10 blur-xl"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. COMPARISON CTA */}
            <section className="py-24 bg-white dark:bg-black">
                <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-12 text-slate-900 dark:text-white">Which path is right for you?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        <div className="p-4 md:p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50">
                            <h3 className="text-2xl font-bold mb-2">Referral Program</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Best for existing users, advocates, and marketers.</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Dual-sided rewards (Both get extra months)</li>
                                <li className="flex gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Free AI Tokens for both of you</li>
                                <li className="flex gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Start sharing immediately</li>
                            </ul>
                            <button onClick={() => setIsModalOpen(true)} className="block w-full py-3 text-center bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90">Register to Get Link</button>
                        </div>

                        <div className="p-4 md:p-8 rounded-3xl border-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 relative">
                            <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">For Businesses</div>
                            <h3 className="text-2xl font-bold mb-2">Tech Partner Program</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Best for influencers, agencies, and core partners.</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Up to 30% cash commissions</li>
                                <li className="flex gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Offer custom deal discount coupons to your client</li>
                                <li className="flex gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Premium marketing asset library</li>
                            </ul>
                            <button onClick={() => setIsModalOpen(true)} className="block w-full py-3 text-center bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/25">Register to Apply</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-4 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-center mb-4 text-slate-900 dark:text-white">Registration Required</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
                            To become a partner, you must first create an account on our platform. Once registered, navigate to the <strong>Refer & Earn</strong> section in your dashboard to generate your link or apply for the Tech Partner program.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link to="/register" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl text-center hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25">
                                Create an Account
                            </Link>
                            <button onClick={() => setIsModalOpen(false)} className="w-full py-4 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white transition-colors">
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </PublicLayout>
    );
};

export default PartnerWithUs;

import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Lock, ArrowRight, CheckCircle2, Shield, Zap, TrendingUp, Cpu, Workflow } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TopHeader from '../components/TopHeader';


const featureData = {
    'FlowBot Builder': {
        icon: Workflow,
        color: 'from-blue-500 to-indigo-600',
        title: 'Automate Conversations 24/7',
        desc: 'Build intelligent, drag-and-drop conversational bots that qualify leads and support customers even while you sleep.'
    },
    'Digital veCard': {
        icon: Shield,
        color: 'from-emerald-400 to-teal-500',
        title: 'Modern Digital Networking',
        desc: 'Create beautiful, shareable digital business cards that capture leads instantly.'
    },
    'Online Store': {
        icon: TrendingUp,
        color: 'from-amber-400 to-orange-500',
        title: 'Sell Directly on WhatsApp',
        desc: 'Launch a fully featured e-commerce catalog natively integrated into your messaging flows.'
    },
    'Integrations & API': {
        icon: Cpu,
        color: 'from-purple-500 to-fuchsia-600',
        title: 'Connect Your Stack',
        desc: 'Seamlessly link your CRM, payment gateways, and third-party tools via our robust API and webhooks.'
    },
    'default': {
        icon: Zap,
        color: 'from-indigo-500 to-blue-600',
        title: 'Unlock Premium Capabilities',
        desc: 'Take your business growth to the next level with our advanced suite of professional tools.'
    }
};

const UpgradeFunnel = () => {
    const [searchParams] = useSearchParams();
    const featureName = searchParams.get('feature') || 'Premium Feature';
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const data = featureData[featureName] || featureData['default'];
    const Icon = data.icon;

    // Redirect admins/owners if they somehow hit this page directly but aren't restricted
    // Wait, admins are never restricted by plan, so if an admin is here, they might just be testing. Let them stay.
    
    // Abstract Animated Graphic Component
    const AnimatedGraphic = () => (
        <div className="relative w-full max-w-sm mx-auto h-64 md:h-80 flex items-center justify-center">
            {/* Background glowing orb */}
            <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 bg-gradient-to-br ${data.color} rounded-full blur-[80px] opacity-30`}
            />
            
            {/* Floating UI Elements */}
            <div className="relative w-full h-full">
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10"
                >
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${data.color} text-white mb-4`}>
                        <Icon className="w-12 h-12 mx-auto" />
                    </div>
                    <div className="h-2 w-24 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-2" />
                    <div className="h-2 w-16 bg-slate-200 dark:bg-white/10 rounded-full mx-auto" />
                </motion.div>

                <motion.div 
                    animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-10 right-4 z-10 bg-white dark:bg-surface-dark p-3 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 flex items-center gap-2"
                >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div className="h-2 w-12 bg-slate-200 dark:bg-white/10 rounded-full" />
                </motion.div>

                <motion.div 
                    animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-10 left-4 z-10 bg-white dark:bg-surface-dark p-3 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 flex items-center gap-2"
                >
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <div className="h-2 w-16 bg-slate-200 dark:bg-white/10 rounded-full" />
                </motion.div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-background-light dark:bg-background-dark">
            <TopHeader 
                title="Premium Feature Locked"
                subtitle={`Unlock ${featureName} to grow your business.`}
            />


            <main className="flex-1 flex items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
                    
                    {/* Left Side: Graphic */}
                    <div className="order-2 md:order-1 hidden md:block">
                        <AnimatedGraphic />
                    </div>

                    {/* Right Side: Copy & CTA */}
                    <div className="order-1 md:order-2 space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-500/20">
                            <Lock className="w-3.5 h-3.5" /> Feature Locked
                        </motion.div>
                        
                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            Unlock <span className={`text-transparent bg-clip-text bg-gradient-to-r ${data.color}`}>{featureName}</span>
                        </motion.h1>
                        
                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                            {data.title}. {data.desc}
                        </motion.p>
                        
                        {/* Mobile graphic representation */}
                        <div className="md:hidden block py-4">
                            <AnimatedGraphic />
                        </div>

                        {/* Prorated Billing Notice */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: 0.3 }}
                            className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">Fair & Smart Upgrades</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        You never pay twice. When you upgrade, the unused balance from your current plan is automatically applied as a discount. You only pay for the exact days you use the new plan!
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-4">
                            <button 
                                onClick={() => navigate('/billing')}
                                className={`group relative flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 bg-gradient-to-r ${data.color} text-white font-bold text-lg rounded-xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-1`}
                            >
                                Upgrade Plan Now
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            {user?.parentUserId && (
                                <p className="text-xs text-center md:text-left text-slate-400 mt-4">
                                    Note: You are a team member. Only the account owner can upgrade the plan.
                                </p>
                            )}
                        </motion.div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default UpgradeFunnel;

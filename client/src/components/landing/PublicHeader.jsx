import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageSquare } from 'lucide-react';
import axios from 'axios';

const PublicHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [config, setConfig] = useState(null);
    const [publicSettings, setPublicSettings] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [landingRes, settingsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/landing`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/settings/public`)
                ]);
                setConfig(landingRes.data);
                setPublicSettings(settingsRes.data);
            } catch (err) {
                console.error("Failed to load header config", err);
            }
        };
        fetchData();
    }, []);

    // Fallback UI to prevent LCP blocking while data fetches
    const brandName = publicSettings?.appName || config?.brand?.name || 'Bluetick';
    const logoUrl = publicSettings?.logoUrl || config?.brand?.logo;

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    {logoUrl ? (
                        <img src={logoUrl} alt={brandName} className="h-8 object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                    )}
                </Link>

                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <a href="/#platform" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Features</a>
                    <a href="/#solutions" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Solutions</a>
                    <a href="/#pricing" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Pricing</a>
                    <a href="/#faq" className="hover:text-indigo-600 dark:hover:text-white transition-colors">FAQ</a>
                    <div className="h-4 w-[1px] max-w-full bg-slate-300 dark:bg-white/10" />
                    <Link to="/login" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Log In</Link>
                    <Link to="/register" className="px-5 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all font-bold">
                        Get Started
                    </Link>
                </div>

                <button className="md:hidden text-slate-900 dark:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-white/10 overflow-hidden">
                        <div className="flex flex-col p-4 md:p-6 gap-6 text-center text-slate-600 dark:text-slate-300 font-semibold">
                            <a href="/#platform" onClick={() => setIsMenuOpen(false)}>Features</a>
                            <a href="/#solutions" onClick={() => setIsMenuOpen(false)}>Solutions</a>
                            <a href="/#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a>
                            <a href="/#faq" onClick={() => setIsMenuOpen(false)}>FAQ</a>
                            <div className="h-[1px] w-full bg-slate-200 dark:bg-white/10" />
                            <Link to="/login" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                            <Link to="/register" onClick={() => setIsMenuOpen(false)} className="bg-indigo-600 text-white py-3 rounded-full font-bold shadow-lg">Get Started</Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default PublicHeader;

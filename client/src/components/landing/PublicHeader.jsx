import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, MessageSquare, LayoutDashboard } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const PublicHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [config, setConfig] = useState(null);
    const [publicSettings, setPublicSettings] = useState(null);
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);

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
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Fallback UI to prevent LCP blocking while data fetches
    const brandName = publicSettings?.appName || config?.brand?.name || 'OneDash';
    const logoUrl = publicSettings?.logoUrl || config?.brand?.logo;

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    {loading ? (
                        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                    ) : logoUrl ? (
                        <img src={logoUrl} alt={brandName} height="32" className="h-8 w-auto object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                    )}
                </Link>

                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
                    <a href="/#capabilities-section" className="hover:text-indigo-600 transition-colors">Features</a>
                    <a href="/#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
                    <Link to="/faq" className="hover:text-indigo-600 transition-colors">FAQ</Link>
                    <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact Us</Link>
                    <div className="h-4 w-[1px] max-w-full bg-slate-300" />

                    {user ? (
                        <Link to="/dashboard" className="px-5 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all font-bold flex items-center gap-2">
                            <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className="hover:text-indigo-600 transition-colors">Log In</Link>
                            <Link to="/register" className="px-5 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all font-bold">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

                <button
                    className="md:hidden text-slate-900 p-2"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle Navigation Menu"
                    aria-expanded={isMenuOpen}
                >
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile menu — CSS transition, no framer-motion on critical path */}
            <div
                className={`md:hidden bg-white border-b border-slate-200 overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="flex flex-col p-4 md:p-6 gap-6 text-center text-slate-600 font-semibold">
                    <a href="/#capabilities-section" onClick={() => setIsMenuOpen(false)}>Features</a>
                    <a href="/#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a>
                    <Link to="/faq" onClick={() => setIsMenuOpen(false)}>FAQ</Link>
                    <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact Us</Link>
                    <div className="h-[1px] w-full bg-slate-200" />

                    {user ? (
                        <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="bg-indigo-600 text-white py-3 rounded-full font-bold shadow-lg flex items-center justify-center gap-2">
                            <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                            <Link to="/register" onClick={() => setIsMenuOpen(false)} className="bg-indigo-600 text-white py-3 rounded-full font-bold shadow-lg">Get Started</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default PublicHeader;

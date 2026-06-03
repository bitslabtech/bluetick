import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Twitter, Facebook, Linkedin, Instagram, MessageSquare, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import PublicHeader from './PublicHeader';
import FloatingChatbot from './FloatingChatbot';

const PublicLayout = ({ children, title, pageKey, fullWidth = false }) => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/landing`);
                setConfig(res.data);
                if (title) document.title = `${title} - ${res.data.brand?.name || 'Platform'}`;
            } catch (err) {
                console.error("Failed to load landing config", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [title]);

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-slate-900 dark:text-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!config) return <div className="text-center p-4 md:p-20 text-red-500">Failed to load configuration.</div>;

    const brandName = config.brand?.name || 'Platform';

    return (
        <div className="min-h-screen flex flex-col bg-[#F5F5F7] dark:bg-zinc-950 text-slate-900 dark:text-white font-display selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-200">
            {/* Global Header */}
            <PublicHeader />

            {/* Main Content */}
            <main className={`flex-1 ${fullWidth ? 'w-full' : 'pt-32 pb-7 sm:pb-20 px-6 max-w-4xl mx-auto w-full'}`}>
                {title && !fullWidth && (
                    <header className="mb-12 border-b border-slate-200 dark:border-white/10 pb-8">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{title}</h1>
                    </header>
                )}
                <div className={fullWidth ? 'w-full' : 'prose prose-slate dark:prose-invert max-w-none'}>
                    {(pageKey && config.publicPages?.[pageKey]) ? (
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(config.publicPages[pageKey]) }} />
                    ) : (
                        children
                    )}
                </div>
            </main>

            {/* Dynamic Footer */}
            <footer className="pt-20 pb-10 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 transition-colors mt-auto">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
                        <div className="col-span-2 lg:col-span-2 space-y-6">
                            <div className="flex items-center gap-3 font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
                                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                {brandName}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs">{config.brand?.footerText || 'The operating system for official WhatsApp Business API conversations.'}</p>
                            <div className="flex gap-4">
                                {[
                                    { id: 'twitter', icon: Twitter, defaultUrl: 'https://twitter.com' },
                                    { id: 'facebook', icon: Facebook, defaultUrl: 'https://facebook.com' },
                                    { id: 'linkedin', icon: Linkedin, defaultUrl: 'https://linkedin.com' },
                                    { id: 'instagram', icon: Instagram, defaultUrl: 'https://instagram.com' }
                                ].map((soc, index) => {
                                    const url = config.seo?.socialLinks?.[soc.id] || soc.defaultUrl;
                                    const SocIcon = soc.icon;
                                    return (
                                        <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white hover:bg-indigo-600 hover:text-white transition-colors">
                                            <SocIcon className="w-4 h-4" />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Render Dynamic Footer Columns */}
                        {config.footer?.columns && Array.isArray(config.footer.columns) ? (
                            config.footer.columns.map((col, idx) => (
                                <div key={idx}>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">{col.heading}</h4>
                                    <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
                                        {col.links && col.links.map((link, lIdx) => {
                                            const isExternal = link.href.startsWith('http');
                                            const isAnchor = link.href.startsWith('#');
                                            
                                            // Handle anchor links specially on separate pages
                                            let href = link.href;
                                            if (isAnchor && location.pathname !== '/') {
                                                href = `/${link.href}`;
                                            }

                                            if (isExternal) {
                                                return <li key={lIdx}><a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-white transition-colors">{link.label}</a></li>;
                                            } else if (isAnchor && location.pathname === '/') {
                                                return <li key={lIdx}><a href={href} className="hover:text-indigo-600 dark:hover:text-white transition-colors">{link.label}</a></li>;
                                            } else {
                                                return <li key={lIdx}><Link to={href} className="hover:text-indigo-600 dark:hover:text-white transition-colors">{link.label}</Link></li>;
                                            }
                                        })}
                                    </ul>
                                </div>
                            ))
                        ) : (
                           // Fallback to static columns if footer config is missing completely
                            <>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Product</h4>
                                    <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
                                        <li><Link to="/#platform" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Features</Link></li>
                                        <li><Link to="/#pricing" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Pricing</Link></li>
                                        <li><Link to="/blog" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Blog</Link></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Company</h4>
                                    <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
                                        <li><Link to="/about" className="hover:text-indigo-600 dark:hover:text-white transition-colors">About Us</Link></li>
                                        <li><Link to="/partner" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Partner with Us</Link></li>
                                        <li><Link to="/contact" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Contact Support</Link></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Legal</h4>
                                    <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
                                        <li><Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Privacy Policy</Link></li>
                                        <li><Link to="/terms" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Terms of Service</Link></li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500 dark:text-slate-500">
                        <div>
                            {config.footer?.bottomBarLeft 
                                ? config.footer.bottomBarLeft.replace('{year}', new Date().getFullYear()).replace('{brand}', brandName)
                                : `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`}
                        </div>
                        <div className="flex gap-4">
                            {config.footer?.bottomBarRight ? (
                                config.footer.bottomBarRight.split(/•|\|/).map((part, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && <span>•</span>}
                                        <span>{part.trim()}</span>
                                    </React.Fragment>
                                ))
                            ) : (
                                <>
                                    <span>Built for Scale</span>
                                    <span>•</span>
                                    <span>99.9% Uptime</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
            {/* Global Chatbot */}
            <FloatingChatbot config={config} />
        </div>
    );
};

export default PublicLayout;

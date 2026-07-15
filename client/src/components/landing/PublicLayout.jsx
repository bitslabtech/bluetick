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
            <div className="min-h-screen bg-[#F5F5F7] text-slate-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!config) return <div className="text-center p-4 md:p-20 text-red-500">Failed to load configuration.</div>;

    const brandName = config.brand?.name || 'Platform';

    return (
        <div className="min-h-screen flex flex-col bg-[#F5F5F7] text-slate-900 font-display selection:bg-indigo-500/30 selection:text-indigo-900">
            {/* Global Header */}
            <PublicHeader />

            {/* Main Content */}
            <main className={`flex-1 ${fullWidth ? 'w-full' : 'pt-32 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full'}`}>
                {title && !fullWidth && (
                    <header className="mb-10 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-5">{title}</h1>
                        <div className="w-16 h-1.5 bg-indigo-600 mx-auto rounded-full opacity-80"></div>
                    </header>
                )}
                <div className={fullWidth ? 'w-full' : 'bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-6 sm:p-10 md:p-14 prose prose-slate md:prose-lg max-w-none overflow-hidden break-words'}>
                    {(() => {
                        const content = pageKey ? config.publicPages?.[pageKey] : null;
                        const hasRealContent = content && typeof content === 'string' && content.replace(/<[^>]*>?/gm, '').trim().length > 0;
                        
                        if (hasRealContent) {
                            return <div className="max-w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, { ADD_ATTR: ['class', 'style', 'target', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'href', 'src', 'alt', 'title'], ADD_TAGS: ['iframe', 'style', 'script'] }) }} />;
                        }
                        return children;
                    })()}
                </div>
            </main>

            {/* Dynamic Footer */}
            <footer className="pt-20 pb-10 border-t border-slate-200 bg-slate-50 transition-colors mt-auto">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
                        <div className="col-span-2 lg:col-span-2 space-y-6">
                            <div className="flex items-center gap-3 font-extrabold text-2xl tracking-tight text-slate-900">
                                {config.brand?.logo ? (
                                    <img src={config.brand.logo} alt="Logo" className="h-10 object-contain" />
                                ) : (
                                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                                        <MessageSquare className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                {[
                                    { id: 'twitter', icon: Twitter },
                                    { id: 'facebook', icon: Facebook },
                                    { id: 'linkedin', icon: Linkedin },
                                    { id: 'instagram', icon: Instagram }
                                ].map(({ id, icon: Icon }) => {
                                    const url = config.seo?.socialLinks?.[id];
                                    if (!url) return null;
                                    return (
                                        <a key={id} href={url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-indigo-600 hover:text-white transition-colors">
                                            <Icon className="w-4 h-4" />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Render Dynamic Footer Columns */}
                        {config.footer?.columns && Array.isArray(config.footer.columns) ? (
                            config.footer.columns.map((col, idx) => (
                                <div key={idx}>
                                    <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-sm">{col.heading}</h4>
                                    <ul className="space-y-4 text-slate-600 font-medium">
                                        {col.links && col.links.map((link, lIdx) => {
                                            const isExternal = link.href.startsWith('http');
                                            const isAnchor = link.href.startsWith('#');
                                            
                                            // Handle anchor links specially on separate pages
                                            let href = link.href;
                                            if (isAnchor && location.pathname !== '/') {
                                                href = `/${link.href}`;
                                            }

                                            if (isExternal) {
                                                return <li key={lIdx}><a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">{link.label}</a></li>;
                                            } else if (isAnchor && location.pathname === '/') {
                                                return <li key={lIdx}><a href={href} className="hover:text-indigo-600 transition-colors">{link.label}</a></li>;
                                            } else {
                                                return <li key={lIdx}><Link to={href} className="hover:text-indigo-600 transition-colors">{link.label}</Link></li>;
                                            }
                                        })}
                                    </ul>
                                </div>
                            ))
                        ) : (
                           // Fallback to static columns if footer config is missing completely
                            <>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-sm">Product</h4>
                                    <ul className="space-y-4 text-slate-600 font-medium">
                                        <li><Link to="/#platform" className="hover:text-indigo-600 transition-colors">Features</Link></li>
                                        <li><Link to="/#pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link></li>
                                        <li><Link to="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-sm">Company</h4>
                                    <ul className="space-y-4 text-slate-600 font-medium">
                                        <li><Link to="/about" className="hover:text-indigo-600 transition-colors">About Us</Link></li>
                                        <li><Link to="/partner" className="hover:text-indigo-600 transition-colors">Partner with Us</Link></li>
                                        <li><Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact Support</Link></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-sm">Legal</h4>
                                    <ul className="space-y-4 text-slate-600 font-medium">
                                        <li><Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
                                        <li><Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
                                        <li><Link to="/refund-policy" className="hover:text-indigo-600 transition-colors">Refund Policy</Link></li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500">
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

import { useState, useEffect } from 'react';
import axios from 'axios';

import { Save, RefreshCw, LayoutTemplate, MessageSquare, BarChart, Users, Type, Image as ImageIcon, Plus, Trash2, CheckCircle, Smartphone, Globe, Monitor, Target, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const AdminLandingPage = () => {
    const { user } = useAuth();
    const { showModal, showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState(null);
    const [mainTab, setMainTab] = useState('content'); // content | seo
    const [contentTab, setContentTab] = useState('hero'); // hero | features | testimonials | cta | brand

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/landing');
            setConfig(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('http://localhost:5000/api/landing', config);
            showToast({ type: 'success', title: 'Saved', message: 'Landing page configuration saved.' });
            setTimeout(() => setSaving(false), 800);
        } catch (err) {
            console.error(err);
            setSaving(false);
            showToast({ type: 'error', title: 'Error', message: 'Failed to save changes' });
        }
    };

    const handleReset = async () => {
        showModal({
            type: 'warning',
            title: 'Reset Configuration',
            message: 'Are you sure? This will reset the landing page to default content.',
            confirmText: 'Reset',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await axios.post('http://localhost:5000/api/landing/reset');
                    setConfig(res.data);
                    setLoading(false);
                    showToast({ type: 'success', title: 'Reset', message: 'Configuration reset to defaults.' });
                } catch (err) {
                    console.error(err);
                    setLoading(false);
                    showToast({ type: 'error', title: 'Error', message: 'Failed to reset configuration.' });
                }
            }
        });
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Loading configuration...</div>;
    if (!config) return <div className="p-10 text-center text-red-500">Failed to load configuration. Please check backend connection.</div>;

    const InputGroup = ({ label, value, onChange, placeholder, type = "text" }) => (
        <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">{label}</label>
            {type === 'textarea' ? (
                <textarea
                    className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none dark:text-white"
                    rows={3}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            {/* Top Bar */}
            {/* Top Bar */}
            <AdminHeader>
                <ThemeToggle />
            </AdminHeader>

            <main className="p-8 max-w-6xl mx-auto space-y-8 pb-32">
                {/* Page Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Landing Page</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Design your public facing marketing page.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-sm font-bold flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Reset Defaults
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center gap-2 disabled:opacity-70"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <a
                            href="/"
                            target="_blank"
                            className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                        >
                            <Globe className="w-4 h-4" /> View Live
                        </a>
                    </div>
                </div>

                {/* Main Tabs (Top Level) */}
                <div className="flex gap-4 border-b border-slate-200 dark:border-white/10">
                    <button
                        onClick={() => setMainTab('content')}
                        className={`px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-all ${mainTab === 'content'
                            ? 'text-indigo-600 border-indigo-600'
                            : 'text-slate-500 border-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                            }`}
                    >
                        <LayoutTemplate className="w-5 h-5" /> Landing Page Content
                    </button>
                    <button
                        onClick={() => setMainTab('seo')}
                        className={`px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-all ${mainTab === 'seo'
                            ? 'text-indigo-600 border-indigo-600'
                            : 'text-slate-500 border-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                            }`}
                    >
                        <Monitor className="w-5 h-5" /> SEO & Social
                    </button>
                </div>

                {/* CONTENT EDITOR TAB */}
                {mainTab === 'content' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        {/* Content Navigation Tabs */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'hero', icon: LayoutTemplate, label: 'Hero Section' },
                                { id: 'features', icon: BarChart, label: 'Features' },
                                { id: 'testimonials', icon: MessageSquare, label: 'Testimonials' },
                                { id: 'cta', icon: Zap, label: 'Call to Action' },
                                { id: 'brand', icon: Target, label: 'Branding' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setContentTab(tab.id)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all border ${contentTab === tab.id
                                        ? 'bg-white dark:bg-surface-dark border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'border-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" /> {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-8 shadow-sm min-h-[500px]">

                            {/* HERO SECTION */}
                            {contentTab === 'hero' && (
                                <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <InputGroup
                                                label="Headline Title"
                                                value={config.hero.title}
                                                onChange={v => setConfig({ ...config, hero: { ...config.hero, title: v } })}
                                                placeholder="e.g. Connect with Customers"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <InputGroup
                                                label="Subtitle Description"
                                                type="textarea"
                                                value={config.hero.subtitle}
                                                onChange={v => setConfig({ ...config, hero: { ...config.hero, subtitle: v } })}
                                                placeholder="Brief explanation..."
                                            />
                                        </div>
                                        <InputGroup
                                            label="Primary Button Text"
                                            value={config.hero.ctaText}
                                            onChange={v => setConfig({ ...config, hero: { ...config.hero, ctaText: v } })}
                                        />
                                        <InputGroup
                                            label="Primary Button Link"
                                            value={config.hero.ctaLink}
                                            onChange={v => setConfig({ ...config, hero: { ...config.hero, ctaLink: v } })}
                                        />
                                    </div>

                                    <div className="pt-8 border-t border-slate-100 dark:border-white/5">
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-6">Visual Style</h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Gradient Start Color</label>
                                                <div className="flex gap-3 items-center">
                                                    <input
                                                        type="color"
                                                        value={config.hero.gradientStart}
                                                        onChange={e => setConfig({ ...config, hero: { ...config.hero, gradientStart: e.target.value } })}
                                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                                                    />
                                                    <span className="text-sm font-mono text-slate-500">{config.hero.gradientStart}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Gradient End Color</label>
                                                <div className="flex gap-3 items-center">
                                                    <input
                                                        type="color"
                                                        value={config.hero.gradientEnd}
                                                        onChange={e => setConfig({ ...config, hero: { ...config.hero, gradientEnd: e.target.value } })}
                                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                                                    />
                                                    <span className="text-sm font-mono text-slate-500">{config.hero.gradientEnd}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FEATURES SECTION */}
                            {contentTab === 'features' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Feature Cards</h3>
                                        <button
                                            onClick={() => setConfig({
                                                ...config,
                                                features: [...config.features, { title: 'New Feature', description: 'Description here', icon: 'Star' }]
                                            })}
                                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" /> Add Feature
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {config.features.map((feature, idx) => (
                                            <div key={idx} className="relative group p-6 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-colors">
                                                <button
                                                    onClick={() => {
                                                        const newFeatures = config.features.filter((_, i) => i !== idx);
                                                        setConfig({ ...config, features: newFeatures });
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-white dark:bg-surface-dark rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                                <div className="space-y-4">
                                                    <InputGroup
                                                        label="Icon Name (Lucide)"
                                                        value={feature.icon}
                                                        onChange={v => {
                                                            const newFeatures = [...config.features];
                                                            newFeatures[idx].icon = v;
                                                            setConfig({ ...config, features: newFeatures });
                                                        }}
                                                    />
                                                    <InputGroup
                                                        label="Title"
                                                        value={feature.title}
                                                        onChange={v => {
                                                            const newFeatures = [...config.features];
                                                            newFeatures[idx].title = v;
                                                            setConfig({ ...config, features: newFeatures });
                                                        }}
                                                    />
                                                    <InputGroup
                                                        label="Description"
                                                        type="textarea"
                                                        value={feature.description}
                                                        onChange={v => {
                                                            const newFeatures = [...config.features];
                                                            newFeatures[idx].description = v;
                                                            setConfig({ ...config, features: newFeatures });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TESTIMONIALS SECTION */}
                            {contentTab === 'testimonials' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Customer Reviews</h3>
                                        <button
                                            onClick={() => setConfig({
                                                ...config,
                                                testimonials: [...config.testimonials, { name: 'John Doe', role: 'Customer', quote: 'Amazing service!', avatar: '' }]
                                            })}
                                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" /> Add Review
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {config.testimonials.map((t, idx) => (
                                            <div key={idx} className="relative group p-6 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-colors">
                                                <button
                                                    onClick={() => {
                                                        const newTestimonials = config.testimonials.filter((_, i) => i !== idx);
                                                        setConfig({ ...config, testimonials: newTestimonials });
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-white dark:bg-surface-dark rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <InputGroup
                                                            label="Name"
                                                            value={t.name}
                                                            onChange={v => {
                                                                const newT = [...config.testimonials];
                                                                newT[idx].name = v;
                                                                setConfig({ ...config, testimonials: newT });
                                                            }}
                                                        />
                                                        <InputGroup
                                                            label="Role"
                                                            value={t.role}
                                                            onChange={v => {
                                                                const newT = [...config.testimonials];
                                                                newT[idx].role = v;
                                                                setConfig({ ...config, testimonials: newT });
                                                            }}
                                                        />
                                                    </div>
                                                    <InputGroup
                                                        label="Quote"
                                                        type="textarea"
                                                        value={t.quote}
                                                        onChange={v => {
                                                            const newT = [...config.testimonials];
                                                            newT[idx].quote = v;
                                                            setConfig({ ...config, testimonials: newT });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* CTA SECTION */}
                            {contentTab === 'cta' && (
                                <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <InputGroup
                                        label="Heading"
                                        value={config.cta.title}
                                        onChange={v => setConfig({ ...config, cta: { ...config.cta, title: v } })}
                                    />
                                    <InputGroup
                                        label="Subtext"
                                        type="textarea"
                                        value={config.cta.subtitle}
                                        onChange={v => setConfig({ ...config, cta: { ...config.cta, subtitle: v } })}
                                    />
                                    <InputGroup
                                        label="Button Text"
                                        value={config.cta.buttonText}
                                        onChange={v => setConfig({ ...config, cta: { ...config.cta, buttonText: v } })}
                                    />
                                </div>
                            )}

                            {/* BRANDING SECTION */}
                            {contentTab === 'brand' && (
                                <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <InputGroup
                                        label="Brand Name"
                                        value={config.brand.name}
                                        onChange={v => setConfig({ ...config, brand: { ...config.brand, name: v } })}
                                    />
                                    <InputGroup
                                        label="Footer Copyright"
                                        value={config.brand.footerText}
                                        onChange={v => setConfig({ ...config, brand: { ...config.brand, footerText: v } })}
                                    />
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* SEO TAB */}
                {mainTab === 'seo' && (
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-8 shadow-sm">
                        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-start gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-indigo-700 dark:text-indigo-300">
                                <Monitor className="w-6 h-6 shrink-0 mt-1" />
                                <div>
                                    <div className="font-bold mb-1">Search Engine Optimization</div>
                                    <p className="text-sm opacity-80">Configure how your site appears in Google searches and when shared on social media (Facebook, Twitter, WhatsApp).</p>
                                </div>
                            </div>

                            <InputGroup
                                label="Meta Title"
                                value={config.seo?.title || ''}
                                onChange={v => setConfig({ ...config, seo: { ...config.seo, title: v } })}
                                placeholder="e.g. WhatsApp Cloud - Best Bulk Sender"
                            />

                            <InputGroup
                                label="Meta Description"
                                type="textarea"
                                value={config.seo?.description || ''}
                                onChange={v => setConfig({ ...config, seo: { ...config.seo, description: v } })}
                                placeholder="A brief summary of your page..."
                            />

                            <InputGroup
                                label="Keywords (Comma separated)"
                                value={config.seo?.keywords || ''}
                                onChange={v => setConfig({ ...config, seo: { ...config.seo, keywords: v } })}
                                placeholder="e.g. marketing, automation, whatsapp api"
                            />

                            <InputGroup
                                label="Social Share Image URL (OG:Image)"
                                value={config.seo?.ogImage || ''}
                                onChange={v => setConfig({ ...config, seo: { ...config.seo, ogImage: v } })}
                                placeholder="https://example.com/share-image.jpg"
                            />

                            <div className="pt-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" /> Advanced SEO
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputGroup
                                        label="Canonical URL"
                                        value={config.seo?.canonicalUrl || ''}
                                        onChange={v => setConfig({ ...config, seo: { ...config.seo, canonicalUrl: v } })}
                                        placeholder="https://yourdomain.com/"
                                    />
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Robots Meta</label>
                                        <select
                                            value={config.seo?.robots || 'index, follow'}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, robots: e.target.value } })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                        >
                                            <option value="index, follow">Index, Follow (Recommended)</option>
                                            <option value="noindex, follow">NoIndex, Follow</option>
                                            <option value="index, nofollow">Index, NoFollow</option>
                                            <option value="noindex, nofollow">NoIndex, NoFollow (Private)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Social Profiles */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Social Profiles (for Knowledge Graph)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                            placeholder="Facebook URL"
                                            value={config.seo?.socialLinks?.facebook || ''}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, socialLinks: { ...config.seo.socialLinks, facebook: e.target.value } } })}
                                        />
                                        <input
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                            placeholder="Twitter URL"
                                            value={config.seo?.socialLinks?.twitter || ''}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, socialLinks: { ...config.seo.socialLinks, twitter: e.target.value } } })}
                                        />
                                        <input
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                            placeholder="Instagram URL"
                                            value={config.seo?.socialLinks?.instagram || ''}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, socialLinks: { ...config.seo.socialLinks, instagram: e.target.value } } })}
                                        />
                                        <input
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                            placeholder="LinkedIn URL"
                                            value={config.seo?.socialLinks?.linkedin || ''}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, socialLinks: { ...config.seo.socialLinks, linkedin: e.target.value } } })}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl flex justify-between items-center border border-slate-100 dark:border-white/5">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">Sitemap URL</div>
                                        <div className="text-xs text-slate-500">Submit this to Google Search Console</div>
                                    </div>
                                    <a
                                        href="http://localhost:5000/sitemap.xml"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 dark:text-indigo-400 text-sm font-mono underline hover:text-indigo-500"
                                    >
                                        /sitemap.xml
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};



export default AdminLandingPage;

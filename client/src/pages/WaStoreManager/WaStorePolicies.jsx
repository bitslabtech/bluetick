import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { FileText, Save, Loader2, Info, ChevronDown, ChevronUp, Code, LayoutTemplate, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function WaStorePolicies() {
    const { storeId: id } = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Accordion state
    const [expandedSection, setExpandedSection] = useState('aboutUs');
    // HTML Editor toggle state
    const [htmlMode, setHtmlMode] = useState({}); // { aboutUs: false, termsConditions: true, customPage_0: false, etc }

    const [form, setForm] = useState({
        aboutUs: '',
        termsConditions: '',
        privacyPolicy: '',
        returnPolicy: '',
        shippingPolicy: '',
        customPages: [] // Array of { id, title, slug, content }
    });

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
                const myStore = res.data.find(s => s.id === id);
                if (myStore) {
                    setForm({
                        aboutUs: myStore.aboutUs || '',
                        termsConditions: myStore.termsConditions || '',
                        privacyPolicy: myStore.privacyPolicy || '',
                        returnPolicy: myStore.returnPolicy || '',
                        shippingPolicy: myStore.shippingPolicy || '',
                        customPages: myStore.customPages || []
                    });
                }
            } catch (error) {
                toast.error("Failed to load store pages and policies");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [id]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${id}`, form);
            toast.success("Pages & Policies updated successfully!");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to save pages");
        } finally {
            setSaving(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    const toggleHtmlMode = (section, e) => {
        e.stopPropagation(); // prevent accordion toggle
        setHtmlMode(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ]
    };

    const renderEditor = (label, description, field, placeholder, value, onChange, isDeletable = false, onDelete = null, extraContent = null) => {
        const isExpanded = expandedSection === field;
        const isHtmlMode = htmlMode[field] || false;

        return (
            <div key={field} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 relative group">
                <div className="w-full flex items-center justify-between bg-slate-50 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-black/40 transition-colors">
                    <button 
                        type="button"
                        onClick={() => toggleSection(field)}
                        className="flex-1 flex items-center justify-between p-4 md:p-6 text-left"
                    >
                        <div className="flex flex-col items-start text-left">
                            <span className="font-bold text-slate-900 dark:text-white text-base md:text-lg">{label}</span>
                            <span className="text-xs md:text-sm text-slate-500 mt-1">{description}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {isExpanded && (
                                <div 
                                    onClick={(e) => toggleHtmlMode(field, e)}
                                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isHtmlMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                >
                                    {isHtmlMode ? <LayoutTemplate className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                                    {isHtmlMode ? 'Visual Editor' : 'HTML Mode'}
                                </div>
                            )}
                            <div className="p-2 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-white/10 text-slate-400">
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                    </button>
                    {isDeletable && (
                        <div className="pr-4 md:pr-6">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete Page"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
                
                <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1200px] border-t border-slate-200 dark:border-white/10 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="p-4 md:p-6 flex flex-col h-full">
                        {/* Mobile HTML toggle since the header one is hidden on sm */}
                        <div className="sm:hidden mb-4 flex justify-end">
                            <button 
                                type="button"
                                onClick={(e) => toggleHtmlMode(field, e)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isHtmlMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                            >
                                {isHtmlMode ? <LayoutTemplate className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                                {isHtmlMode ? 'Visual Editor' : 'HTML Mode'}
                            </button>
                        </div>

                        {extraContent}
                        
                        {!isHtmlMode ? (
                            <div className="editor-container h-[300px] sm:h-[400px] mb-10 sm:mb-12">
                                <ReactQuill
                                    theme="snow"
                                    value={value}
                                    onChange={onChange}
                                    placeholder={placeholder}
                                    className="bg-white dark:bg-surface-dark dark:text-white h-full"
                                    modules={modules}
                                />
                            </div>
                        ) : (
                            <textarea
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className="w-full h-[300px] sm:h-[400px] p-4 font-mono text-sm bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none dark:text-slate-300"
                                placeholder={`<p>${placeholder}</p>`}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Custom Pages Helpers
    const handleAddCustomPage = () => {
        if (form.customPages.length >= 5) {
            toast.error("Maximum 5 custom pages allowed");
            return;
        }
        const newId = Date.now().toString();
        const newPage = { id: newId, title: 'New Custom Page', slug: 'new-custom-page', content: '' };
        setForm(prev => ({ ...prev, customPages: [...prev.customPages, newPage] }));
        setExpandedSection(`customPage_${newId}`);
    };

    const handleUpdateCustomPage = (id, updates) => {
        if (updates.title !== undefined && updates.slug === undefined) {
            // Auto-generate slug from title if slug not explicitly provided
            updates.slug = updates.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
        setForm(prev => ({
            ...prev,
            customPages: prev.customPages.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
    };

    const handleDeleteCustomPage = (id) => {
        if (window.confirm("Are you sure you want to delete this custom page?")) {
            setForm(prev => ({ ...prev, customPages: prev.customPages.filter(p => p.id !== id) }));
            if (expandedSection === `customPage_${id}`) {
                setExpandedSection(null);
            }
        }
    };

    return (
        <div className="space-y-6 pb-7 sm:pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Pages & Policies
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Configure your Policies and create Custom Internal Pages.</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-600/20"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Pages
                </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-semibold mb-1">Why are these pages important?</p>
                    <p>Clear pages build trust with your customers. You can also create up to 5 Custom Pages to link in your mobile navigation menu.</p>
                </div>
            </div>

            {loading ? (
                <div className="space-y-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl h-24 shadow-sm" />
                    ))}
                </div>
            ) : (
            <div className="space-y-10">
                {/* Standard Policies */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Standard Policies</h3>
                    {renderEditor(
                        "About Us",
                        "Tell your customers about your brand, mission, and story.",
                        "aboutUs",
                        "Enter your About Us story here...",
                        form.aboutUs,
                        (val) => setForm({ ...form, aboutUs: val })
                    )}
                    
                    {renderEditor(
                        "Terms & Conditions",
                        "The rules and guidelines that users must agree to in order to use your store.",
                        "termsConditions",
                        "Enter your Terms and Conditions here...",
                        form.termsConditions,
                        (val) => setForm({ ...form, termsConditions: val })
                    )}

                    {renderEditor(
                        "Privacy Policy",
                        "How you collect, use, and protect your customers' personal information.",
                        "privacyPolicy",
                        "Enter your Privacy Policy here...",
                        form.privacyPolicy,
                        (val) => setForm({ ...form, privacyPolicy: val })
                    )}

                    {renderEditor(
                        "Return & Refund Policy",
                        "Your rules for accepting returns, issuing refunds, and exchanges.",
                        "returnPolicy",
                        "Enter your Return Policy here...",
                        form.returnPolicy,
                        (val) => setForm({ ...form, returnPolicy: val })
                    )}

                    {renderEditor(
                        "Shipping Policy",
                        "Provide details on shipping methods, costs, and delivery times.",
                        "shippingPolicy",
                        "Enter your Shipping Policy here...",
                        form.shippingPolicy,
                        (val) => setForm({ ...form, shippingPolicy: val })
                    )}
                </div>

                {/* Custom Pages */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2 border-t border-slate-200 dark:border-white/10 pt-8">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Custom Internal Pages</h3>
                            <p className="text-sm text-slate-500">Create up to 5 custom pages (e.g. FAQ, Sizing Guide) and link them to your Mobile Menu.</p>
                        </div>
                        <button
                            onClick={handleAddCustomPage}
                            disabled={form.customPages.length >= 5}
                            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 disabled:opacity-50 rounded-lg text-sm font-bold transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Page</span>
                        </button>
                    </div>

                    {form.customPages.length === 0 ? (
                        <div className="text-center p-8 border border-dashed border-slate-300 dark:border-white/20 rounded-2xl text-slate-500">
                            No custom pages created yet. Click "Add Page" to create one.
                        </div>
                    ) : (
                        form.customPages.map((page, index) => {
                            const extraContent = (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page Name</label>
                                        <input
                                            type="text"
                                            value={page.title}
                                            onChange={(e) => handleUpdateCustomPage(page.id, { title: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Slug</label>
                                        <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                                            <span className="pl-3 pr-1 text-slate-400 text-sm font-mono flex items-center gap-1"><LinkIcon className="w-3.5 h-3.5" /> /pages/</span>
                                            <input
                                                type="text"
                                                value={page.slug}
                                                onChange={(e) => handleUpdateCustomPage(page.id, { slug: e.target.value })}
                                                className="w-full py-2 pr-3 bg-transparent text-sm outline-none dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );

                            return renderEditor(
                                page.title || `Custom Page ${index + 1}`,
                                `/pages/${page.slug}`,
                                `customPage_${page.id}`,
                                "Enter page content...",
                                page.content,
                                (val) => handleUpdateCustomPage(page.id, { content: val }),
                                true, // isDeletable
                                () => handleDeleteCustomPage(page.id),
                                extraContent
                            );
                        })
                    )}
                </div>
            </div>
            )}
        </div>
    );
}

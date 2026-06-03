import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Plus, Check, Globe, Image as ImageIcon, FileText, Lock, ArrowRight, ArrowLeft, AlertTriangle, Signal, Wifi, Battery, CheckCheck } from 'lucide-react';
import { useUI } from '../../context/UIContext';

const CampaignStep2 = ({ data, updateData, onNext, onBack }) => {
    const { settings } = useUI();
    const businessName = settings?.appName || "Business Name";
    const profilePicUrl = settings?.whatsappProfile?.profilePictureUrl || null;
    const initial = businessName.charAt(0).toUpperCase();
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [templateLimit, setTemplateLimit] = useState(-1); // -1 = unlimited

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const [tmplRes, billingRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/templates`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/billing`)
                ]);
                // Sort oldest first — first N are the plan-active ones
                const sorted = [...tmplRes.data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                setTemplates(sorted);
                const limit = billingRes.data?.usage?.templateLimit ?? -1;
                setTemplateLimit(limit);
            } catch (err) {
                console.error('Error fetching templates:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    // A template is locked if there is a finite limit and its 0-based index >= limit
    const isLocked = (index) => templateLimit !== -1 && index >= templateLimit;

    const selectedTemplate = templates.find(t => t.id === data.templateId);

    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All Categories' || template.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryColor = (cat) => {
        if (cat === 'MARKETING') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        if (cat === 'UTILITY') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        if (cat === 'AUTHENTICATION') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    return (
        <div className="flex flex-col gap-8 h-full fade-in pb-24 xl:pb-0">
            {/* Step Header */}
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 dark:border-surface-dark pb-6 transition-colors duration-300">
                {/* Title Section */}
                <div className="w-full md:w-auto z-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Select Template</h1>
                    <p className="text-slate-500 dark:text-text-secondary mt-1">Choose a pre-approved message template for your campaign.</p>
                </div>

                {/* Centered Stepper */}
                <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 flex justify-center z-0">
                    <div className="bg-white/80 dark:bg-surface-dark/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl flex items-center gap-1 shadow-sm dark:shadow-2xl ring-1 ring-slate-100 dark:ring-white/5 transition-colors duration-300">
                        {/* Step 1: Completed */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary transition-all">
                            <span className="flex items-center justify-center size-5 bg-primary text-white rounded-full text-[10px] font-bold">
                                <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                            <span className="text-xs font-bold hidden sm:block">Info</span>
                        </div>

                        <div className="w-8 h-[2px] bg-primary/50 rounded-full mx-1"></div>

                        {/* Step 2: Active */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary rounded-xl shadow-lg shadow-primary/20 ring-1 ring-primary/50 transition-all">
                            <span className="flex items-center justify-center size-5 bg-white text-primary rounded-full text-[10px] font-bold">2</span>
                            <span className="text-xs font-bold text-white">Template</span>
                        </div>

                        <div className="w-8 h-[2px] bg-slate-200 dark:bg-white/10 rounded-full mx-1"></div>

                        {/* Step 3: Inactive */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl opacity-50 grayscale transition-all">
                            <span className="flex items-center justify-center size-5 bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white rounded-full text-[10px] font-bold border border-slate-300 dark:border-white/10">3</span>
                            <span className="text-xs font-bold text-slate-500 dark:text-white hidden sm:block">Schedule</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full">
                <div className="xl:col-span-8 flex flex-col gap-6">
                    {/* Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors duration-300">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-secondary w-5 h-5" />
                            <input
                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-gray-600 transition-all outline-none"
                                placeholder="Search templates..."
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                className="bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer w-full sm:w-auto"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="All Categories">All Categories</option>
                                <option value="MARKETING">Marketing</option>
                                <option value="UTILITY">Utility</option>
                                <option value="AUTHENTICATION">Authentication</option>
                            </select>
                            <button
                                onClick={() => navigate('/templates', { state: { openCreateTemplate: true } })}
                                className="flex justify-center items-center gap-2 px-4 md:px-6 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white text-sm font-bold rounded-xl transition-all whitespace-nowrap active:scale-95 w-full sm:w-auto"
                            >
                                <Plus className="w-4 h-4" />
                                New Template
                            </button>
                        </div>
                    </div>

                    {/* Plan limit warning banner */}
                    {templateLimit !== -1 && templates.length > templateLimit && (
                        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/50 rounded-2xl px-5 py-4">
                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                    Plan Limit Reached — {templateLimit} of {templates.length} templates active
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                                    You have {templates.length} templates but your plan allows {templateLimit}. The first {templateLimit} are available for campaigns. Upgrade your plan to unlock the rest.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Templates Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-7 sm:pb-20">
                        {filteredTemplates.map((template) => {
                            const originalIndex = templates.findIndex(t => t.id === template.id);
                            const locked = isLocked(originalIndex);
                            return (
                                <div
                                    key={template.id}
                                    onClick={() => !locked && updateData({ templateId: template.id, template: template })}
                                    className={`group relative bg-white dark:bg-surface-dark border rounded-2xl p-6 transition-all shadow-sm ${locked
                                        ? 'cursor-default border-slate-200 dark:border-white/5'
                                        : data.templateId === template.id
                                            ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/10 cursor-pointer active:scale-[0.99]'
                                            : 'border-slate-200 dark:border-white/5 hover:border-primary/50 cursor-pointer active:scale-[0.99]'
                                        }`}
                                >
                                    {/* Lock overlay */}
                                    {locked && (
                                        <div className="absolute inset-0 z-10 bg-slate-100/70 dark:bg-background-dark/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 rounded-2xl">
                                            <div className="flex items-center gap-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-full px-4 py-2 shadow-lg">
                                                <Lock className="w-4 h-4 text-slate-500" />
                                                <span className="text-xs font-bold text-slate-600 dark:text-text-secondary">Plan Limit Reached</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate('/billing'); }}
                                                className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-primary/30 hover:bg-blue-600 transition-colors active:scale-95"
                                            >
                                                ⚡ Upgrade Plan
                                            </button>
                                        </div>
                                    )}
                                    {!locked && (
                                        <div className="absolute top-5 right-5">
                                            <div className={`size-6 rounded-full border transition-all flex items-center justify-center ${data.templateId === template.id
                                                ? 'border-primary bg-primary text-white'
                                                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-background-dark text-transparent group-hover:border-slate-300 dark:group-hover:border-white/30'
                                                }`}>
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${getCategoryColor(template.category)}`}>{template.category}</span>
                                        {template.status === 'APPROVED' && (
                                            <span className="bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/20 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                                <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span> Approved
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2 group-hover:text-primary transition-colors">{template.name}</h3>
                                    <p className="text-slate-500 dark:text-text-secondary text-sm line-clamp-3 mb-6 leading-relaxed">
                                        {template.content}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-text-secondary text-xs font-medium">
                                            <Globe className="w-4 h-4" />
                                            {template.language}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-text-secondary text-xs font-medium">
                                            {template.type === 'IMAGE' && <><ImageIcon className="w-4 h-4" /> Image Header</>}
                                            {template.type === 'TEXT' && <><FileText className="w-4 h-4" /> Text Only</>}
                                            {template.type === 'SECURITY' && <><Lock className="w-4 h-4" /> Security</>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Sidebar Preview */}
                <div className="xl:col-span-4 relative">
                    <div className="sticky top-6 flex flex-col gap-6">

                        {/* Preview Box */}
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-lg transition-colors duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider text-slate-500 dark:text-text-secondary">Selected Preview</h3>
                            </div>

                            {selectedTemplate ? (() => {
                                const isCarousel = selectedTemplate.archetype === 'carousel' && Array.isArray(selectedTemplate.cards) && selectedTemplate.cards.length > 0;
                                return (
                                    <div className="bg-slate-50 dark:bg-[#0b141a] rounded-[2.5rem] border-[8px] border-slate-800 dark:border-[#1f2c34] p-0 relative h-[500px] overflow-hidden shadow-2xl flex flex-col mx-auto w-[260px] shrink-0 ring-1 ring-slate-900/10 dark:ring-white/10 transition-colors duration-300">
                                        {/* Dynamic Island */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 dark:bg-[#1f2c34] rounded-b-2xl z-20"></div>
                                        
                                        {/* StatusBar */}
                                        <div className="flex justify-between items-center text-[10px] text-slate-800 dark:text-gray-400 mb-2 px-4 shrink-0 pt-3 z-10 bg-[#f0f2f5] dark:bg-[#202c33]">
                                            <span className="font-semibold">9:41</span>
                                            <div className="flex gap-1.5 items-center">
                                                <Signal className="w-3 h-3" />
                                                <Wifi className="w-3 h-3" />
                                                <Battery className="w-3 h-3" />
                                            </div>
                                        </div>

                                        {/* Chat Header */}
                                        <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-2 flex items-center gap-2.5 mb-0 shrink-0 shadow-sm z-10">
                                            <ArrowLeft className="w-4 h-4 text-[#00a884]" />
                                            <div className="size-8 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden">
                                                {profilePicUrl ? <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" /> : initial}
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-slate-900 dark:text-white text-[13px] font-semibold leading-none">{businessName}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-text-secondary leading-none mt-1">Official Business</p>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="space-y-3 px-3 py-4 overflow-y-auto flex-1 custom-scrollbar relative bg-[#efeae2] dark:bg-[#0b141a]">
                                            <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                            
                                            <div className="flex justify-center relative z-10">
                                                <span className="bg-white/90 dark:bg-[#182229]/90 backdrop-blur-sm text-slate-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-lg shadow-sm">Today</span>
                                            </div>

                                            {isCarousel ? (
                                                <div className="relative z-10 mt-3">
                                                    {/* Carousel preview card */}
                                                    <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-none p-2 w-[90%] shadow-sm mb-3 relative">
                                                        <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-2 text-white dark:text-[#202c33] fill-current">
                                                            <path d="M1.533,3.568L8,12.193V1H2.812C1.042,1,0.474,2.156,1.533,3.568z"></path>
                                                        </svg>
                                                        <p className="text-slate-800 dark:text-[#e9edef] text-[12px] leading-snug">{selectedTemplate.content}</p>
                                                        <span className="text-[9px] text-slate-400 dark:text-gray-400 block text-right mt-1 font-medium">10:30 AM</span>
                                                    </div>
                                                    {/* Carousel cards strip */}
                                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                        {selectedTemplate.cards.map((card, idx) => (
                                                            <div key={idx} className="flex-shrink-0 w-36 bg-white dark:bg-[#202c33] rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col">
                                                                <div className="h-20 bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center relative">
                                                                    <ImageIcon className="w-6 h-6 text-white/50" />
                                                                </div>
                                                                <div className="p-2 flex flex-col flex-1">
                                                                    <p className="text-[11px] font-medium text-slate-800 dark:text-[#e9edef] leading-snug line-clamp-2">{card.content}</p>
                                                                    {card.buttons?.[0] && (
                                                                        <div className="mt-auto pt-2">
                                                                            <div className="bg-[#f0f2f5] dark:bg-[#2a3942] text-[#00a884] dark:text-[#53bdeb] text-[10px] font-bold text-center px-2 py-1.5 rounded-lg">
                                                                                {card.buttons[0].text}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-none p-1.5 w-[90%] relative shadow-sm mt-3">
                                                    <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-2 text-white dark:text-[#202c33] fill-current">
                                                        <path d="M1.533,3.568L8,12.193V1H2.812C1.042,1,0.474,2.156,1.533,3.568z"></path>
                                                    </svg>
                                                    {selectedTemplate.type === 'IMAGE' && (
                                                        <div className="w-full aspect-video bg-black/5 rounded-xl overflow-hidden mb-2">
                                                            <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400" alt="Header" />
                                                        </div>
                                                    )}
                                                    <div className="px-1.5 pb-1 pt-0.5">
                                                        <p className="text-slate-800 dark:text-[#e9edef] text-[13px] leading-snug whitespace-pre-wrap">
                                                            {selectedTemplate.content || 'No content'}
                                                        </p>
                                                        <div className="flex justify-end items-center gap-1 mt-1">
                                                            <span className="text-[9px] text-slate-400 dark:text-[#8696a0] font-medium">10:30 AM</span>
                                                            <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Template Buttons Preview if exist */}
                                                    {selectedTemplate.components?.some(c => c.type === 'BUTTONS') && (
                                                        <div className="mt-1.5 border-t border-slate-100 dark:border-white/5 mx-1.5">
                                                            {selectedTemplate.components.find(c => c.type === 'BUTTONS').buttons?.map((btn, idx) => (
                                                                <div key={idx} className="py-2.5 text-[#00a884] dark:text-[#53bdeb] text-[12px] font-semibold text-center border-b last:border-0 border-slate-100 dark:border-white/5">
                                                                    {btn.text || btn.type}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })() : (
                                <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 dark:text-text-secondary gap-3 bg-slate-50 dark:bg-background-dark rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
                                    <FileText className="w-8 h-8 opacity-20" />
                                    <span className="text-xs font-medium">Select a template to view preview</span>
                                </div>
                            )}
                        </div>

                        {/* Actions (Hidden on Mobile) */}
                        <div className="hidden xl:flex bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 flex-col gap-4 shadow-lg transition-colors duration-300">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-text-secondary mb-2">
                                <span>Selected Template</span>
                                <span className="text-slate-900 dark:text-white font-bold truncate max-w-[150px] max-w-full">{selectedTemplate?.name || '-'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onBack}
                                    className="flex-1 py-3.5 bg-transparent border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <button
                                    onClick={onNext}
                                    disabled={!selectedTemplate}
                                    className={`flex-[1.5] py-3.5 text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group ${!selectedTemplate ? 'bg-slate-300 dark:bg-gray-700/50 cursor-not-allowed text-slate-500 dark:text-gray-400' : 'bg-primary hover:bg-blue-600 shadow-blue-500/20 active:scale-95'}`}
                                >
                                    Next Step
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Action Bar */}
            <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-white/10 p-4 pb-safe flex items-center justify-between gap-3 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <button
                    onClick={onBack}
                    className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!selectedTemplate}
                    className={`flex-[2] py-3 text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group ${!selectedTemplate ? 'bg-slate-300 dark:bg-gray-700/50 cursor-not-allowed text-slate-500 dark:text-gray-400 shadow-none' : 'bg-primary hover:bg-blue-600 shadow-blue-500/20 active:scale-95'}`}
                >
                    Next Step
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default CampaignStep2;

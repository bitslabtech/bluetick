import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Target, Type, CreditCard, ChevronRight, ChevronLeft, 
    CheckCircle2, AlertTriangle, Loader2, Megaphone, MapPin, 
    Users, Briefcase, Zap, Image, TrendingUp, ExternalLink, MoreVertical,
    Bot, MessageCircle, Mail, ArrowRight, Workflow, Radio, Globe,
    PenLine, SlidersHorizontal, Hash, FileText, Plus, X, Tag
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const steps = [
    { id: 'business', title: 'Business Info', icon: Briefcase },
    { id: 'audience', title: 'AI Audience', icon: Target },
    { id: 'creative', title: 'AI Creative', icon: Type },
    { id: 'automation', title: 'Automation', icon: Bot },
    { id: 'publish', title: 'Review & Launch', icon: Zap }
];

export default function MetaAdsWizard() {
    const navigate = useNavigate();
    const [creationMode, setCreationMode] = useState('ai'); // 'ai' | 'manual'
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [metaConnected, setMetaConnected] = useState(null); // null = checking

    // Check Meta connection on mount
    useEffect(() => {
        axios.get('/api/ctwa/status', { withCredentials: true })
            .then(res => setMetaConnected(res.data.connected))
            .catch(() => setMetaConnected(false));
    }, []);

    // Form State
    const [businessData, setBusinessData] = useState({ name: '', description: '' });
    const [audienceData, setAudienceData] = useState(null); // From AI
    const [creativeData, setCreativeData] = useState(null); // From AI
    const [selectedCreativeIndex, setSelectedCreativeIndex] = useState(0);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [budgetData, setBudgetData] = useState({ dailyBudget: 500, objective: 'OUTCOME_ENGAGEMENT' });

    // Geography targeting — user controls this, not AI
    const [targetLocations, setTargetLocations] = useState([]);
    const [locationInput, setLocationInput] = useState('');

    // ── Manual Mode State ──
    const [manual, setManual] = useState({
        campaignName: '',
        objective: 'OUTCOME_ENGAGEMENT',
        dailyBudget: 500,
        ageMin: 18,
        ageMax: 55,
        primaryText: '',
        headline: '',
    });
    const [manualLocations, setManualLocations] = useState([]);
    const [manualLocationInput, setManualLocationInput] = useState('');
    const [manualInterests, setManualInterests] = useState([]);
    const [manualInterestInput, setManualInterestInput] = useState('');
    const manualLocationRef = useRef(null);
    const manualInterestRef = useRef(null);

    // Phase 6: Multi-language + Industry Templates
    const [adLanguage, setAdLanguage] = useState('english');
    const LANGUAGES = [
        { code: 'english', label: '🇬🇧 English', flag: '🇬🇧' },
        { code: 'hinglish', label: '🇮🇳 Hinglish', flag: '🇮🇳' },
        { code: 'hindi', label: '🇮🇳 हिंदी', flag: '🇮🇳' },
        { code: 'tamil', label: '🇮🇳 தமிழ்', flag: '🇮🇳' },
        { code: 'telugu', label: '🇮🇳 తెలుగు', flag: '🇮🇳' },
        { code: 'bengali', label: '🇮🇳 বাংলা', flag: '🇮🇳' },
        { code: 'marathi', label: '🇮🇳 मराठी', flag: '🇮🇳' },
        { code: 'kannada', label: '🇮🇳 ಕನ್ನಡ', flag: '🇮🇳' },
        { code: 'malayalam', label: '🇮🇳 മലയാളം', flag: '🇮🇳' },
        { code: 'gujarati', label: '🇮🇳 ગુજરાતી', flag: '🇮🇳' },
        { code: 'punjabi', label: '🇮🇳 ਪੰਜਾਬੀ', flag: '🇮🇳' },
        { code: 'urdu', label: '🇮🇳 اردو', flag: '🇮🇳' },
    ];

    const INDUSTRY_TEMPLATES = [
        { id: 'real_estate', icon: '🏠', label: 'Real Estate', name: 'Property Showcase', description: 'We are a real estate company offering premium residential apartments/villas. We want to generate site visit bookings. Target audience: working professionals and families aged 28-50 looking to buy homes in [City].' },
        { id: 'edtech', icon: '🎓', label: 'EdTech / Coaching', name: 'Free Demo Class', description: 'We offer online/offline coaching classes for competitive exams (UPSC/NEET/JEE/CA). We want students to register for a free demo class. Target: students aged 16-25 and their parents in India.' },
        { id: 'healthcare', icon: '🏥', label: 'Healthcare', name: 'Doctor Appointment', description: 'We are a multi-specialty hospital/clinic offering consultations with expert doctors. We want patients to book an appointment via WhatsApp. Target: adults aged 25-60 seeking medical care in [City].' },
        { id: 'fashion', icon: '👗', label: 'Fashion D2C', name: 'Exclusive Offer', description: 'We are a fashion brand selling trendy clothing/accessories online. We have an exclusive 30-50% off sale running. Target: fashion-conscious women/men aged 18-40 interested in online shopping across India.' },
        { id: 'automobile', icon: '🚗', label: 'Automobile', name: 'Book Test Drive', description: 'We are an authorized car/bike dealership. We want customers to book a free test drive of our latest models. Target: adults aged 25-55 interested in buying vehicles in [City].' },
    ];

    // ── Phase 2: Automation Attachment State ──
    const [automationType, setAutomationType] = useState('none'); // 'none' | 'flowbot' | 'template'
    const [flows, setFlows] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedFlowId, setSelectedFlowId] = useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [icebreaker, setIcebreaker] = useState('');
    const [loadingAutomation, setLoadingAutomation] = useState(false);

    // Fetch flows + templates when automation step is reached
    useEffect(() => {
        if (currentStep === 3) {
            setLoadingAutomation(true);
            Promise.allSettled([
                axios.get('/api/flows', { withCredentials: true }),
                axios.get('/api/templates', { withCredentials: true }),
            ]).then(([flowsRes, templatesRes]) => {
                if (flowsRes.status === 'fulfilled') {
                    setFlows(flowsRes.value.data || []);
                }
                if (templatesRes.status === 'fulfilled') {
                    // Only show approved templates
                    const approved = (templatesRes.value.data?.templates || templatesRes.value.data || [])
                        .filter(t => t.status === 'APPROVED');
                    setTemplates(approved);
                }
            }).finally(() => setLoadingAutomation(false));
        }
    }, [currentStep]);

    // Auto-generate icebreaker when creative is selected
    useEffect(() => {
        if (creativeData && creativeData[selectedCreativeIndex]) {
            const headline = creativeData[selectedCreativeIndex]?.headline || '';
            if (headline && !icebreaker) {
                setIcebreaker(`Hi! I saw your ad about "${headline}" and I'm interested. Can you tell me more?`);
            }
        }
    }, [creativeData, selectedCreativeIndex]);

    // Step 1 -> Step 2
    const handleGenerateAudience = async () => {
        if (!businessData.description || businessData.description.length < 10) {
            return toast.error("Please provide a detailed description so AI can work effectively.");
        }
        setLoading(true);
        try {
            const res = await axios.post('/api/meta-ads/ai-research', {
                businessDescription: `Business Name: ${businessData.name}\n${businessData.description}`,
                targetLocations: targetLocations.length > 0 ? targetLocations : undefined
            }, { withCredentials: true });
            
            setAudienceData(res.data.research);
            toast.success(`AI Research completed! (${res.data.tokensDeducted} tokens used)`);
            setCurrentStep(1);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to generate AI audience.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2 -> Step 3
    const handleGenerateCopy = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/api/meta-ads/ai-copy', {
                businessDescription: `Business Name: ${businessData.name}\n${businessData.description}`,
                tone: 'High-converting, action-oriented for WhatsApp',
                language: adLanguage
            }, { withCredentials: true });
            
            setCreativeData(res.data.copy.variations);
            toast.success(`AI Copy generated! (${res.data.tokensDeducted} tokens used)`);
            setCurrentStep(2);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to generate AI copy.");
        } finally {
            setLoading(false);
        }
    };

    // Step 4: Generate Image
    const handleGenerateImage = async () => {
        setGeneratingImage(true);
        try {
            const res = await axios.post('/api/meta-ads/ai-image', {
                businessDescription: `Business Name: ${businessData.name}\n${businessData.description}`
            }, { withCredentials: true });
            
            setGeneratedImage(res.data.imageUrl);
            toast.success(`AI Image generated! (${res.data.tokensDeducted} tokens used)`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to generate AI image.");
        } finally {
            setGeneratingImage(false);
        }
    };

    // Step 5: Publish
    const handlePublish = async () => {
        const selectedCreative = creativeData[selectedCreativeIndex];
        setLoading(true);
        try {
            const res = await axios.post('/api/meta-ads/publish', {
                campaignName: `${businessData.name.replace(/\s+/g,'_')}_AI_Campaign`,
                objective: budgetData.objective,
                dailyBudget: budgetData.dailyBudget,
                targeting: audienceData,
                creatives: selectedCreative,
                imageUrl: generatedImage,
                // Phase 2: Automation data
                automation: {
                    type: automationType,
                    flowId: automationType === 'flowbot' ? selectedFlowId : null,
                    templateId: automationType === 'template' ? selectedTemplateId : null,
                    icebreaker: icebreaker || null,
                }
            }, { withCredentials: true });
            
            toast.success("Campaign prepared successfully!");
            navigate('/growth-hub');
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to publish." );
        } finally {
            setLoading(false);
        }
    };

    // ── Manual Publish Handler ──
    const handleManualPublish = async () => {
        if (!manual.campaignName.trim()) return toast.error('Campaign name is required.');
        if (!manual.primaryText.trim()) return toast.error('Ad primary text is required.');
        if (!manual.headline.trim()) return toast.error('Headline is required.');
        if (manualLocations.length === 0) return toast.error('Add at least one target location.');

        setLoading(true);
        try {
            await axios.post('/api/meta-ads/publish', {
                campaignName: manual.campaignName,
                objective: manual.objective,
                dailyBudget: manual.dailyBudget,
                targeting: {
                    age_min: manual.ageMin,
                    age_max: manual.ageMax,
                    locations: manualLocations,
                    interests: manualInterests,
                },
                creatives: {
                    primary_text: manual.primaryText,
                    headline: manual.headline,
                },
                imageUrl: null,
                automation: {
                    type: automationType,
                    flowId: automationType === 'flowbot' ? selectedFlowId : null,
                    templateId: automationType === 'template' ? selectedTemplateId : null,
                    icebreaker: icebreaker || null,
                }
            }, { withCredentials: true });
            toast.success('Campaign saved successfully!');
            navigate('/growth-hub');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save campaign.');
        } finally {
            setLoading(false);
        }
    };

    // ── Get selected automation label for review ──
    const getAutomationLabel = () => {
        if (automationType === 'flowbot') {
            const flow = flows.find(f => f.id === selectedFlowId);
            return flow ? `FlowBot: ${flow.name}` : 'FlowBot (not selected)';
        }
        if (automationType === 'template') {
            const tpl = templates.find(t => t.id === selectedTemplateId || t.name === selectedTemplateId);
            return tpl ? `Template: ${tpl.name}` : 'Template (not selected)';
        }
        return 'No automation — leads go to inbox';
    };

    // ── Manual Form Tag Helper ──
    const addManualLocation = () => {
        const loc = manualLocationInput.trim().replace(/,$/, '');
        if (loc && !manualLocations.includes(loc)) setManualLocations(p => [...p, loc]);
        setManualLocationInput('');
    };
    const addManualInterest = () => {
        const int = manualInterestInput.trim().replace(/,$/, '');
        if (int && !manualInterests.includes(int)) setManualInterests(p => [...p, int]);
        setManualInterestInput('');
    };

    // ════════════════════════════════════════════════
    //  MANUAL FORM RENDERER
    // ════════════════════════════════════════════════
    const renderManualForm = () => {
        const OBJECTIVES = [
            { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', desc: 'Drive WhatsApp chats', emoji: '💬' },
            { value: 'OUTCOME_LEADS', label: 'Lead Gen', desc: 'Collect qualified leads', emoji: '🎯' },
            { value: 'OUTCOME_TRAFFIC', label: 'Traffic', desc: 'Drive website visits', emoji: '🌐' },
            { value: 'OUTCOME_AWARENESS', label: 'Awareness', desc: 'Maximize brand reach', emoji: '📢' },
        ];
        const QUICK_LOCATIONS = ['India', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'UAE', 'USA', 'UK', 'Singapore'];
        const QUICK_INTERESTS = ['Small Business', 'E-commerce', 'Entrepreneurship', 'Digital Marketing', 'Online Shopping', 'Real Estate', 'Health & Fitness', 'Fashion', 'Technology', 'Education'];

        return (
            <div className="space-y-8">

                {/* ─ Section 1: Campaign Identity ─ */}
                <div className="group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Campaign Identity</h3>
                            <p className="text-xs text-slate-400">Name and goal of this campaign</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl p-5 space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Campaign Name *</label>
                            <input
                                type="text"
                                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400/50 transition-all placeholder-slate-400"
                                placeholder="e.g. Diwali Sale 2025 – WhatsApp Leads"
                                value={manual.campaignName}
                                onChange={e => setManual({...manual, campaignName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Campaign Objective</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {OBJECTIVES.map(obj => (
                                    <button
                                        key={obj.value}
                                        type="button"
                                        onClick={() => setManual({...manual, objective: obj.value})}
                                        className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                                            manual.objective === obj.value
                                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-lg shadow-violet-500/10'
                                                : 'border-slate-100 dark:border-white/5 hover:border-violet-200 dark:hover:border-violet-500/30 bg-white dark:bg-surface-dark'
                                        }`}
                                    >
                                        {manual.objective === obj.value && (
                                            <span className="absolute top-2 right-2 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            </span>
                                        )}
                                        <span className="text-2xl">{obj.emoji}</span>
                                        <div>
                                            <p className={`text-xs font-bold ${manual.objective === obj.value ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'}`}>{obj.label}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{obj.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─ Section 2: Budget ─ */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                            <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Daily Budget</h3>
                            <p className="text-xs text-slate-400">How much to spend per day</p>
                        </div>
                        <div className="ml-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
                            ₹{manual.dailyBudget.toLocaleString()}/day
                        </div>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
                        <input
                            type="range" min="100" max="50000" step="100"
                            className="w-full accent-emerald-500 h-2 cursor-pointer"
                            value={manual.dailyBudget}
                            onChange={e => setManual({...manual, dailyBudget: parseInt(e.target.value)})}
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-2">
                            <span>₹100 <span className="text-slate-300">(Min)</span></span>
                            <div className="flex gap-2">
                                {[500, 1000, 5000, 10000].map(v => (
                                    <button key={v} type="button" onClick={() => setManual({...manual, dailyBudget: v})} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${ manual.dailyBudget === v ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 hover:bg-slate-300'}`}>₹{v>=1000?`${v/1000}K`:v}</button>
                                ))}
                            </div>
                            <span>₹50K+</span>
                        </div>
                    </div>
                </div>

                {/* ─ Section 3: Audience ─ */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Target Audience</h3>
                            <p className="text-xs text-slate-400">Who should see your ads</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl p-5 space-y-6">

                        {/* Age Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Min Age</label>
                                <div className="relative">
                                    <input type="number" min="13" max="65" className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-center text-lg font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400/50" value={manual.ageMin} onChange={e => setManual({...manual, ageMin: parseInt(e.target.value)||18})} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">yrs</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Age</label>
                                <div className="relative">
                                    <input type="number" min="13" max="65" className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-center text-lg font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400/50" value={manual.ageMax} onChange={e => setManual({...manual, ageMax: parseInt(e.target.value)||55})} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">yrs</span>
                                </div>
                            </div>
                        </div>

                        {/* Locations */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                <MapPin className="w-3.5 h-3.5 text-red-400" /> Target Locations *
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                                {manualLocations.map((loc, i) => (
                                    <span key={i} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 px-3 py-1 rounded-full text-xs font-bold">
                                        📍 {loc}
                                        <button onClick={() => setManualLocations(p => p.filter((_,idx) => idx!==i))} className="hover:text-red-900 transition-colors">×</button>
                                    </span>
                                ))}
                                {manualLocations.length === 0 && <span className="text-xs text-slate-400 italic">No locations added yet...</span>}
                            </div>
                            <div className="flex gap-2">
                                <input ref={manualLocationRef} type="text" className="flex-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-400/40 transition-all" placeholder="Type city/state/country..." value={manualLocationInput} onChange={e => setManualLocationInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addManualLocation(); }}} />
                                <button type="button" onClick={addManualLocation} className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all"><Plus className="w-4 h-4" /></button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {QUICK_LOCATIONS.map(s => (
                                    <button key={s} type="button" onClick={() => { if (!manualLocations.includes(s)) setManualLocations(p => [...p, s]); }} className={`text-[10px] px-2 py-1 rounded-full border transition-all ${ manualLocations.includes(s) ? 'border-red-400 bg-red-50 dark:bg-red-500/10 text-red-600' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-400'}`}>{s}</button>
                                ))}
                            </div>
                        </div>

                        {/* Interests */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                <Tag className="w-3.5 h-3.5 text-blue-400" /> Interests / Targeting Keywords
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                                {manualInterests.map((int, i) => (
                                    <span key={i} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold">
                                        # {int}
                                        <button onClick={() => setManualInterests(p => p.filter((_,idx) => idx!==i))} className="hover:text-blue-900 transition-colors">×</button>
                                    </span>
                                ))}
                                {manualInterests.length === 0 && <span className="text-xs text-slate-400 italic">No interests added...</span>}
                            </div>
                            <div className="flex gap-2">
                                <input ref={manualInterestRef} type="text" className="flex-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400/40 transition-all" placeholder="e.g. Fashion, Online Shopping..." value={manualInterestInput} onChange={e => setManualInterestInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addManualInterest(); }}} />
                                <button type="button" onClick={addManualInterest} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all"><Plus className="w-4 h-4" /></button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {QUICK_INTERESTS.map(s => (
                                    <button key={s} type="button" onClick={() => { if (!manualInterests.includes(s)) setManualInterests(p => [...p, s]); }} className={`text-[10px] px-2 py-1 rounded-full border transition-all ${ manualInterests.includes(s) ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 text-blue-600' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-400'}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─ Section 4: Ad Creative ─ */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                            <PenLine className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Ad Creative</h3>
                            <p className="text-xs text-slate-400">The copy that drives users to WhatsApp</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl p-5 space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Primary Text * <span className="normal-case text-slate-400 font-normal">(Main ad body, up to 200 chars)</span></label>
                            <textarea
                                rows={4}
                                maxLength={200}
                                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400/50 transition-all leading-relaxed resize-none"
                                placeholder="Write your main ad text here. Use a hook in the first line. E.g.: 🔥 Flat 50% OFF on all dresses — limited time only! Click below to get your exclusive discount on WhatsApp."
                                value={manual.primaryText}
                                onChange={e => setManual({...manual, primaryText: e.target.value})}
                            />
                            <p className="text-right text-[10px] text-slate-400 mt-1">{manual.primaryText.length}/200</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Headline * <span className="normal-case text-slate-400 font-normal">(Short punchy CTA, up to 40 chars)</span></label>
                            <input
                                type="text"
                                maxLength={40}
                                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
                                placeholder="e.g. Chat Now & Get 50% OFF!"
                                value={manual.headline}
                                onChange={e => setManual({...manual, headline: e.target.value})}
                            />
                            <p className="text-right text-[10px] text-slate-400 mt-1">{manual.headline.length}/40</p>
                        </div>

                        {/* Live Preview */}
                        {(manual.primaryText || manual.headline) && (
                            <div className="mt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Live Preview</p>
                                <div className="bg-white dark:bg-[#242526] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm max-w-sm">
                                    <div className="p-3 flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">{manual.campaignName?.[0] || 'B'}</div>
                                        <div>
                                            <p className="font-bold text-xs text-slate-900 dark:text-[#E4E6EB]">{manual.campaignName || 'Your Business'}</p>
                                            <p className="text-[10px] text-slate-400">Sponsored · 🌍</p>
                                        </div>
                                    </div>
                                    <div className="px-3 pb-2">
                                        <p className="text-xs text-slate-800 dark:text-[#E4E6EB] leading-relaxed">{manual.primaryText}</p>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-[#3A3B3C] px-3 py-2.5 flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-wide">CHAT ON WHATSAPP</p>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{manual.headline || 'Your headline here'}</p>
                                        </div>
                                        <div className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] font-bold">WhatsApp</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─ Section 5: Meta Connection Status ─ */}
                {metaConnected === false && (
                    <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">Meta Account Not Connected</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Campaign will be saved as <strong>Draft</strong> and won't go live until you connect your Meta Ads account.</p>
                        </div>
                        <button onClick={() => navigate('/ctwa-analytics')} className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/40 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                            Connect <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* ─ Publish Button ─ */}
                <div className="flex gap-3 pt-2">
                    <button onClick={() => navigate(-1)} className="px-5 py-3.5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-sm">Cancel</button>
                    <button
                        onClick={handleManualPublish}
                        disabled={loading}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all text-sm ${
                            metaConnected
                                ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-500/25'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                        {metaConnected ? 'Publish Campaign' : 'Save as Draft'}
                    </button>
                </div>
            </div>
        );
    };

    const renderStepContent = () => {
        switch(currentStep) {
            case 0:
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-primary/10 to-transparent p-4 md:p-6 rounded-2xl border border-primary/20">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-primary" /> Describe Your Business
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                This helps our AI strategize the perfect audience targeting and ad copy.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Business / Product Name</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 dark:bg-surface-dark/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                placeholder="e.g. FitLife Gym"
                                value={businessData.name}
                                onChange={(e) => setBusinessData({...businessData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">What are you selling / offering?</label>
                            <textarea 
                                rows={5}
                                className="w-full bg-slate-50 dark:bg-surface-dark/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm leading-relaxed"
                                placeholder="e.g. We are offering a 30-day weight loss bootcamp. It includes personal training, diet plans, and access to the gym 24/7. Target audience is working professionals looking to get back in shape."
                                value={businessData.description}
                                onChange={(e) => setBusinessData({...businessData, description: e.target.value})}
                            />
                        </div>

                        {/* Phase 6: Ad Language Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-primary" /> Ad Copy Language
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setAdLanguage(lang.code)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                                            adLanguage === lang.code
                                                ? 'border-primary bg-primary/10 text-primary dark:text-primary'
                                                : 'border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}
                                    >
                                        <span>{lang.flag}</span> {lang.label.split(' ').pop()}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">AI will generate ad copy in this language. You can write your description in any language.</p>
                        </div>

                        {/* Geography Targeting — User Controlled */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-red-500" /> Target Locations <span className="text-xs font-normal text-slate-400">(Where you want your ads to run)</span>
                            </label>
                            {/* Tag display */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {targetLocations.map((loc, i) => (
                                    <span key={i} className="flex items-center gap-1.5 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-3 py-1 rounded-full text-xs font-bold">
                                        📍 {loc}
                                        <button onClick={() => setTargetLocations(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-900 dark:hover:text-red-100 transition-colors ml-0.5 text-sm leading-none">×</button>
                                    </span>
                                ))}
                                {targetLocations.length === 0 && (
                                    <span className="text-xs text-slate-400 italic">No locations added — AI will suggest locations based on your description.</span>
                                )}
                            </div>
                            {/* Input row */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-slate-50 dark:bg-surface-dark/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-400/50 transition-all"
                                    placeholder="e.g. Mumbai, Delhi, Karnataka..."
                                    value={locationInput}
                                    onChange={(e) => setLocationInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if ((e.key === 'Enter' || e.key === ',') && locationInput.trim()) {
                                            e.preventDefault();
                                            const loc = locationInput.trim().replace(/,$/, '');
                                            if (loc && !targetLocations.includes(loc)) {
                                                setTargetLocations(prev => [...prev, loc]);
                                            }
                                            setLocationInput('');
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const loc = locationInput.trim().replace(/,$/, '');
                                        if (loc && !targetLocations.includes(loc)) {
                                            setTargetLocations(prev => [...prev, loc]);
                                        }
                                        setLocationInput('');
                                    }}
                                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all flex-shrink-0"
                                >Add</button>
                            </div>
                            {/* Quick suggestions */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {['India', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'UAE', 'USA', 'UK'].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => {
                                            if (!targetLocations.includes(suggestion)) {
                                                setTargetLocations(prev => [...prev, suggestion]);
                                            }
                                        }}
                                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                                            targetLocations.includes(suggestion)
                                                ? 'border-red-400 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                                : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">Press Enter or comma to add. Click quick-suggestions or type any city/country/state. These become hard rules for the AI.</p>
                        </div>

                        {/* Phase 6: Industry Quick Templates */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-purple-500" /> Quick Start: Industry Templates
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                {INDUSTRY_TEMPLATES.map(tpl => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => setBusinessData({ name: tpl.name, description: tpl.description })}
                                        className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-all text-center group"
                                    >
                                        <span className="text-2xl group-hover:scale-110 transition-transform">{tpl.icon}</span>
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{tpl.label}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">Click to auto-fill. Customize the description with your specific details.</p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={handleGenerateAudience}
                                disabled={loading || !businessData.description}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 md:px-8 py-3.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                AI: Generate Audience Details
                            </button>
                        </div>
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-blue-500/10 to-transparent p-4 md:p-6 rounded-2xl border border-blue-500/20 mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                <Target className="w-5 h-5 text-blue-500" /> AI Target Audience
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                "{audienceData?.ai_strategy_note}"
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5">
                                    <h4 className="text-sm border-b border-slate-200 dark:border-white/5 pb-2 mb-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400" /> Demographics
                                    </h4>
                                    <div className="flex gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Min Age</label>
                                            <input type="number" className="w-20 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-center" value={audienceData?.age_min} onChange={e => setAudienceData({...audienceData, age_min: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Max Age</label>
                                            <input type="number" className="w-20 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-center" value={audienceData?.age_max} onChange={e => setAudienceData({...audienceData, age_max: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5">
                                    <h4 className="text-sm border-b border-slate-200 dark:border-white/5 pb-2 mb-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-red-400" /> Target Locations
                                        <span className="text-[10px] text-slate-400 font-normal ml-auto">Editable</span>
                                    </h4>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {audienceData?.locations?.map((loc, i) => (
                                            <span key={i} className="flex items-center gap-1.5 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-3 py-1 rounded-full text-xs font-bold">
                                                📍 {loc}
                                                <button
                                                    onClick={() => setAudienceData({...audienceData, locations: audienceData.locations.filter((_, idx) => idx !== i)})}
                                                    className="hover:text-red-900 transition-colors text-sm leading-none"
                                                >×</button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <input
                                            type="text"
                                            id="audience-location-add"
                                            className="flex-1 text-xs bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-400/40"
                                            placeholder="Add location..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                    const loc = e.target.value.trim();
                                                    if (!audienceData.locations?.includes(loc)) {
                                                        setAudienceData({...audienceData, locations: [...(audienceData.locations || []), loc]});
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5">
                                <h4 className="text-sm border-b border-slate-200 dark:border-white/5 pb-2 mb-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-slate-400" /> Detailed Targeting (Interests)
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {audienceData?.interests?.map((int, i) => (
                                        <span key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">{int}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-between">
                            <button onClick={() => setCurrentStep(0)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium px-4 py-2">Back</button>
                            <button 
                                onClick={handleGenerateCopy}
                                disabled={loading}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 md:px-8 py-3.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                AI: Generate Ad Copy
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-secondary/10 rounded-xl">
                                <Type className="w-6 h-6 text-secondary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select AI Generating Copy</h3>
                                <p className="text-sm text-slate-500">Pick the variation that best fits your brand tone.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {creativeData?.map((variation, index) => (
                                <motion.div 
                                    key={index}
                                    whileHover={{ y: -4 }}
                                    onClick={() => setSelectedCreativeIndex(index)}
                                    className={`cursor-pointer rounded-2xl border-2 transition-all overflow-hidden ${selectedCreativeIndex === index ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-primary/50'}`}
                                >
                                    {/* Mock Facebook Ad Preview */}
                                    <div className="bg-white dark:bg-[#242526] h-full flex flex-col">
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                    <span className="font-bold text-slate-500">{businessData.name[0]}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-black dark:text-[#E4E6EB] leading-none">{businessData.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-[#B0B3B8] mt-1">Sponsored • 🌍</p>
                                                </div>
                                            </div>
                                            <MoreVertical className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="px-4 pb-3">
                                            <p className="text-sm text-black dark:text-[#E4E6EB] whitespace-pre-wrap">{variation.primary_text}</p>
                                        </div>
                                        <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden flex-shrink-0 group">
                                            {generatedImage ? (
                                                <img src={generatedImage} alt="AI Generated Ad" className="w-full h-full object-cover" />
                                            ) : (
                                                <Image className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                                            )}
                                            {selectedCreativeIndex === index && (
                                                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateImage(); }}
                                                        disabled={generatingImage}
                                                        className="bg-primary hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                                                    >
                                                        {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                        {generatingImage ? 'Generating...' : (generatedImage ? 'Regenerate AI Image' : 'Generate AI Image')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-slate-100 dark:bg-[#3A3B3C] p-4 flex items-center justify-between border-t border-slate-200 dark:border-white/5 mt-auto">
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-[#B0B3B8] uppercase tracking-wide">CHAT ON WHATSAPP</p>
                                                <p className="font-bold text-sm text-black dark:text-[#E4E6EB]">{variation.headline}</p>
                                            </div>
                                            <div className="px-4 py-2 bg-slate-200 dark:bg-[#4E4F50] rounded-lg text-sm font-bold text-black dark:text-white">
                                                WhatsApp
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-6 flex justify-between">
                            <button onClick={() => setCurrentStep(1)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium px-4 py-2">Back</button>
                            <button 
                                onClick={() => setCurrentStep(3)}
                                className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 md:px-8 py-3.5 rounded-xl font-bold transition-all"
                            >
                                Set Up Automation <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                );

            // ═══════════════════════════════════════════════════════════
            //  PHASE 2: NEW AUTOMATION ATTACHMENT STEP
            // ═══════════════════════════════════════════════════════════
            case 3:
                return (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 md:p-6 rounded-2xl border border-purple-500/20">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                <Bot className="w-5 h-5 text-purple-500" /> What happens when someone clicks your ad?
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Attach an automated response to instantly engage leads the moment they message you. This alone can increase your conversion rate by 3-5x.
                            </p>
                        </div>

                        {/* Automation Type Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Option A: FlowBot */}
                            <motion.div
                                whileHover={{ y: -2 }}
                                onClick={() => setAutomationType('flowbot')}
                                className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                                    automationType === 'flowbot'
                                        ? 'border-purple-500 ring-4 ring-purple-500/10 bg-purple-50 dark:bg-purple-500/5'
                                        : 'border-slate-200 dark:border-white/10 hover:border-purple-300 bg-white dark:bg-surface-dark'
                                }`}
                            >
                                {automationType === 'flowbot' && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-purple-500" />
                                    </div>
                                )}
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 shadow-lg shadow-purple-500/20">
                                    <Workflow className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Attach FlowBot</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    An automated chatbot will greet, qualify, and route the lead. Best for high-volume campaigns.
                                </p>
                                <div className="mt-3 px-3 py-1.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-lg text-[11px] font-bold inline-block">
                                    ⚡ RECOMMENDED
                                </div>
                            </motion.div>

                            {/* Option B: Template Message */}
                            <motion.div
                                whileHover={{ y: -2 }}
                                onClick={() => setAutomationType('template')}
                                className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                                    automationType === 'template'
                                        ? 'border-blue-500 ring-4 ring-blue-500/10 bg-blue-50 dark:bg-blue-500/5'
                                        : 'border-slate-200 dark:border-white/10 hover:border-blue-300 bg-white dark:bg-surface-dark'
                                }`}
                            >
                                {automationType === 'template' && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                    </div>
                                )}
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Auto-Reply Template</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Send an approved template message instantly. Good for catalogs, offers, and appointment booking.
                                </p>
                            </motion.div>

                            {/* Option C: No Automation */}
                            <motion.div
                                whileHover={{ y: -2 }}
                                onClick={() => setAutomationType('none')}
                                className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                                    automationType === 'none'
                                        ? 'border-slate-500 ring-4 ring-slate-500/10 bg-slate-50 dark:bg-white/5'
                                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-white dark:bg-surface-dark'
                                }`}
                            >
                                {automationType === 'none' && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-slate-500" />
                                    </div>
                                )}
                                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-3">
                                    <MessageCircle className="w-6 h-6 text-slate-500" />
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">No Automation</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Leads land directly in your inbox. Your team will need to respond manually within the 72-hour window.
                                </p>
                            </motion.div>
                        </div>

                        {/* Conditional: FlowBot Selector */}
                        <AnimatePresence mode="wait">
                            {automationType === 'flowbot' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                            <Workflow className="w-4 h-4 text-purple-500" /> Select a FlowBot
                                        </h4>
                                        {loadingAutomation ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Loading your flows...
                                            </div>
                                        ) : flows.length === 0 ? (
                                            <div className="text-center py-6">
                                                <Bot className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                                <p className="text-sm text-slate-500 mb-3">No FlowBots created yet.</p>
                                                <button
                                                    onClick={() => window.open('/flowbot', '_blank')}
                                                    className="text-primary font-bold text-sm hover:text-secondary transition-colors inline-flex items-center gap-1"
                                                >
                                                    Create a FlowBot <ExternalLink className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {flows.map(flow => (
                                                    <div
                                                        key={flow.id}
                                                        onClick={() => setSelectedFlowId(flow.id)}
                                                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                                            selectedFlowId === flow.id
                                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                                                                : 'border-slate-100 dark:border-white/5 hover:border-purple-200 dark:hover:border-purple-500/30'
                                                        }`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                            flow.isActive
                                                                ? 'bg-green-100 dark:bg-green-500/20 text-green-600'
                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                                        }`}>
                                                            <Workflow className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{flow.name}</p>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                                {flow.isActive ? '🟢 Active' : '⚪ Inactive'}
                                                                {flow.triggerKeyword && ` · Trigger: "${flow.triggerKeyword}"`}
                                                            </p>
                                                        </div>
                                                        {selectedFlowId === flow.id && (
                                                            <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {automationType === 'template' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-blue-500" /> Select an Approved Template
                                        </h4>
                                        {loadingAutomation ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Loading templates...
                                            </div>
                                        ) : templates.length === 0 ? (
                                            <div className="text-center py-6">
                                                <Mail className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                                <p className="text-sm text-slate-500 mb-3">No approved templates found.</p>
                                                <button
                                                    onClick={() => window.open('/templates', '_blank')}
                                                    className="text-primary font-bold text-sm hover:text-secondary transition-colors inline-flex items-center gap-1"
                                                >
                                                    Create a Template <ExternalLink className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                                                {templates.map(tpl => (
                                                    <div
                                                        key={tpl.id || tpl.name}
                                                        onClick={() => setSelectedTemplateId(tpl.id || tpl.name)}
                                                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                                            (selectedTemplateId === tpl.id || selectedTemplateId === tpl.name)
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                                : 'border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/30'
                                                        }`}
                                                    >
                                                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                                                            <Mail className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{tpl.name}</p>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 uppercase">{tpl.category} · {tpl.language}</p>
                                                        </div>
                                                        {(selectedTemplateId === tpl.id || selectedTemplateId === tpl.name) && (
                                                            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Icebreaker Message */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-emerald-500" /> Pre-Filled Icebreaker Message
                            </h4>
                            <p className="text-xs text-slate-500">
                                This message will auto-populate in the user's WhatsApp when they click your ad. A good icebreaker helps trigger the right FlowBot or gives your team instant context.
                            </p>
                            <textarea
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                placeholder="Hi! I saw your ad and I'm interested. Tell me more!"
                                value={icebreaker}
                                onChange={(e) => setIcebreaker(e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5 text-slate-400" />
                                <p className="text-[11px] text-slate-400">
                                    Tip: If you're using a FlowBot with a trigger keyword, include it in the icebreaker (e.g., "Hi, I'm interested in the <strong>summer-sale</strong> offer").
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-between">
                            <button onClick={() => setCurrentStep(2)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium px-4 py-2">Back</button>
                            <button 
                                onClick={() => setCurrentStep(4)}
                                className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 md:px-8 py-3.5 rounded-xl font-bold transition-all"
                            >
                                Review & Publish <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Ready for Launch</h3>
                            <p className="text-slate-500 dark:text-text-secondary mt-2">Set your budget to start capturing WhatsApp leads directly from Meta.</p>
                        </div>

                        {/* Meta Connection Gate */}
                        {metaConnected === false && (
                            <div className="flex items-start gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl">
                                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-bold text-amber-900 dark:text-amber-300">Meta Ads Account Not Connected</p>
                                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                        You haven't linked a Facebook Ad Account. Clicking "Publish" will save this as a <strong>local Draft only</strong> — it will NOT go live on Meta until you connect your account.
                                    </p>
                                    <button
                                        onClick={() => navigate('/ctwa-analytics')}
                                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-300 underline hover:no-underline"
                                    >
                                        Connect your Meta Ads Account <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Campaign Summary */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Campaign Summary</h4>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                <div className="flex justify-between items-center px-5 py-3.5">
                                    <span className="text-sm text-slate-500">Business</span>
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{businessData.name}</span>
                                </div>
                                <div className="flex justify-between items-center px-5 py-3.5">
                                    <span className="text-sm text-slate-500">Audience</span>
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                        Age {audienceData?.age_min}-{audienceData?.age_max} · {audienceData?.locations?.join(', ')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center px-5 py-3.5">
                                    <span className="text-sm text-slate-500">Creative</span>
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[200px]">
                                        {creativeData?.[selectedCreativeIndex]?.headline}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center px-5 py-3.5">
                                    <span className="text-sm text-slate-500">Automation</span>
                                    <span className={`font-semibold text-sm ${automationType !== 'none' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500'}`}>
                                        {getAutomationLabel()}
                                    </span>
                                </div>
                                {icebreaker && (
                                    <div className="flex justify-between items-start px-5 py-3.5">
                                        <span className="text-sm text-slate-500 flex-shrink-0 mr-4">Icebreaker</span>
                                        <span className="font-medium text-xs text-slate-700 dark:text-slate-300 text-right italic">
                                            "{icebreaker.substring(0, 80)}{icebreaker.length > 80 ? '...' : ''}"
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <CreditCard className="w-5 h-5 text-slate-400" />
                                <h4 className="font-bold text-slate-900 dark:text-white">Budget &amp; Schedule</h4>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        <span>Daily Budget</span>
                                        <span className="text-primary">₹{budgetData.dailyBudget}</span>
                                    </label>
                                    <input 
                                        type="range" min="100" max="50000" step="100"
                                        className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        value={budgetData.dailyBudget}
                                        onChange={(e) => setBudgetData({...budgetData, dailyBudget: parseInt(e.target.value)})}
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                                        <span>₹100</span>
                                        <span>₹50,000+</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex gap-3 mt-4">
                                    <Zap className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    <p className="text-sm text-emerald-800 dark:text-emerald-300">
                                        {metaConnected
                                            ? <><strong>Ready to go!</strong> Clicking "Publish" will immediately launch this campaign as <strong>ACTIVE</strong> on your connected Facebook Ads Manager.</>
                                            : <><strong>Draft Mode.</strong> This campaign will be saved locally. Connect your Meta account to publish it live.</>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-between">
                            <button onClick={() => setCurrentStep(3)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl">Back to Automation</button>
                            <button 
                                onClick={handlePublish}
                                disabled={loading}
                                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all w-full justify-center ml-4 ${
                                    metaConnected
                                        ? 'bg-primary hover:bg-primary/90 shadow-md text-white'
                                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25 text-white'
                                }`}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                                {metaConnected ? 'Publish Ad Campaign' : 'Save as Draft'}
                            </button>
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">

            {/* ══════════════════════════════════════════
                MODE TOGGLE — Premium dual-mode selector
            ══════════════════════════════════════════ */}
            <div className="mb-8">
                {/* Back link */}
                <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-6 group">
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Meta Ads
                </button>

                {/* Toggle Card */}
                <div className="relative bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl p-2 shadow-xl shadow-black/5 dark:shadow-black/20 flex gap-2">
                    {/* Sliding background */}
                    <motion.div
                        layout
                        className="absolute inset-2 rounded-2xl"
                        style={{ width: 'calc(50% - 8px)' }}
                        animate={{ x: creationMode === 'manual' ? 'calc(100% + 8px)' : '0%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    >
                        <div className={`h-full w-full rounded-2xl shadow-lg ${
                            creationMode === 'ai'
                                ? 'bg-gradient-to-br from-primary to-secondary'
                                : 'bg-gradient-to-br from-violet-600 to-purple-700'
                        }`} />
                    </motion.div>

                    {/* AI Mode Button */}
                    <button
                        onClick={() => setCreationMode('ai')}
                        className="relative z-10 flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-2xl transition-colors group"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            creationMode === 'ai'
                                ? 'bg-white/20 text-white'
                                : 'bg-primary/10 text-primary group-hover:bg-primary/15'
                        }`}>
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <p className={`font-bold text-sm transition-colors ${ creationMode === 'ai' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                AI-Assisted Wizard
                            </p>
                            <p className={`text-xs transition-colors ${ creationMode === 'ai' ? 'text-white/70' : 'text-slate-400'}`}>
                                Let AI generate targeting & copy
                            </p>
                        </div>
                        {creationMode === 'ai' && (
                            <span className="ml-auto bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">⚡ ACTIVE</span>
                        )}
                    </button>

                    {/* Manual Mode Button */}
                    <button
                        onClick={() => setCreationMode('manual')}
                        className="relative z-10 flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-2xl transition-colors group"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            creationMode === 'manual'
                                ? 'bg-white/20 text-white'
                                : 'bg-violet-500/10 text-violet-600 group-hover:bg-violet-500/15'
                        }`}>
                            <SlidersHorizontal className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <p className={`font-bold text-sm transition-colors ${ creationMode === 'manual' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                Manual Builder
                            </p>
                            <p className={`text-xs transition-colors ${ creationMode === 'manual' ? 'text-white/70' : 'text-slate-400'}`}>
                                Full control, zero AI tokens
                            </p>
                        </div>
                        {creationMode === 'manual' && (
                            <span className="ml-auto bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✍️ ACTIVE</span>
                        )}
                    </button>
                </div>

                {/* Mode description bar */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={creationMode}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 flex items-center gap-3 px-4"
                    >
                        {creationMode === 'ai' ? (
                            <>
                                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    <strong className="text-slate-700 dark:text-slate-300">AI Wizard</strong> — Describe your business and AI will generate optimal audience targeting, ad copy, and strategy in seconds.
                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">~20–30 tokens used</span>
                                </p>
                            </>
                        ) : (
                            <>
                                <SlidersHorizontal className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    <strong className="text-slate-700 dark:text-slate-300">Manual Builder</strong> — Set every parameter yourself. Ideal for experienced marketers who know exactly what they want.
                                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">0 tokens</span>
                                </p>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ══════════════════════════════════════════
                CONDITIONAL CONTENT
            ══════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={creationMode}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                >
                    {creationMode === 'ai' ? (
                        // ── AI WIZARD ──
                        <>
                            {/* Stepper Header */}
                            <div className="mb-10">
                                <div className="flex items-center justify-between relative">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full z-0"></div>
                                    <div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-primary to-secondary rounded-full z-0 transition-all duration-500"
                                        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                                    ></div>
                                    {steps.map((step, index) => {
                                        const Icon = step.icon;
                                        const isActive = index <= currentStep;
                                        return (
                                            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 bg-transparent">
                                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 border-4 border-[#F8FAFC] dark:border-[#0f172a] ${isActive ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'bg-slate-200 dark:bg-surface-dark text-slate-400'}`}>
                                                    <Icon className="w-4 h-4 md:w-5 md:h-5" />
                                                </div>
                                                <span className={`text-[10px] md:text-xs font-bold absolute -bottom-6 w-max ${isActive ? 'text-primary' : 'text-slate-400'}`}>{step.title}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl p-4 md:p-8 shadow-xl mt-12 min-h-[500px]">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentStep}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {renderStepContent()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        // ── MANUAL BUILDER ──
                        <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl p-4 md:p-8 shadow-xl">
                            {renderManualForm()}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

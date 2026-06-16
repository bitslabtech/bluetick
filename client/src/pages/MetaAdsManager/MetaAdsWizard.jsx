import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Target, Type, CreditCard, ChevronRight, ChevronLeft, 
    CheckCircle2, AlertTriangle, Loader2, Megaphone, MapPin, 
    Users, Briefcase, Zap, Image, TrendingUp, ExternalLink, MoreVertical,
    Bot, MessageCircle, Mail, ArrowRight, Workflow, Radio, Globe,
    PenLine, SlidersHorizontal, Hash, FileText, Plus, X, Tag,
    Search, Building2, Flag, UploadCloud, Trash2, Info, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// ── LocationSearchInput: Smart Meta Targeting Geo Search ──────────────────────────
// Calls /api/meta-ads/location-search (Meta Graph API or curated fallback)
// Accepts: selectedLocations (array of {key, name, type, countryName, region}), onChange
const TYPE_ICON = {
    country: '🌍',
    region: '🗺️',
    city: '🏙️',
    zip: '📮',
    geo_market: '📍',
};
const TYPE_LABEL = {
    country: 'Country',
    region: 'State / Region',
    city: 'City',
    zip: 'ZIP Code',
    geo_market: 'Market Area',
};

function LocationSearchInput({ selectedLocations, onChange, placeholder = 'Search city, state, country...' }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [source, setSource] = useState('local');
    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced search
    const doSearch = useCallback(async (q) => {
        if (!q || q.length < 2) { setResults([]); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await axios.get(`/api/meta-ads/location-search?q=${encodeURIComponent(q)}`, { withCredentials: true });
            setResults(res.data.locations || []);
            setSource(res.data.source);
            setOpen(true);
            setActiveIdx(-1);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInput = (e) => {
        const v = e.target.value;
        setQuery(v);
        clearTimeout(debounceRef.current);
        if (v.length >= 2) {
            debounceRef.current = setTimeout(() => doSearch(v), 300);
        } else {
            setResults([]);
            setOpen(false);
        }
    };

    const addLocation = (loc) => {
        const already = selectedLocations.some(l => l.key === loc.key);
        if (!already) onChange([...selectedLocations, loc]);
        setQuery('');
        setResults([]);
        setOpen(false);
        inputRef.current?.focus();
    };

    const removeLocation = (key) => onChange(selectedLocations.filter(l => l.key !== key));

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') { setOpen(false); return; }
        if (!open || results.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); addLocation(results[activeIdx]); }
    };

    return (
        <div ref={wrapRef} className="space-y-2">
            {/* Selected location tags */}
            {selectedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedLocations.map((loc) => (
                        <motion.span
                            key={loc.key}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="flex items-center gap-1.5 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 px-3 py-1.5 rounded-full text-xs font-bold"
                        >
                            <span>{TYPE_ICON[loc.type] || '📍'}</span>
                            <span>{loc.name}</span>
                            {loc.type !== 'country' && loc.countryCode && (
                                <span className="text-red-400 font-normal">({loc.countryCode})</span>
                            )}
                            <button
                                type="button"
                                onClick={() => removeLocation(loc.key)}
                                className="ml-0.5 w-4 h-4 rounded-full bg-red-200 dark:bg-red-500/30 flex items-center justify-center hover:bg-red-300 transition-colors text-red-600 dark:text-red-300 text-[10px] font-black leading-none"
                            >×</button>
                        </motion.span>
                    ))}
                </div>
            )}
            {selectedLocations.length === 0 && (
                <p className="text-xs text-slate-400 italic">No locations added yet. Search and select below.</p>
            )}

            {/* Search input + dropdown */}
            <div className="relative">
                <div className="relative flex items-center">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin pointer-events-none" />}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        onFocus={() => { if (results.length > 0) setOpen(true); }}
                        placeholder={placeholder}
                        className="w-full bg-white dark:bg-surface-dark border-2 border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-red-400 dark:focus:border-red-500 transition-all placeholder-slate-400"
                        autoComplete="off"
                    />
                </div>

                {/* Results dropdown */}
                <AnimatePresence>
                    {open && results.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden"
                        >
                            {source === 'meta' && (
                                <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Live from Meta Targeting Database</span>
                                </div>
                            )}
                            <div className="max-h-64 overflow-y-auto">
                                {results.map((loc, idx) => {
                                    const isSelected = selectedLocations.some(l => l.key === loc.key);
                                    return (
                                        <button
                                            key={loc.key}
                                            type="button"
                                            onMouseDown={(e) => { e.preventDefault(); addLocation(loc); }}
                                            onMouseEnter={() => setActiveIdx(idx)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                isSelected ? 'bg-red-50 dark:bg-red-500/10' :
                                                activeIdx === idx ? 'bg-slate-50 dark:bg-white/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                                                {TYPE_ICON[loc.type] || '📍'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${ isSelected ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white' }`}>
                                                    {loc.name}
                                                </p>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {TYPE_LABEL[loc.type] || loc.type}
                                                    {loc.region && ` · ${loc.region}`}
                                                    {loc.countryName && ` · ${loc.countryName}`}
                                                </p>
                                            </div>
                                            {isSelected ? (
                                                <CheckCircle2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 dark:text-white/20 flex-shrink-0">{loc.countryCode}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5">
                                <p className="text-[10px] text-slate-400">
                                    {source === 'meta' ? '✅ Verified Meta targeting locations' : '📋 Curated location list (connect Meta Ads for live search)'}
                                </p>
                            </div>
                        </motion.div>
                    )}
                    {open && query.length >= 2 && results.length === 0 && !loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl px-5 py-5 text-center"
                        >
                            <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-500">No results for "{query}"</p>
                            <p className="text-xs text-slate-400 mt-1">Try a different spelling or search for a nearby city</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quick picks */}
            <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider self-center mr-1">Quick:</span>
                {[
                    { key: 'IN', name: 'India', type: 'country', countryCode: 'IN', countryName: 'India' },
                    { key: 'Mumbai', name: 'Mumbai', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Maharashtra' },
                    { key: 'Delhi', name: 'Delhi', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Delhi' },
                    { key: 'Bangalore', name: 'Bangalore', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Karnataka' },
                    { key: 'AE', name: 'UAE', type: 'country', countryCode: 'AE', countryName: 'UAE' },
                    { key: 'US', name: 'USA', type: 'country', countryCode: 'US', countryName: 'United States' },
                    { key: 'GB', name: 'UK', type: 'country', countryCode: 'GB', countryName: 'United Kingdom' },
                ].map(loc => {
                    const isSelected = selectedLocations.some(l => l.key === loc.key);
                    return (
                        <button
                            key={loc.key}
                            type="button"
                            onClick={() => isSelected ? removeLocation(loc.key) : addLocation(loc)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                                isSelected
                                    ? 'border-red-400 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                    : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-red-300 hover:text-red-600 dark:hover:border-red-500/40'
                            }`}
                        >
                            {TYPE_ICON[loc.type]} {loc.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}


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
    const [checklistChecks, setChecklistChecks] = useState({ hasMetaToken: false, hasAdAccount: false, hasWhatsApp: false, hasWabaSetup: false, hasPageWabaLink: false, hasValidPaymentMethod: false });
    const [checklistLoading, setChecklistLoading] = useState(false);
    const [expandedCheck, setExpandedCheck] = useState(null);
    const [hasAttemptedAutoOpen, setHasAttemptedAutoOpen] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);   // prereq modal
    const [showPreview, setShowPreview] = useState(false);        // ad preview modal

    const fetchStatus = async (autoOpen = false) => {
        try {
            const res = await axios.get('/api/ctwa/status', { withCredentials: true });
            setMetaConnected(res.data.connected);
            if (res.data.checks) {
                setChecklistChecks(res.data.checks);
                const checksFailed = Object.values(res.data.checks).some(v => !v);
                if (checksFailed && autoOpen) {
                    setShowChecklist(true);
                }
            }
        } catch { setMetaConnected(false); }
    };

    // Check Meta connection on mount
    useEffect(() => { fetchStatus(true); }, []);

    // Form State
    const [businessData, setBusinessData] = useState({ name: '', description: '' });
    const [audienceData, setAudienceData] = useState(null); // From AI
    const [creativeData, setCreativeData] = useState(null); // From AI
    const [selectedCreativeIndex, setSelectedCreativeIndex] = useState(0);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [budgetData, setBudgetData] = useState({ budgetType: 'daily', dailyBudget: 500, lifetimeBudget: 3000, objective: 'OUTCOME_ENGAGEMENT' });

    // Geography targeting — user controls this, not AI
    const [targetLocations, setTargetLocations] = useState([]);
    // locationInput / manualLocationInput no longer needed — replaced by LocationSearchInput

    const [manual, setManual] = useState({
        campaignName: '',
        objective: 'OUTCOME_ENGAGEMENT',
        budgetType: 'daily',
        dailyBudget: 500,
        lifetimeBudget: 3000,
        ageMin: 18,
        ageMax: 55,
        primaryText: '',
        headline: '',
    });
    const [manualLocations, setManualLocations] = useState([]);
    const [manualInterests, setManualInterests] = useState([]);
    const [manualInterestInput, setManualInterestInput] = useState('');
    const manualInterestRef = useRef(null);
    const [manualImage, setManualImage] = useState(null); // base64 data URL from upload
    const manualImageRef = useRef(null); // hidden <input type="file" />
    const aiImageRef = useRef(null); // hidden <input type="file" /> for AI mode
    const [manualGeneratingImage, setManualGeneratingImage] = useState(false);

    // ── New Targeting State (shared between AI + Manual) ──
    const [gender, setGender] = useState('all');              // 'all' | 'male' | 'female'
    const [targetingLanguage, setTargetingLanguage] = useState('');  // Meta locale code e.g. 'hi', 'en'
    const [placements, setPlacements] = useState(['facebook', 'instagram']); // platforms
    const [messengerPositions, setMessengerPositions] = useState(['messenger_story']); // Stories only (messenger_home deprecated Nov 2025)
    const [schedulingStart, setSchedulingStart] = useState('');  // ISO date string
    const [schedulingEnd, setSchedulingEnd] = useState('');

    // Auto-remove messenger/audience_network when switching to CTWA (Engagement)
    // For other objectives (Traffic, Leads, Awareness) these placements are allowed by Meta
    useEffect(() => {
        if (manual.objective === 'OUTCOME_ENGAGEMENT') {
            setPlacements(prev => prev.filter(p => p === 'facebook' || p === 'instagram'));
        }
    }, [manual.objective]);

    // ── UI State ──
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
        { id: 'travel', icon: '✈️', label: 'Travel & Tours', name: 'Holiday Package', description: 'We are a travel agency offering customized holiday packages and honeymoon tours. We want users to inquire about trips via WhatsApp. Target: young couples and families aged 25-50.' },
        { id: 'salon', icon: '✂️', label: 'Salon & Spa', name: 'Special Discount', description: 'We are a premium salon/spa offering hair, beauty, and relaxation services. We are running a 20% discount this weekend. Target: local women and men aged 18-45 in [City/Neighborhood].' },
        { id: 'restaurant', icon: '🍽️', label: 'Restaurant', name: 'Table Reservation', description: 'We are a fine dining restaurant/cafe offering delicious multi-cuisine food. We want customers to reserve tables or order online. Target: foodies and young adults aged 18-40 in [City].' },
        { id: 'b2b', icon: '🏢', label: 'B2B Services', name: 'Free Consultation', description: 'We are a B2B agency offering digital marketing/software/consulting services. We want to book discovery calls. Target: business owners, CEOs, and founders aged 30-55.' },
        { id: 'fitness', icon: '💪', label: 'Gym & Fitness', name: '30-Day Challenge', description: 'We are a modern gym and fitness center offering personal training and group classes. We want leads for our 30-day weight loss challenge. Target: fitness enthusiasts aged 18-40 in [City].' },
        { id: 'electronics', icon: '📱', label: 'Electronics', name: 'Gadget Sale', description: 'We are a retail electronics store selling smartphones, laptops, and accessories. We have a festive sale with up to 40% off. Target: tech-savvy individuals aged 18-45.' },
        { id: 'furniture', icon: '🛋️', label: 'Furniture', name: 'Home Decor', description: 'We are a premium furniture and home decor brand. We want to showcase our new living room collection and get inquiries via WhatsApp. Target: homeowners and newlyweds aged 25-55.' },
        { id: 'beauty', icon: '💄', label: 'Beauty & Cosmetics', name: 'Skincare Kit', description: 'We are a D2C beauty brand selling organic skincare and cosmetic products. We are launching a new summer glow kit. Target: beauty-conscious women aged 18-40.' },
        { id: 'jewelry', icon: '💍', label: 'Jewelry', name: 'Bridal Collection', description: 'We are a luxury jewelry store offering gold, diamond, and silver collections. We want to promote our new bridal/festive range. Target: engaged couples and women aged 22-50.' },
        { id: 'footwear', icon: '👟', label: 'Footwear', name: 'Sneaker Drop', description: 'We are a trendy footwear brand selling sneakers and activewear. We are dropping a new limited-edition sneaker collection. Target: youth and sneakerheads aged 16-35.' },
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
                targetLocations: targetLocations.length > 0 ? targetLocations.map(l => l.name) : undefined
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
        const selectedCreative = creativeData?.[selectedCreativeIndex];
        const imageContext = selectedCreative
            ? `Business: ${businessData.name}. Ad headline: "${selectedCreative.headline}". Ad copy: "${selectedCreative.primary_text?.slice(0, 150)}"`
            : `Business Name: ${businessData.name}\n${businessData.description}`;
        setGeneratingImage(true);
        try {
            const res = await axios.post('/api/meta-ads/ai-image', {
                businessDescription: imageContext
            }, { withCredentials: true });
            
            setGeneratedImage(res.data.imageUrl);
            toast.success(`AI Image generated! (${res.data.tokensDeducted} tokens used)`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to generate AI image.");
        } finally {
            setGeneratingImage(false);
        }
    };

    // Step 5: Publish (AI Mode)
    const handlePublish = async () => {
        const c = checklistChecks;
        if (!c.hasMetaToken || !c.hasAdAccount || !c.hasWhatsApp || !c.hasWabaSetup || !c.hasPageWabaLink || !c.hasValidPaymentMethod) {
            setShowChecklist(true);
            return toast.error('Please complete all mandatory setup steps in the Checklist before publishing.');
        }
        const selectedCreative = creativeData[selectedCreativeIndex];
        if (!generatedImage) {
            return toast.error('Please generate or upload an ad image before publishing. Images are required for Meta ads to appear on Instagram & Facebook.');
        }
        // Meta minimum budget validation
        const META_MIN_DAILY = 100;   // ₹100/day minimum
        const META_MIN_FIXED = 500;   // ₹500 minimum for fixed/lifetime budget
        if (budgetData.budgetType === 'daily' && (budgetData.dailyBudget || 0) < META_MIN_DAILY) {
            toast.error(`Daily budget must be at least ₹${META_MIN_DAILY}/day (Meta's minimum requirement).`);
        }
        if (budgetData.budgetType === 'lifetime' && (budgetData.lifetimeBudget || 0) < META_MIN_FIXED) {
            toast.error(`Fixed budget must be at least ₹${META_MIN_FIXED} total (Meta's minimum requirement).`);
        }
        if (!schedulingStart) {
            return toast.error('Please select a Start Date for your ad schedule.');
        }
        // For lifetime/fixed budget, an end date is required
        if (budgetData.budgetType === 'lifetime' && !schedulingEnd) {
            return toast.error('Fixed budget campaigns require an End Date.');
        }
        if (schedulingEnd && new Date(schedulingEnd).getTime() <= new Date(schedulingStart).getTime()) {
            return toast.error('The End Time must be after the Start Time.');
        }
        // Meta rule: daily budget ad sets must run for at least 24 hours
        if (schedulingEnd) {
            const durationHours = (new Date(schedulingEnd).getTime() - new Date(schedulingStart).getTime()) / 3600000;
            if (budgetData.budgetType === 'daily' && durationHours < 24) {
                return toast.error('Daily budget campaigns must run for at least 24 hours. Please extend your end date/time by at least ' + Math.ceil(24 - durationHours) + ' hour(s), or leave End Date blank to run indefinitely.');
            }
        }
        setLoading(true);
        try {
            const res = await axios.post('/api/meta-ads/publish', {
                campaignName: `${businessData.name.replace(/\s+/g,'_')}_AI_Campaign`,
                objective: budgetData.objective,
                dailyBudget: budgetData.budgetType === 'daily' ? budgetData.dailyBudget : undefined,
                lifetimeBudget: budgetData.budgetType === 'lifetime' ? budgetData.lifetimeBudget : undefined,
                budgetType: budgetData.budgetType,
                targeting: {
                    ...(audienceData || {}),
                    locations:       targetLocations.map(l => l.name || l),
                    locationKeys:    targetLocations.map(l => l.key).filter(Boolean),
                    locationObjects: targetLocations,
                    gender,
                    targetingLanguage: targetingLanguage || undefined,
                    placements,
                    messengerPositions,
                },
                creatives: selectedCreative,
                imageUrl: generatedImage,
                scheduling: {
                    startDate: schedulingStart || null,
                    endDate:   schedulingEnd   || null,
                },
                automation: {
                    type:       automationType,
                    flowId:     automationType === 'flowbot'  ? selectedFlowId    : null,
                    templateId: automationType === 'template' ? selectedTemplateId : null,
                    icebreaker: icebreaker || null,
                }
            }, { withCredentials: true });
            
            if (res.data?.adWarning) {
                toast.warning(`Campaign saved, but there was an issue: ${res.data.adWarning}`, { duration: 8000 });
            } else {
                toast.success('Campaign prepared successfully!');
            }
            navigate('/growth-hub');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to publish.');
        } finally {
            setLoading(false);
        }
    };

    // ── Manual Publish Handler ──
    const handleManualPublish = async () => {
        const c = checklistChecks;
        if (!c.hasMetaToken || !c.hasAdAccount || !c.hasWhatsApp || !c.hasWabaSetup || !c.hasPageWabaLink || !c.hasValidPaymentMethod) {
            setShowChecklist(true);
            return toast.error('Please complete all mandatory setup steps in the Checklist before publishing.');
        }
        if (!manual.campaignName.trim()) return toast.error('Campaign name is required.');
        if (!manual.primaryText.trim()) return toast.error('Ad primary text is required.');
        if (!manual.headline.trim()) return toast.error('Headline is required.');
        if (manualLocations.length === 0) return toast.error('Add at least one target location.');
        if (!manualImage) return toast.error('Please upload or generate an ad image. Images are required for Meta ads to appear on Instagram & Facebook.');
        // Meta minimum budget validation
        const META_MIN_DAILY = 100;
        const META_MIN_FIXED = 500;
        if (manual.budgetType === 'daily' && (manual.dailyBudget || 0) < META_MIN_DAILY) {
            toast.error(`Daily budget must be at least ₹${META_MIN_DAILY}/day (Meta's minimum requirement).`);
        }
        if (manual.budgetType === 'lifetime' && (manual.lifetimeBudget || 0) < META_MIN_FIXED) {
            toast.error(`Fixed budget must be at least ₹${META_MIN_FIXED} total (Meta's minimum requirement).`);
        }
        if (!schedulingStart) {
            return toast.error('Please select a Start Date for your ad schedule.');
        }
        if (!schedulingEnd) {
            return toast.error('Please select an End Date for your ad schedule.');
        }
        if (new Date(schedulingEnd).getTime() <= new Date(schedulingStart).getTime()) {
            return toast.error('The End Time must be after the Start Time.');
        }
        // Meta rule: daily budget ad sets must run for at least 24 hours
        const durationHoursManual = (new Date(schedulingEnd).getTime() - new Date(schedulingStart).getTime()) / 3600000;
        if (manual.budgetType === 'daily' && durationHoursManual < 24) {
            return toast.error('Daily budget campaigns must run for at least 24 hours. Please set end date/time at least ' + Math.ceil(24 - durationHoursManual) + ' hour(s) later.');
        }

        setLoading(true);
        try {
            const res = await axios.post('/api/meta-ads/publish', {
                campaignName: manual.campaignName,
                objective: manual.objective,
                dailyBudget: manual.budgetType === 'daily' ? manual.dailyBudget : undefined,
                lifetimeBudget: manual.budgetType === 'lifetime' ? manual.lifetimeBudget : undefined,
                budgetType: manual.budgetType,
                targeting: {
                    age_min:            manual.ageMin,
                    age_max:            manual.ageMax,
                    locations:          manualLocations.map(l => l.name || l),
                    locationKeys:       manualLocations.map(l => l.key).filter(Boolean),
                    locationObjects:    manualLocations,
                    interests:          manualInterests,
                    gender,
                    targetingLanguage:  targetingLanguage || undefined,
                    placements,
                    messengerPositions,
                },
                creatives: { primary_text: manual.primaryText, headline: manual.headline },
                imageUrl: manualImage || null,
                scheduling: {
                    startDate: schedulingStart || null,
                    endDate:   schedulingEnd   || null,
                },
                automation: {
                    type:       automationType,
                    flowId:     automationType === 'flowbot'   ? selectedFlowId   : null,
                    templateId: automationType === 'template'  ? selectedTemplateId : null,
                    icebreaker: icebreaker || null,
                }
            }, { withCredentials: true });

            if (res.data?.adWarning) {
                toast.warning(`Campaign saved, but there was an issue: ${res.data.adWarning}`, { duration: 8000 });
            } else {
                toast.success('Campaign saved successfully!');
            }
            navigate('/growth-hub');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save campaign.');
        } finally {
            setLoading(false);
        }
    };

    // ── AI Mode: handle image file upload ──
    const handleAiImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return toast.error('Please select a valid image file.');
        if (file.size > 4 * 1024 * 1024) return toast.error('Image must be under 4MB.');
        const reader = new FileReader();
        reader.onload = (ev) => setGeneratedImage(ev.target.result);
        reader.readAsDataURL(file);
    };

    // ── Manual: handle image file upload ──
    const handleManualImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return toast.error('Please select a valid image file.');
        if (file.size > 4 * 1024 * 1024) return toast.error('Image must be under 4MB.');
        const reader = new FileReader();
        reader.onload = (ev) => setManualImage(ev.target.result);
        reader.readAsDataURL(file);
    };

    // ── Manual: AI generate image (uses same backend as AI mode) ──
    const handleManualGenerateImage = async () => {
        const desc = manual.campaignName || manual.primaryText || 'Business advertisement';
        setManualGeneratingImage(true);
        try {
            const res = await axios.post('/api/meta-ads/ai-image', {
                businessDescription: desc
            }, { withCredentials: true });
            setManualImage(res.data.imageUrl);
            toast.success(`AI Image generated! (${res.data.tokensDeducted} tokens used)`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to generate image.');
        } finally {
            setManualGeneratingImage(false);
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
            { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', desc: 'Drive WhatsApp chats (CTWA)', emoji: '💬', ctwa: true },
            { value: 'OUTCOME_TRAFFIC',    label: 'Traffic',    desc: 'Drive website/link clicks',  emoji: '🌐' },
            { value: 'OUTCOME_LEADS',      label: 'Lead Gen',   desc: 'Collect qualified leads',     emoji: '🎯' },
            { value: 'OUTCOME_AWARENESS',  label: 'Awareness',  desc: 'Maximize brand reach',        emoji: '📢' },
        ];
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

                        {/* WABA link warning for Engagement/CTWA objective */}
                        {manual.objective === 'OUTCOME_ENGAGEMENT' && !checklistChecks.hasPageWabaLink && (
                            <div className="mt-3 flex items-start gap-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Page not linked to WhatsApp Business</p>
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 leading-relaxed">
                                        Your Facebook Page isn't connected to a WhatsApp Business Account. CTWA ads will auto-fallback to standard engagement.
                                        To enable Click-to-WhatsApp ads, link your Page in <strong>Meta Business Manager → Settings → WhatsApp Accounts</strong>.
                                    </p>
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                        Or select <strong>Traffic</strong> objective to create standard ads without WhatsApp.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─ Section 2: Budget ─ */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                            <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Budget</h3>
                            <p className="text-xs text-slate-400">Choose how you want to control your spend</p>
                        </div>
                        <div className="ml-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
                            {manual.budgetType === 'daily'
                                ? `₹${manual.dailyBudget.toLocaleString()}/day`
                                : `₹${manual.lifetimeBudget.toLocaleString()} total`}
                        </div>
                    </div>

                    {/* Budget Type Toggle */}
                    <div className="flex gap-2 mb-4">
                        {[
                            { type: 'daily',    label: '📅 Daily Budget',    desc: 'Spend per day, runs until paused' },
                            { type: 'lifetime', label: '🎯 Fixed Budget', desc: 'Fixed total, auto-stops at end date' },
                        ].map(opt => (
                            <button
                                key={opt.type}
                                type="button"
                                onClick={() => setManual({...manual, budgetType: opt.type})}
                                className={`flex-1 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                                    manual.budgetType === opt.type
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300'
                                }`}
                            >
                                <p className={`text-xs font-bold ${manual.budgetType === opt.type ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>{opt.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                            </button>
                        ))}
                    </div>

                    <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
                        {manual.budgetType === 'daily' ? (
                            <>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">Daily Amount</label>
                                <input
                                    type="range" min="100" max="50000" step="100"
                                    className="w-full accent-emerald-500 h-2 cursor-pointer"
                                    value={manual.dailyBudget}
                                    onChange={e => setManual({...manual, dailyBudget: parseInt(e.target.value)})}
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-2">
                                    <span>₹100 <span className="text-slate-300">(Meta Min)</span></span>
                                    <div className="flex gap-2">
                                        {[500, 1000, 5000, 10000].map(v => (
                                            <button key={v} type="button" onClick={() => setManual({...manual, dailyBudget: v})} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${ manual.dailyBudget === v ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 hover:bg-slate-300'}`}>₹{v>=1000?`${v/1000}K`:v}</button>
                                        ))}
                                    </div>
                                    <span>₹50K+</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">Total Fixed Amount</label>
                                <input
                                    type="range" min="500" max="500000" step="500"
                                    className="w-full accent-emerald-500 h-2 cursor-pointer"
                                    value={manual.lifetimeBudget}
                                    onChange={e => setManual({...manual, lifetimeBudget: parseInt(e.target.value)})}
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-2">
                                    <span>₹500 <span className="text-slate-300">(Meta Min)</span></span>
                                    <div className="flex gap-2">
                                        {[3000, 5000, 10000, 50000].map(v => (
                                            <button key={v} type="button" onClick={() => setManual({...manual, lifetimeBudget: v})} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${ manual.lifetimeBudget === v ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 hover:bg-slate-300'}`}>₹{v>=1000?`${v/1000}K`:v}</button>
                                        ))}
                                    </div>
                                    <span>₹5L+</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Dynamic info banner */}
                    {manual.budgetType === 'daily' ? (
                        <div className="mt-3 p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-2.5">
                            <span className="text-base flex-shrink-0">💡</span>
                            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
                                <p><strong>₹{manual.dailyBudget.toLocaleString()}/day = Meta charges up to ₹{manual.dailyBudget.toLocaleString()} every single day.</strong></p>
                                <p>Without an end date, your ad runs <strong>indefinitely</strong> — it does NOT stop automatically. You must <strong>Pause or Delete</strong> it from GrowthHub → Campaigns to stop spending.</p>
                                <p className="text-amber-600 dark:text-amber-400">💰 30 days at ₹{manual.dailyBudget.toLocaleString()}/day = <strong>~₹{(manual.dailyBudget * 30).toLocaleString()} total.</strong></p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-3 p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-2.5">
                            <span className="text-base flex-shrink-0">🎯</span>
                            <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed space-y-1">
                                <p><strong>₹{manual.lifetimeBudget.toLocaleString()} fixed total — Meta spreads this optimally across your ad's full duration.</strong></p>
                                <p>Your ad will <strong>automatically stop</strong> when the end date is reached. <span className="text-red-500 dark:text-red-400 font-semibold">⚠️ An end date is required for Fixed Budget.</span></p>
                                <p className="text-blue-600 dark:text-blue-400">✅ Best for fixed-budget campaigns (product launches, limited-time offers).</p>
                            </div>
                        </div>
                    )}
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

                        {/* Locations — Smart Search */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                <MapPin className="w-3.5 h-3.5 text-red-400" /> Target Locations *
                                <span className="ml-1 text-[10px] font-normal normal-case text-slate-400">— Only real places allowed</span>
                            </label>
                            <LocationSearchInput
                                selectedLocations={manualLocations}
                                onChange={setManualLocations}
                                placeholder="Search city, state or country..."
                            />
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

                {/* ─ Section 3b: Advanced Targeting — Gender, Language, Placement ─ */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <SlidersHorizontal className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Advanced Targeting</h3>
                            <p className="text-xs text-slate-400">Gender, language, and where your ads appear</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl p-5 space-y-6">

                        {/* Gender */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                <Users className="w-3.5 h-3.5 text-violet-400" /> Gender Targeting
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'all', label: 'All Genders', emoji: '👥' },
                                    { value: 'male', label: 'Men Only', emoji: '👨' },
                                    { value: 'female', label: 'Women Only', emoji: '👩' },
                                ].map(g => (
                                    <button
                                        key={g.value}
                                        type="button"
                                        onClick={() => setGender(g.value)}
                                        className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border-2 transition-all text-center ${
                                            gender === g.value
                                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-lg shadow-violet-500/10'
                                                : 'border-slate-100 dark:border-white/5 bg-white dark:bg-surface-dark hover:border-violet-200'
                                        }`}
                                    >
                                        <span className="text-2xl">{g.emoji}</span>
                                        <span className={`text-xs font-bold ${gender === g.value ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400'}`}>{g.label}</span>
                                        {gender === g.value && <CheckCircle2 className="w-4 h-4 text-violet-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language Targeting */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                <Globe className="w-3.5 h-3.5 text-blue-400" /> Language Targeting
                                <span className="ml-1 text-[10px] font-normal normal-case text-slate-400">— Target users who browse in this language</span>
                            </label>
                            <select
                                value={targetingLanguage}
                                onChange={e => setTargetingLanguage(e.target.value)}
                                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                            >
                                <option value="">All Languages (no restriction)</option>
                                <option value="en">🇬🇧 English</option>
                                <option value="hi">🇮🇳 Hindi</option>
                                <option value="mr">🇮🇳 Marathi</option>
                                <option value="gu">🇮🇳 Gujarati</option>
                                <option value="ta">🇮🇳 Tamil</option>
                                <option value="te">🇮🇳 Telugu</option>
                                <option value="kn">🇮🇳 Kannada</option>
                                <option value="ml">🇮🇳 Malayalam</option>
                                <option value="bn">🇮🇳 Bengali</option>
                                <option value="pa">🇮🇳 Punjabi</option>
                                <option value="ur">🇮🇳 Urdu</option>
                                <option value="ar">🇸🇦 Arabic</option>
                            </select>
                        </div>

                        {/* Placement Selection */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                <Radio className="w-3.5 h-3.5 text-pink-400" /> Ad Placements
                                <span className="ml-1 text-[10px] font-normal normal-case text-slate-400">— Where your ads will appear</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { value: 'facebook', label: 'Facebook', sublabel: 'Feed + Reels', emoji: '📘', color: 'blue' },
                                    { value: 'instagram', label: 'Instagram', sublabel: 'Feed + Reels', emoji: '📸', color: 'pink' },
                                    { value: 'messenger', label: 'Messenger', sublabel: 'Stories Only', emoji: '💬', color: 'blue', disabledForCTWA: true },
                                    { value: 'audience_network', label: 'Audience Network', sublabel: 'External apps', emoji: '🌐', color: 'slate', disabledForCTWA: true },
                                ].map(p => {
                                    // Messenger & Audience Network are only blocked for CTWA (Engagement) — Meta policy
                                    // For Traffic, Leads, Awareness these are valid placements
                                    const isCTWAObjective = manual.objective === 'OUTCOME_ENGAGEMENT';
                                    const isDisabled = p.disabledForCTWA && isCTWAObjective;
                                    const isSelected = placements.includes(p.value) && !isDisabled;
                                    const colorMap = {
                                        blue: isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-surface-dark',
                                        pink: isSelected ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-surface-dark',
                                        slate: isSelected ? 'border-slate-500 bg-slate-100 dark:bg-white/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-surface-dark',
                                    };
                                    return (
                                        <div key={p.value} className="relative group">
                                            <button
                                                type="button"
                                                onClick={() => setPlacements(prev =>
                                                    prev.includes(p.value)
                                                        ? prev.filter(x => x !== p.value)
                                                        : [...prev, p.value]
                                                )}
                                                disabled={isDisabled}
                                                className={`w-full relative flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border-2 transition-all text-center ${colorMap[p.color] || colorMap.slate} ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                                            >
                                                {isSelected && (
                                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                    </span>
                                                )}
                                                <span className="text-xl">{p.emoji}</span>
                                                <span className={`text-[11px] font-bold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{p.label}</span>
                                                <span className="text-[9px] text-slate-400">{p.sublabel}</span>
                                            </button>
                                            {isDisabled && (
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg">
                                                    Not supported for Click-to-WhatsApp ads
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {placements.includes('messenger') && (
                                <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-white/5 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Messenger Position</span>
                                        <span className="text-[9px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-semibold">Mobile Only</span>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input type="checkbox" className="rounded text-blue-500 w-4 h-4 cursor-pointer" 
                                            checked={messengerPositions.includes('messenger_story')} 
                                            onChange={(e) => {
                                                if (e.target.checked) setMessengerPositions(p => [...p, 'messenger_story']);
                                                else setMessengerPositions(p => p.filter(x => x !== 'messenger_story'));
                                            }} 
                                        />
                                        Messenger Stories
                                    </label>
                                    <p className="text-[9px] text-slate-400 leading-relaxed">
                                        ℹ️ Messenger Inbox ads were discontinued by Meta (Nov 2025). Only Stories placement is available.
                                    </p>
                                </div>
                            )}
                            {placements.includes('audience_network') && !placements.includes('facebook') && !placements.includes('instagram') && (
                                <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                                        <strong>Audience Network requires Facebook or Instagram.</strong> Please also select Facebook or Instagram — Meta does not allow Audience Network as the only placement.
                                    </p>
                                </div>
                            )}
                            {placements.length === 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Select at least one placement
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─ Meta Advantage Audience Notice ─ */}
                <div className="flex items-start gap-3 p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                        <Info className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-0.5">Manual Targeting Active — Meta Advantage Audience is Off</p>
                        <p className="text-[11px] text-blue-600/80 dark:text-blue-300/70 leading-relaxed">
                            Your campaign will use <strong>exactly the interests, age range, gender, language, and locations you set above</strong>. Meta's Advantage Audience feature (which auto-expands your audience with AI) is disabled — giving you full control over who sees your ad.
                        </p>
                    </div>
                </div>

                {/* ─ Section 3c: Ad Scheduling ─ */}

                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Ad Scheduling</h3>
                            <p className="text-xs text-slate-400">Control when your campaign runs (optional)</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                                <input
                                    type="datetime-local"
                                    value={schedulingStart}
                                    min={new Date().toISOString().slice(0, 16)}
                                    onChange={e => setSchedulingStart(e.target.value)}
                                    className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400/50 transition-all"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Leave blank = starts immediately</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                                <input
                                    type="datetime-local"
                                    value={schedulingEnd}
                                    min={schedulingStart || new Date().toISOString().slice(0, 16)}
                                    onChange={e => setSchedulingEnd(e.target.value)}
                                    className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400/50 transition-all"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Leave blank = runs until budget runs out</p>
                            </div>
                        </div>
                        {schedulingStart && schedulingEnd && (() => {
                            const durationH = Math.round((new Date(schedulingEnd) - new Date(schedulingStart)) / 3600000);
                            const tooShort = durationH < 24;
                            return (
                                <div className={`mt-3 flex items-center gap-2 border rounded-xl px-4 py-2.5 ${
                                    tooShort
                                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                                        : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                                }`}>
                                    <span className={`text-xs font-bold ${tooShort ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {tooShort ? '⚠️ Too short! Min 24h required:' : '📅 Campaign scheduled:'}
                                    </span>
                                    <span className={`text-xs ${tooShort ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                        {new Date(schedulingStart).toLocaleString()} → {new Date(schedulingEnd).toLocaleString()} ({durationH}h)
                                    </span>
                                </div>
                            );
                        })()}
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

                {/* ─ Section 4b: Ad Image (REQUIRED) ─ */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Image className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                Ad Image <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Required</span>
                            </h3>
                            <p className="text-xs text-slate-400">Your ad will NOT show on Instagram or Facebook without an image</p>
                        </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={manualImageRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleManualImageUpload}
                    />

                    {manualImage ? (
                        // ── Image Preview ──
                        <div className="relative rounded-2xl overflow-hidden border-2 border-blue-400 dark:border-blue-500/50 shadow-lg">
                            <img src={manualImage} alt="Ad preview" className="w-full max-h-64 object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => manualImageRef.current?.click()}
                                    className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-800 px-4 py-2 rounded-xl shadow-lg hover:bg-slate-100 transition-all"
                                >
                                    <UploadCloud className="w-3.5 h-3.5" /> Replace
                                </button>
                                <button
                                    type="button"
                                    onClick={handleManualGenerateImage}
                                    disabled={manualGeneratingImage}
                                    className="flex items-center gap-1.5 text-xs font-bold bg-primary text-white px-4 py-2 rounded-xl shadow-lg hover:bg-primary/90 transition-all disabled:opacity-60"
                                >
                                    {manualGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    Regenerate AI
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setManualImage(null)}
                                    className="ml-auto flex items-center gap-1.5 text-xs font-bold bg-red-500 text-white px-3 py-2 rounded-xl shadow-lg hover:bg-red-600 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        // ── Upload / Generate Options ──
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Upload your own */}
                            <button
                                type="button"
                                onClick={() => manualImageRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-300 dark:border-white/15 rounded-2xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all group"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-7 h-7 text-blue-500" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">Upload Your Image</p>
                                    <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP — max 4MB</p>
                                    <p className="text-[10px] text-slate-400">Recommended: 1080×1080px (square)</p>
                                </div>
                            </button>

                            {/* AI Generate */}
                            <button
                                type="button"
                                onClick={handleManualGenerateImage}
                                disabled={manualGeneratingImage}
                                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-violet-300 dark:border-violet-500/30 rounded-2xl hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/5 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {manualGeneratingImage ? <Loader2 className="w-7 h-7 text-violet-500 animate-spin" /> : <Sparkles className="w-7 h-7 text-violet-500" />}
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">Generate with AI ✨</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{manualGeneratingImage ? 'Creating your image...' : 'Auto-creates a professional ad image'}</p>
                                    <p className="text-[10px] text-violet-500 mt-1 font-medium">Uses AI tokens</p>
                                </div>
                            </button>
                        </div>
                    )}
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
                        disabled={loading || !Object.values(checklistChecks).every(Boolean)}
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

                        {/* Geography Targeting — Smart Search */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-red-500" /> Target Locations
                                <span className="text-xs font-normal text-slate-400">(Where you want your ads to run)</span>
                            </label>
                            <LocationSearchInput
                                selectedLocations={targetLocations}
                                onChange={setTargetLocations}
                                placeholder="Search city, state or country..."
                            />
                            <p className="text-[11px] text-slate-400 mt-2">Only valid geographic locations accepted. These become hard targeting rules for the AI.</p>
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
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select AI Generated Copy</h3>
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
                                        <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden flex-shrink-0">
                                            {generatedImage ? (
                                                <img src={generatedImage} alt="AI Generated Ad" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <Image className="w-10 h-10" />
                                                    <p className="text-xs font-semibold">No image yet</p>
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

                        {/* ── Ad Image Section (AI Mode) ── */}
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <Image className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Ad Image <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 ml-1">Required for Instagram & Facebook</span></h4>
                                    <p className="text-xs text-slate-400">Without an image, your ad cannot appear in feeds</p>
                                </div>
                            </div>
                            
                            <input
                                ref={aiImageRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                onChange={handleAiImageUpload}
                            />

                            {generatedImage ? (
                                <div className="flex items-center gap-4">
                                    <img src={generatedImage} alt="Ad Image" className="w-24 h-24 object-cover rounded-xl border-2 border-blue-300 flex-shrink-0" />
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <button onClick={handleGenerateImage} disabled={generatingImage} className="flex items-center gap-2 text-xs font-bold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60">
                                                {generatingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                Regenerate AI Image
                                            </button>
                                            <button onClick={() => aiImageRef.current?.click()} className="flex items-center gap-2 text-xs font-bold bg-white text-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
                                                <UploadCloud className="w-3.5 h-3.5" /> Replace Upload
                                            </button>
                                        </div>
                                        <button onClick={() => setGeneratedImage(null)} className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors self-start mt-1">
                                            <Trash2 className="w-3.5 h-3.5" /> Remove image
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleGenerateImage}
                                        disabled={generatingImage}
                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg shadow-violet-500/20 hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-60 text-sm"
                                    >
                                        {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {generatingImage ? 'Generating image...' : '✨ Generate AI Image (recommended)'}
                                    </button>
                                    <button
                                        onClick={() => aiImageRef.current?.click()}
                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white dark:bg-surface-dark border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-sm"
                                    >
                                        <UploadCloud className="w-4 h-4" />
                                        Upload your own image
                                    </button>
                                </div>
                            )}
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
                            
                            <div className="space-y-4">
                                {/* Budget Type Toggle */}
                                <div className="flex gap-2">
                                    {[
                                        { type: 'daily',    label: '📅 Daily Budget',    desc: 'Runs indefinitely per day' },
                                        { type: 'lifetime', label: '🎯 Fixed Budget', desc: 'Fixed total, auto-stops' },
                                    ].map(opt => (
                                        <button
                                            key={opt.type}
                                            type="button"
                                            onClick={() => setBudgetData({...budgetData, budgetType: opt.type})}
                                            className={`flex-1 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                                                budgetData.budgetType === opt.type
                                                    ? 'border-primary bg-blue-50 dark:bg-primary/10'
                                                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300'
                                            }`}
                                        >
                                            <p className={`text-xs font-bold ${budgetData.budgetType === opt.type ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>{opt.label}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>

                                <div>
                                    {budgetData.budgetType === 'daily' ? (
                                        <>
                                            <label className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                <span>Daily Amount</span>
                                                <span className="text-primary">₹{budgetData.dailyBudget.toLocaleString()}/day</span>
                                            </label>
                                            <input 
                                                type="range" min="100" max="50000" step="100"
                                                className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                                value={budgetData.dailyBudget}
                                                onChange={(e) => setBudgetData({...budgetData, dailyBudget: parseInt(e.target.value)})}
                                            />
                                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                                <span>₹100 <span className="text-slate-400 dark:text-slate-500">(Meta Min)</span></span>
                                                <div className="flex gap-2">
                                                    {[500, 1000, 5000, 10000].map(v => (
                                                        <button key={v} type="button" onClick={() => setBudgetData({...budgetData, dailyBudget: v})} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${budgetData.dailyBudget === v ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 hover:bg-slate-300'}`}>₹{v>=1000?`${v/1000}K`:v}</button>
                                                    ))}
                                                </div>
                                                <span>₹50,000+</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <label className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                <span>Total Fixed Amount</span>
                                                <span className="text-primary">₹{budgetData.lifetimeBudget.toLocaleString()} total</span>
                                            </label>
                                            <input 
                                                type="range" min="500" max="500000" step="500"
                                                className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                                value={budgetData.lifetimeBudget}
                                                onChange={(e) => setBudgetData({...budgetData, lifetimeBudget: parseInt(e.target.value)})}
                                            />
                                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                                <span>₹500 <span className="text-slate-400 dark:text-slate-500">(Meta Min)</span></span>
                                                <div className="flex gap-2">
                                                    {[3000, 5000, 10000, 50000].map(v => (
                                                        <button key={v} type="button" onClick={() => setBudgetData({...budgetData, lifetimeBudget: v})} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${budgetData.lifetimeBudget === v ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 hover:bg-slate-300'}`}>₹{v>=1000?`${v/1000}K`:v}</button>
                                                    ))}
                                                </div>
                                                <span>₹5L+</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Dynamic info banner */}
                                {budgetData.budgetType === 'daily' ? (
                                    <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-2.5">
                                        <span className="text-base flex-shrink-0">💡</span>
                                        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
                                            <p><strong>₹{budgetData.dailyBudget.toLocaleString()}/day = Meta charges up to ₹{budgetData.dailyBudget.toLocaleString()} every single day.</strong></p>
                                            <p>Without an end date, your ad runs <strong>indefinitely</strong> — it does NOT auto-stop. You must <strong>Pause or Delete</strong> it from GrowthHub → Campaigns to stop spending.</p>
                                            <p className="text-amber-600 dark:text-amber-400">💰 30 days = <strong>~₹{(budgetData.dailyBudget * 30).toLocaleString()} total.</strong></p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-2.5">
                                        <span className="text-base flex-shrink-0">🎯</span>
                                        <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed space-y-1">
                                            <p><strong>₹{budgetData.lifetimeBudget.toLocaleString()} total — Meta spreads this optimally across your ad's duration.</strong></p>
                                            <p>Automatically stops at end date. <span className="text-red-500 dark:text-red-400 font-semibold">⚠️ An end date is required.</span></p>
                                            <p className="text-blue-600 dark:text-blue-400">✅ Best for launches and limited-time offers.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex gap-3">
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
                                disabled={loading || !Object.values(checklistChecks).every(Boolean)}
                                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all w-full justify-center ml-4 ${
                                    metaConnected
                                        ? 'bg-primary hover:bg-primary/90 shadow-md text-white'
                                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25 text-white'
                                } disabled:opacity-60 disabled:cursor-not-allowed`}
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

            {/* ══ Prerequisite Checklist Modal ══ */}
            <AnimatePresence>
                {showChecklist && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => { if (Object.values(checklistChecks).every(Boolean)) setShowChecklist(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-lg w-full overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-white font-bold text-lg">Before You Create an Ad</h2>
                                        <p className="text-blue-200 text-sm mt-0.5">Make sure these are set up in Meta Business Manager</p>
                                    </div>
                                    {Object.values(checklistChecks).every(Boolean) && (
                                        <button onClick={() => setShowChecklist(false)} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Checklist Items */}
                            <div className="p-6 space-y-4">
                                {[
                                    {
                                        id: 'page',
                                        done: checklistChecks.hasWabaSetup || checklistChecks.hasWhatsApp,
                                        icon: '📄',
                                        title: 'Facebook Business Page',
                                        desc: checklistChecks.hasWabaSetup || checklistChecks.hasWhatsApp
                                            ? 'Your WhatsApp Business Account is connected — a Facebook Page is confirmed.'
                                            : 'A verified Facebook Page linked to your WhatsApp Business Account is required.',
                                        steps: [
                                            'Open your Facebook Pages screen.',
                                            'Click "Create New Page" if you do not have one.',
                                            'Fill out the required information and save.',
                                            'Return here and click "Re-check my setup".'
                                        ],
                                        link: 'https://www.facebook.com/pages/creation/',
                                        linkLabel: 'Create Page →'
                                    },
                                    {
                                        id: 'meta_token',
                                        done: checklistChecks.hasMetaToken,
                                        icon: '🏢',
                                        title: 'Meta Business Manager Connected',
                                        desc: checklistChecks.hasMetaToken
                                            ? 'Your Facebook Ads account is connected to BlueTick.'
                                            : 'Connect your Meta Ads account via Facebook Login so we can create campaigns on your behalf.',
                                        steps: [
                                            'Go to CTWA Analytics.',
                                            'Click the "Connect Meta Ads" button.',
                                            'Log in to Facebook and grant the required permissions.',
                                            'Return here and click "Re-check my setup".'
                                        ],
                                        link: '/ctwa-analytics',
                                        linkLabel: 'Connect Meta Ads →',
                                        internal: true
                                    },
                                    {
                                        id: 'ad_account',
                                        done: checklistChecks.hasAdAccount,
                                        icon: '💳',
                                        title: 'Ad Account Selected',
                                        desc: checklistChecks.hasAdAccount
                                            ? 'Ad account is selected.'
                                            : 'Select an Ad Account in CTWA Analytics before ads can go live.',
                                        steps: [
                                            'Go to CTWA Analytics.',
                                            'Select an Ad Account from the dropdown list.',
                                            'Click "Save".',
                                            'Return here and click "Re-check my setup".'
                                        ],
                                        link: '/ctwa-analytics',
                                        linkLabel: 'Select Ad Account →',
                                        internal: true
                                    },
                                    {
                                        id: 'payment',
                                        done: checklistChecks.hasValidPaymentMethod,
                                        icon: '💸',
                                        title: 'Valid Payment Method',
                                        desc: checklistChecks.hasValidPaymentMethod
                                            ? 'Your Ad Account has an active payment method.'
                                            : 'Meta requires a valid credit card on file before you can publish ads.',
                                        steps: [
                                            'Go to your Meta Billing Settings.',
                                            'Click "Payment Settings" in the top right.',
                                            'Click "Add Payment Method" and enter your card details.',
                                            'Once verified by Meta, return here and click "Re-check my setup".'
                                        ],
                                        link: 'https://www.facebook.com/ads/manager/billing',
                                        linkLabel: 'Add Payment →'
                                    },
                                    {
                                        id: 'whatsapp',
                                        done: checklistChecks.hasWhatsApp,
                                        icon: '📱',
                                        title: 'WhatsApp Number Connected',
                                        desc: checklistChecks.hasWhatsApp
                                            ? 'Your WhatsApp Business API number is configured and ready.'
                                            : 'Your WhatsApp Business API number must be set up and linked to your Facebook Page.',
                                        steps: [
                                            'Go to BlueTick Settings.',
                                            'Under WhatsApp Configuration, follow the embedded setup.',
                                            'Ensure your number is successfully verified.',
                                            'Return here and click "Re-check my setup".'
                                        ],
                                        link: '/settings',
                                        linkLabel: 'Setup WhatsApp →',
                                        internal: true
                                    },
                                    {
                                        id: 'page_waba',
                                        done: checklistChecks.hasPageWabaLink,
                                        icon: '🔗',
                                        title: 'Page Linked to WhatsApp',
                                        desc: checklistChecks.hasPageWabaLink
                                            ? 'Your Facebook Page is properly linked to your WhatsApp Business Account.'
                                            : 'Your Facebook Page MUST be linked to your WhatsApp Business account in Meta Business settings to run Click-to-WhatsApp ads. If not linked, ads will fallback to standard website traffic ads.',
                                        steps: [
                                            'Open your Facebook Page Settings.',
                                            'On the left sidebar, click "Linked Accounts" then "WhatsApp".',
                                            'Enter your WhatsApp number and verify the OTP.',
                                            'Return here and click "Re-check my setup".'
                                        ],
                                        link: 'https://business.facebook.com/settings/whatsapp-business-accounts',
                                        linkLabel: 'Link in Meta Business →',
                                        internal: false
                                    },
                                ].map((item, i) => {
                                    const isExpanded = expandedCheck === item.id;
                                    return (
                                    <div key={item.id} className={`flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer ${item.done ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5' : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5'}`} onClick={() => !item.done && setExpandedCheck(isExpanded ? null : item.id)}>
                                        <div className="flex items-start gap-4">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${item.done ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-amber-100 dark:bg-amber-500/20 shadow-sm'}`}>
                                                {item.done ? '✅' : item.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 flex items-center justify-between">
                                                <div>
                                                    <p className={`font-bold text-sm ${item.done ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>{item.title}</p>
                                                    {!item.done && <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">Click to view fix instructions</p>}
                                                </div>
                                                {!item.done && (
                                                    <ChevronDown className={`w-5 h-5 text-amber-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                )}
                                            </div>
                                        </div>
                                        
                                        <AnimatePresence>
                                            {!item.done && isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="pt-4 overflow-hidden"
                                                >
                                                    <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-inner border border-amber-100 dark:border-amber-500/20">
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 font-medium">{item.desc}</p>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">How to fix this:</p>
                                                        <ol className="list-decimal pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                                                            {item.steps.map((step, idx) => (
                                                                <li key={idx} className="flex items-start gap-2">
                                                                    <div dangerouslySetInnerHTML={{__html: step}} />
                                                                </li>
                                                            ))}
                                                        </ol>
                                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex gap-3">
                                                            {item.link && (
                                                                item.internal ? (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setShowChecklist(false); navigate(item.link); }} 
                                                                        className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors inline-flex items-center gap-1"
                                                                    >
                                                                        {item.linkLabel}
                                                                    </button>
                                                                ) : (
                                                                    <a 
                                                                        href={item.link} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        onClick={e => e.stopPropagation()} 
                                                                        className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors inline-flex items-center gap-1"
                                                                    >
                                                                        {item.linkLabel}
                                                                    </a>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    );
                                })}

                                {/* Re-check my setup */}
                                <button
                                    onClick={async () => { setChecklistLoading(true); await fetchStatus(); setChecklistLoading(false); }}
                                    disabled={checklistLoading}
                                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-primary py-2 border border-dashed border-slate-200 dark:border-white/10 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {checklistLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🔄'} Re-check my setup
                                </button>
                            </div>


                            <div className="px-6 pb-6">
                                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl px-4 py-3 mb-4">
                                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                        💡 <strong>Meta handles all billing.</strong> You add your payment method directly in Meta Ad Account — your ad budget is charged by Meta, not by this platform.
                                    </p>
                                </div>
                                {Object.values(checklistChecks).every(Boolean) ? (
                                    <button
                                        onClick={() => setShowChecklist(false)}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25"
                                    >
                                        All Set! Let's Create My Ad 🚀
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full py-3 bg-slate-100 dark:bg-white/5 text-slate-400 font-bold rounded-2xl cursor-not-allowed"
                                    >
                                        Please complete all steps above first
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══ Ad Preview Modal ══ */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPreview(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-md w-full overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
                                <h2 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                    <span>📱</span> Ad Preview
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full font-medium">Facebook Feed</span>
                                    <button onClick={() => setShowPreview(false)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5">
                                {/* Facebook Ad Mockup */}
                                <div className="bg-white dark:bg-[#242526] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-lg">
                                    {/* Post Header */}
                                    <div className="p-3 flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                            {(manual.campaignName || businessData.name || 'B')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-slate-900 dark:text-[#E4E6EB]">{manual.campaignName || businessData.name || 'Your Business'}</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-slate-400">Sponsored</span>
                                                <span className="text-slate-300">·</span>
                                                <span className="text-[10px] text-slate-400">🌍</span>
                                            </div>
                                        </div>
                                        <MoreVertical className="w-4 h-4 text-slate-400" />
                                    </div>
                                    {/* Ad Body */}
                                    <div className="px-3 pb-3">
                                        <p className="text-sm text-slate-800 dark:text-[#E4E6EB] leading-relaxed">
                                            {manual.primaryText || (creativeData?.[selectedCreativeIndex]?.primary_text) || 'Your ad copy will appear here. Write something compelling that makes people want to message you on WhatsApp!'}
                                        </p>
                                    </div>
                                    {/* Ad Image Placeholder */}
                                    <div className="mx-3 mb-3 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 aspect-square max-h-48 flex items-center justify-center relative">
                                        {(generatedImage) ? (
                                            <img src={generatedImage} alt="Ad" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                <p className="text-xs text-slate-400 font-medium">1080 × 1080 px recommended</p>
                                                <p className="text-[10px] text-slate-300 mt-0.5">Upload or generate an image</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* CTA Bar */}
                                    <div className="bg-slate-50 dark:bg-[#3A3B3C] px-3 py-3 flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">SEND MESSAGE ON WHATSAPP</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                                                {manual.headline || (creativeData?.[selectedCreativeIndex]?.headline) || 'Chat with us now →'}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 ml-3 px-4 py-2 bg-[#25D366] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-green-500/25">
                                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                        </div>
                                    </div>
                                    {/* Reactions row */}
                                    <div className="px-3 py-2.5 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-0.5">
                                            <span className="text-sm">👍</span><span className="text-sm">❤️</span><span className="text-sm">😮</span>
                                            <span className="text-xs text-slate-400 ml-1.5">Be the first to react</span>
                                        </div>
                                        <span className="text-xs text-slate-400">0 Comments</span>
                                    </div>
                                </div>

                                {/* Targeting Summary */}
                                <div className="mt-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-2.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Targeting Summary</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white dark:bg-white/5 rounded-xl p-2.5">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wide">Age</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white">{manual.ageMin || 18}–{manual.ageMax || 55} yrs</p>
                                        </div>
                                        <div className="bg-white dark:bg-white/5 rounded-xl p-2.5">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wide">Gender</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white capitalize">{gender === 'all' ? 'All Genders' : gender === 'male' ? '👨 Men' : '👩 Women'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-white/5 rounded-xl p-2.5">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wide">Locations</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                {(manualLocations.length > 0 ? manualLocations : targetLocations).map(l => l.name).join(', ') || 'India (default)'}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-white/5 rounded-xl p-2.5">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wide">Placements</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white">{placements.join(', ') || 'All'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════
                MODE TOGGLE — Premium dual-mode selector
            ══════════════════════════════════════════ */}
            <div className="mb-8">
                {/* Back link + Prerequisite Check */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Meta Ads
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPreview(true)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-3 py-2 rounded-xl transition-all border border-slate-200 dark:border-white/10"
                        >
                            <ExternalLink className="w-3.5 h-3.5" /> Preview Ad
                        </button>
                        <button
                            onClick={() => setShowChecklist(true)}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-2 rounded-xl transition-all border border-blue-200 dark:border-blue-500/30"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Setup Checklist
                        </button>
                    </div>
                </div>

                {/* Toggle Card */}
                <div className="relative bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl p-2 shadow-xl shadow-black/5 dark:shadow-black/20 flex gap-2">
                    {/* Sliding background */}
                    <motion.div
                        initial={false}
                        className="absolute inset-2 rounded-2xl"
                        style={{ width: 'calc(50% - 8px)' }}
                        animate={{ x: creationMode === 'manual' ? 'calc(100% + 8px)' : '0%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    >
                        <div className={`h-full w-full rounded-2xl shadow-lg ${
                            creationMode === 'ai'
                                ? 'bg-primary'
                                : 'bg-violet-600'
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
                        <div className="text-left flex-1">
                            <p className={`font-bold text-sm transition-colors flex items-center gap-2 ${ creationMode === 'ai' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                AI-Assisted Wizard
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${ creationMode === 'ai' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>Recommended</span>
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
                        <div className="text-left flex-1">
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
                                </p>
                            </>
                        ) : (
                            <>
                                <SlidersHorizontal className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    <strong className="text-slate-700 dark:text-slate-300">Manual Builder</strong> — Set every parameter yourself. Ideal for experienced marketers who know exactly what they want.
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

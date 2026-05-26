import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Target, Type, CreditCard, ChevronRight, ChevronLeft, 
    CheckCircle2, AlertTriangle, Loader2, Megaphone, MapPin, 
    Users, Briefcase, Zap, Image, TrendingUp, ExternalLink, MoreVertical
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const steps = [
    { id: 'business', title: 'Business Info', icon: Briefcase },
    { id: 'audience', title: 'AI Audience', icon: Target },
    { id: 'creative', title: 'AI Creative', icon: Type },
    { id: 'publish', title: 'Review & Launch', icon: Zap }
];

export default function MetaAdsWizard() {
    const navigate = useNavigate();
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

    // Step 1 -> Step 2
    const handleGenerateAudience = async () => {
        if (!businessData.description || businessData.description.length < 10) {
            return toast.error("Please provide a detailed description so AI can work effectively.");
        }
        setLoading(true);
        try {
            const res = await axios.post('/api/meta-ads/ai-research', {
                businessDescription: `Business Name: ${businessData.name}\n${businessData.description}`
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
                tone: 'High-converting, action-oriented for WhatsApp'
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

    // Step 4: Publish
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
                imageUrl: generatedImage
            }, { withCredentials: true });
            
            toast.success("Campaign prepared successfully!");
            navigate('/meta-ads');
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to publish." );
        } finally {
            setLoading(false);
        }
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
                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={handleGenerateAudience}
                                disabled={loading || !businessData.description}
                                className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-4 md:px-8 py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
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
                                        <MapPin className="w-4 h-4 text-slate-400" /> Locations
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {audienceData?.locations?.map((loc, i) => (
                                            <span key={i} className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold">{loc}</span>
                                        ))}
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
                                className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-4 md:px-8 py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
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
                                Proceed to Publish <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                );
            case 3:
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

                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <CreditCard className="w-5 h-5 text-slate-400" />
                                <h4 className="font-bold text-slate-900 dark:text-white">Budget &amp; Schedule</h4>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        <span>Daily Budget</span>
                                        <span className="text-primary">${budgetData.dailyBudget}</span>
                                    </label>
                                    <input 
                                        type="range" min="100" max="5000" step="50"
                                        className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        value={budgetData.dailyBudget}
                                        onChange={(e) => setBudgetData({...budgetData, dailyBudget: parseInt(e.target.value)})}
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                                        <span>$100</span>
                                        <span>$5,000+</span>
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
                            <button onClick={() => setCurrentStep(2)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl">Back to Creatives</button>
                            <button 
                                onClick={handlePublish}
                                disabled={loading}
                                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all w-full justify-center ml-4 ${
                                    metaConnected
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/25 text-white'
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
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-4 border-[#F8FAFC] dark:border-[#0f172a] ${isActive ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'bg-slate-200 dark:bg-surface-dark text-slate-400'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={`text-xs font-bold absolute -bottom-6 w-max ${isActive ? 'text-primary' : 'text-slate-400'}`}>{step.title}</span>
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
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Bot, Save, FileText, AlertCircle, ShoppingCart, Sliders, Globe, Clock, MessageSquare, Smile, BookOpen, Zap, Users, Thermometer, ChevronDown, Info, Upload, File, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const TONE_OPTIONS = [
    { value: 'professional', label: 'Professional', desc: 'Formal and business-like' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'sales', label: 'Sales-focused', desc: 'Persuasive and engaging' },
    { value: 'technical', label: 'Technical', desc: 'Precise and detailed' },
    { value: 'casual', label: 'Casual', desc: 'Relaxed and conversational' },
];

const EMOJI_OPTIONS = [
    { value: 'none', label: 'None', desc: 'No emojis at all' },
    { value: 'minimal', label: 'Minimal', desc: 'Occasional well-placed emojis' },
    { value: 'expressive', label: 'Expressive', desc: 'Frequent emojis for emphasis' },
];

const HOURS_MODE_OPTIONS = [
    { value: 'always', label: 'Always On', desc: 'AI responds 24/7' },
    { value: 'off_hours', label: 'Off-Hours Only', desc: 'AI responds only outside business hours' },
    { value: 'manual', label: 'Manual', desc: 'Toggle AI on/off yourself' },
];

const LANGUAGE_OPTIONS = [
    { value: 'auto', label: 'Auto-detect (match user\'s language)' },
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'ar', label: 'Arabic' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese' },
];

const DEFAULT_CONFIG = {
    systemPrompt: '',
    tone: 'friendly',
    temperature: 0.7,
    handoffKeywords: '',
    handoffDelay: 0,
    maxResponseLength: 200,
    emojiUsage: 'minimal',
    knowledgeBase: '',
    defaultLanguage: 'auto',
    operatingMode: 'always',
    manualEnabled: false,
};

const InfoTip = ({ text }) => (
    <div className="group relative inline-block ml-1">
        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 z-[9999] shadow-xl">
            {text}
            <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
        </div>
    </div>
);

const AiBotSettings = () => {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fileUploading, setFileUploading] = useState(false);
    const kbFileRef = useRef(null);
    const [hasAddon, setHasAddon] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/addons/my/ai_bot/config', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConfig(prev => ({ ...prev, ...res.data }));
                setHasAddon(true);
            } catch (err) {
                if (err.response?.status === 403) {
                    setHasAddon(false);
                } else {
                    toast.error("Failed to load settings");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/addons/my/ai_bot/config', config, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Settings saved successfully!");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
    }

    if (!hasAddon) {
        return (
            <div className="flex flex-col justify-center items-center py-20 px-4 text-center">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-12 h-12 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Add-on Not Activated</h2>
                <p className="text-slate-500 mb-8 max-w-md">You need to purchase or activate the AI Chatbot Add-on to access these settings.</p>
                <Link to="/marketplace" className="btn-primary flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Go to Marketplace
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Bot className="w-8 h-8 text-indigo-600" />
                        AI Chatbot Settings
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Configure your AI assistant's persona, behavior, and knowledge.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* ── Section 1: Bot Persona ── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-white">Bot Persona & Identity</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        {/* System Prompt */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                System Prompt
                                <InfoTip text="The core instructions that define how your AI behaves. Be specific about its role, name, and boundaries." />
                            </label>
                            <textarea
                                value={config.systemPrompt || ''}
                                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                rows={5}
                                className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none resize-y text-sm"
                                placeholder="You are Alex, a helpful customer support agent for Acme Corp. You assist with product queries, order tracking, and general support. Keep replies short and WhatsApp-friendly."
                            />
                        </div>

                        {/* Tone */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Tone & Personality
                                <InfoTip text="Controls the overall communication style of the bot." />
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                {TONE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleChange('tone', opt.value)}
                                        className={`p-3 rounded-xl border text-left transition-all text-sm ${config.tone === opt.value
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/30'
                                            : 'border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30'}`}
                                    >
                                        <div className="font-medium text-slate-800 dark:text-white">{opt.label}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Default Language */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <Globe className="w-4 h-4 mr-1.5 text-slate-400" />
                                Default Language
                                <InfoTip text="Force the bot to always respond in this language, or auto-detect from the user's message." />
                            </label>
                            <select
                                value={config.defaultLanguage || 'auto'}
                                onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                                className="w-full sm:w-72 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none text-sm"
                            >
                                {LANGUAGE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Response Behavior ── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50">
                        <Sliders className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-white">Response Behavior</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Temperature Slider */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <Thermometer className="w-4 h-4 mr-1.5 text-slate-400" />
                                Creativity (Temperature)
                                <InfoTip text="Low = factual and consistent. High = creative and varied. Default 0.7 is balanced." />
                            </label>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-400 w-14">Factual</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={config.temperature ?? 0.7}
                                    onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <span className="text-xs text-slate-400 w-14 text-right">Creative</span>
                                <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg min-w-[3rem] text-center">{config.temperature ?? 0.7}</span>
                            </div>
                        </div>

                        {/* Max Response Length */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <MessageSquare className="w-4 h-4 mr-1.5 text-slate-400" />
                                Max Response Length (tokens)
                                <InfoTip text="Limits the AI's reply length to keep WhatsApp messages concise. 100-500 recommended." />
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="50"
                                    max="1000"
                                    step="50"
                                    value={config.maxResponseLength ?? 200}
                                    onChange={(e) => handleChange('maxResponseLength', parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg min-w-[4rem] text-center">{config.maxResponseLength ?? 200}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Lower values save tokens and keep messages short. Higher values allow detailed responses.</p>
                        </div>

                        {/* Emoji Usage */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <Smile className="w-4 h-4 mr-1.5 text-slate-400" />
                                Emoji Usage
                                <InfoTip text="Controls how frequently the bot uses emojis in its replies." />
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {EMOJI_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleChange('emojiUsage', opt.value)}
                                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${config.emojiUsage === opt.value
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30'
                                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-indigo-300'}`}
                                    >
                                        {opt.label}
                                        <span className="block text-xs font-normal text-slate-400 mt-0.5">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section 3: Knowledge Base ── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-white">Knowledge Base / FAQ</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Custom Knowledge
                                <InfoTip text="Paste your company's FAQs, product info, or policies here. The AI will reference this to answer customer queries accurately." />
                            </label>
                            <textarea
                                value={config.knowledgeBase || ''}
                                onChange={(e) => handleChange('knowledgeBase', e.target.value)}
                                rows={8}
                                className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none resize-y text-sm font-mono"
                                placeholder={"Q: What are your business hours?\nA: We are open Monday to Friday, 9 AM to 6 PM IST.\n\nQ: What is your return policy?\nA: We accept returns within 7 days of delivery.\n\nProduct: Premium Plan - ₹999/month - Includes 10,000 messages, priority support, and all add-ons."}
                            />
                            <p className="text-xs text-slate-400 mt-2">Use Q&A format or plain text. The more specific, the better the AI's responses.</p>
                        </div>

                        {/* File Upload Zone */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <Upload className="w-4 h-4 mr-1.5 text-slate-400" />
                                Import from File
                                <InfoTip text="Upload a .txt, .pdf, .md, or .csv file about your business. The text will be extracted and appended to the knowledge base above." />
                            </label>
                            <input
                                ref={kbFileRef}
                                type="file"
                                accept=".txt,.pdf,.md,.csv"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    const maxSize = 10 * 1024 * 1024; // 10MB
                                    if (file.size > maxSize) {
                                        toast.error('File is too large. Maximum size is 10MB.');
                                        return;
                                    }

                                    setFileUploading(true);
                                    try {
                                        const token = localStorage.getItem('token');
                                        const fd = new FormData();
                                        fd.append('file', file);
                                        const res = await axios.post('/api/addons/my/ai_bot/parse-knowledge-file', fd, {
                                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                                        });
                                        if (res.data?.text) {
                                            const separator = config.knowledgeBase?.trim() ? '\n\n--- Imported from: ' + file.name + ' ---\n\n' : '';
                                            handleChange('knowledgeBase', (config.knowledgeBase || '') + separator + res.data.text);
                                            toast.success(`Extracted ${res.data.charCount.toLocaleString()} characters from "${file.name}"`);
                                        }
                                    } catch (err) {
                                        toast.error(err.response?.data?.error || 'Failed to parse file.');
                                    } finally {
                                        setFileUploading(false);
                                        if (kbFileRef.current) kbFileRef.current.value = '';
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => kbFileRef.current?.click()}
                                disabled={fileUploading}
                                className="w-full p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                            >
                                {fileUploading ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                        <span className="text-sm font-medium">Extracting text...</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-medium">Click to upload a business document</span>
                                        <span className="text-xs text-slate-400">Supports .txt, .pdf, .md, .csv — max 10MB</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Section 4: Human Handoff ── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50">
                        <Users className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-white">Human Handoff</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        {/* Handoff Keywords */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Handoff Trigger Keywords
                                <InfoTip text="When a customer message contains any of these words, the AI will stop responding and notify your team." />
                            </label>
                            <input
                                type="text"
                                value={config.handoffKeywords || ''}
                                onChange={(e) => handleChange('handoffKeywords', e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none text-sm"
                                placeholder="human, agent, help, speak to someone, call me"
                            />
                            <p className="text-xs text-slate-400 mt-1">Comma-separated. Leave empty to never auto-handoff.</p>
                        </div>

                        {/* Handoff Delay */}
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                                Auto-Handoff Delay (minutes)
                                <InfoTip text="After a handoff is triggered, how long to wait for a human agent before the AI resumes. Set 0 to keep AI paused until manual resume." />
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="1440"
                                value={config.handoffDelay ?? 0}
                                onChange={(e) => handleChange('handoffDelay', parseInt(e.target.value) || 0)}
                                className="w-full sm:w-40 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none text-sm"
                                placeholder="0"
                            />
                            <p className="text-xs text-slate-400 mt-1">0 = AI stays paused until a team member manually resumes.</p>
                        </div>
                    </div>
                </div>

                {/* ── Section 5: Operating Mode ── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-white">Operating Mode</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                When should the AI respond?
                                <InfoTip text="Choose when the AI bot is active. 'Off-Hours Only' uses your WhatsApp automation schedule." />
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {HOURS_MODE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleChange('operatingMode', opt.value)}
                                        className={`p-4 rounded-xl border text-left transition-all ${config.operatingMode === opt.value
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/30'
                                            : 'border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30'}`}
                                    >
                                        <div className="font-medium text-slate-800 dark:text-white text-sm">{opt.label}</div>
                                        <div className="text-xs text-slate-400 mt-1">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Manual Toggle - only shows if Manual mode is selected */}
                        {config.operatingMode === 'manual' && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.manualEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white">Manual AI Toggle</div>
                                        <div className="text-xs text-slate-400">Turn AI response on or off immediately</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleChange('manualEnabled', !config.manualEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.manualEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.manualEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Save Button */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AiBotSettings;

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
    Save, MessageCircle, Clock, MapPin, Mail, Globe,
    Briefcase, Info, Check, X, CalendarClock, RefreshCw, Upload, Image as ImageIcon, Copy, Link2, Shield
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import TopHeader from '../components/TopHeader';

const VERTICALS = [
    'OTHER', 'AUTO', 'BEAUTY', 'APPAREL', 'EDU', 'ENTERTAIN', 'EVENT_PLAN',
    'FINANCE', 'GROCERY', 'GOVT', 'HOTEL', 'HEALTH', 'NONPROFIT',
    'PROF_SERVICES', 'RETAIL', 'TRAVEL', 'RESTAURANT'
];

const DAYS = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 }
];

export default function WhatsAppSettings() {
    const { showToast } = useUI();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [webhookCopied, setWebhookCopied] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);
    // Public base URL (ngrok or production domain) — persisted in localStorage
    const [publicBaseUrl, setPublicBaseUrl] = useState(
        () => localStorage.getItem('publicBaseUrl') || ''
    );

    const webhookPath = user?.id ? `/api/webhook/${user.id}` : '/api/webhook/...';
    const webhookUrl = publicBaseUrl
        ? `${publicBaseUrl.replace(/\/$/, '')}${webhookPath}`
        : `[Enter your public URL below]${webhookPath}`;
    const [verifyToken, setVerifyToken] = useState('Loading...');

    const handlePublicBaseUrlChange = (val) => {
        setPublicBaseUrl(val);
        localStorage.setItem('publicBaseUrl', val);
    };

    const copyToClipboard = (text, setter) => {
        if (!publicBaseUrl) { showToast({ type: 'warning', title: 'No URL Set', message: 'Please enter your public/ngrok URL first.' }); return; }
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    const [saving, setSaving] = useState(false);
    const [dpUploading, setDpUploading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Config State
    const [profile, setProfile] = useState({
        description: '', address: '', email: '', websites: [''], vertical: 'OTHER'
    });
    const [automations, setAutomations] = useState({
        welcomeMessage: { enabled: false, text: '' },
        offHoursMessage: {
            enabled: false, text: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            schedule: DAYS.map(d => ({ day: d.value, enabled: true, startTime: '09:00', endTime: '17:00' }))
        }
    });

    useEffect(() => {
        fetchSettings();
        // Fetch the verify token dynamically from the server
        (async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings/webhook-token`);
                setVerifyToken(res.data.verifyToken || '');
            } catch (e) {
                setVerifyToken('Error loading token');
            }
        })();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings`);
            const data = res.data;
            if (data.whatsappProfile) {
                const wp = data.whatsappProfile;
                if (!wp.websites) wp.websites = [''];
                else if (wp.websites.length === 0) wp.websites = [''];
                setProfile(wp);
            }
            if (data.whatsappAutomations) {
                const wa = data.whatsappAutomations;
                // Merge with default schedule to ensure all 7 days exist
                let schedule = wa.offHoursMessage?.schedule || [];
                if (schedule.length !== 7) {
                    schedule = DAYS.map(d => {
                        const existing = schedule.find(s => s.day === d.value);
                        return existing || { day: d.value, enabled: true, startTime: '09:00', endTime: '17:00' };
                    });
                }
                setAutomations({
                    welcomeMessage: wa.welcomeMessage || { enabled: false, text: '' },
                    offHoursMessage: {
                        enabled: wa.offHoursMessage?.enabled || false,
                        text: wa.offHoursMessage?.text || '',
                        timezone: wa.offHoursMessage?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                        schedule
                    }
                });
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            showToast({ type: 'error', title: 'Error', message: 'Failed to load WhatsApp configuration.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Clean up websites payload (remove empties)
            const cleanProfile = { ...profile };
            cleanProfile.websites = cleanProfile.websites.filter(w => w.trim() !== '');
            if (cleanProfile.websites.length > 2) cleanProfile.websites = cleanProfile.websites.slice(0, 2);

            await axios.post(`${import.meta.env.VITE_API_URL}/api/settings`, {
                whatsappProfile: cleanProfile,
                whatsappAutomations: automations
            });

            showToast({ type: 'success', title: 'Saved!', message: 'WhatsApp settings & Meta profile updated successfully.' });

            // Revert empty row UI if needed
            if (cleanProfile.websites.length === 0) cleanProfile.websites = [''];
            setProfile(cleanProfile);

        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Save Failed', message: err.response?.data?.error || err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (file.size > 5 * 1024 * 1024) {
            showToast({ type: 'error', title: 'File Too Large', message: 'Profile picture must be less than 5MB.' });
            return;
        }

        setDpUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/settings/upload-whatsapp-profile-img`, formData, {
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success) {
                showToast({ type: 'success', title: 'Upload Successful', message: 'WhatsApp profile picture updated directly on Meta!' });
            }
        } catch (err) {
            console.error('DP Upload Error:', err);
            showToast({ type: 'error', title: 'Upload Failed', message: err.response?.data?.error || 'Failed to sync picture to Meta.' });
        } finally {
            setDpUploading(false);
        }
    };

    const handleSyncProfile = async (silent = false) => {
        try {
            setSyncing(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings/sync-whatsapp-profile`);
            if (res.data.success) {
                const p = res.data.profile;
                if (!p.websites || p.websites.length === 0) p.websites = [''];
                setProfile(p);
                if (!silent) {
                    showToast({ type: 'success', title: 'Synced!', message: 'WhatsApp profile pulled from Meta successfully.' });
                }
            }
        } catch (err) {
            console.error('Sync error:', err);
            if (!silent) {
                showToast({ type: 'error', title: 'Sync Failed', message: err.response?.data?.error || 'Could not fetch profile from Meta.' });
            }
        } finally {
            setSyncing(false);
        }
    };

    const hasAttemptedAutoSync = useRef(false);
    const handleImageError = () => {
        // Meta Graph API URLs expire. If the image breaks, auto-sync once to refresh the URL.
        if (!hasAttemptedAutoSync.current) {
            console.log('Profile image expired or broken. Auto-syncing with Meta...');
            hasAttemptedAutoSync.current = true;
            handleSyncProfile(true); // silent sync
        }
    };

    const updateSchedule = (dayIndex, field, value) => {
        setAutomations(prev => {
            const newSchedule = [...prev.offHoursMessage.schedule];
            const idx = newSchedule.findIndex(s => s.day === dayIndex);
            if (idx !== -1) {
                newSchedule[idx] = { ...newSchedule[idx], [field]: value };
            }
            return {
                ...prev,
                offHoursMessage: { ...prev.offHoursMessage, schedule: newSchedule }
            };
        });
    };

    const updateWebsite = (index, value) => {
        const newWebsites = [...profile.websites];
        newWebsites[index] = value;
        setProfile(prev => ({ ...prev, websites: newWebsites }));
    };

    const addWebsite = () => {
        if (profile.websites.length < 2) {
            setProfile(prev => ({ ...prev, websites: [...prev.websites, ''] }));
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-background-dark">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader 
                title="WhatsApp Configuration" 
                subtitle="Manage your live Meta Business Profile and Automated Messaging Rules."
            />
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative p-6 sm:p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* Action Buttons Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 mb-2">
                        <button
                            onClick={handleSyncProfile}
                            disabled={syncing}
                            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-green-500/10 disabled:opacity-50 w-full sm:w-auto"
                        >
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            Sync from Meta
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 w-full sm:w-auto"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left Column: Business Profile */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-[#25D366]" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <Info className="w-5 h-5 text-[#25D366]" /> Live Business Profile
                            </h2>
                            <p className="text-xs text-slate-500 mb-6 bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5 shadow-inner">
                                Editing these details will instantly sync and overwrite your public details on WhatsApp. Adhere to Meta's strict formatting limits.
                            </p>

                            {/* Profile Picture Upload Area */}
                            <div className="flex items-center gap-6 mb-6">
                                <div className="relative group shrink-0">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                                        {dpUploading ? (
                                            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                                        ) : profile.profilePictureUrl ? (
                                            <img src={profile.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" onError={handleImageError} />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
                                        )}
                                    </div>
                                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                                        <Upload className="w-5 h-5" />
                                        <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={handleImageUpload} disabled={dpUploading} />
                                    </label>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Profile Photo</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload a JPG or PNG (Max 5MB). Changes push instantly to WhatsApp.</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-slate-400" /> Description (Max 256)
                                    </label>
                                    <textarea
                                        value={profile.description}
                                        onChange={e => setProfile({ ...profile, description: e.target.value.substring(0, 256) })}
                                        className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
                                        placeholder="Welcome to our official business channel..."
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-1">{profile.description.length}/256</div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400" /> Address (Max 256)
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.address}
                                        onChange={e => setProfile({ ...profile, address: e.target.value.substring(0, 256) })}
                                        className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="123 Main St, City, Country"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-slate-400" /> Email (Max 128)
                                        </label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={e => setProfile({ ...profile, email: e.target.value.substring(0, 128) })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="support@company.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-slate-400" /> Industry Vertical
                                        </label>
                                        <select
                                            value={profile.vertical}
                                            onChange={e => setProfile({ ...profile, vertical: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            {VERTICALS.map(v => (
                                                <option key={v} value={v}>{v.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-slate-400" /> Websites (Max 2)
                                        </div>
                                        {profile.websites.length < 2 && (
                                            <button onClick={addWebsite} className="text-xs text-primary hover:underline font-medium">
                                                + Add another
                                            </button>
                                        )}
                                    </label>
                                    {profile.websites.map((web, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="url"
                                                value={web}
                                                onChange={e => updateWebsite(idx, e.target.value.substring(0, 256))}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                placeholder={`https://website${idx === 0 ? '' : idx + 1}.com`}
                                            />
                                            {profile.websites.length > 1 && (
                                                <button
                                                    onClick={() => setProfile(p => ({ ...p, websites: p.websites.filter((_, i) => i !== idx) }))}
                                                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors dark:bg-red-500/10 dark:hover:bg-red-500/20"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Automations */}
                    <div className="flex flex-col gap-6">

                        {/* Webhook Configuration Card */}
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-blue-500" /> Webhook Configuration
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                                Copy these values into your Meta App Dashboard under <strong>WhatsApp → Configuration → Webhook</strong>. Update the Callback URL every time your ngrok URL changes.
                            </p>
                            <div className="space-y-4">
                                {/* Callback URL */}
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5" /> Public Domain / Ngrok URL
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="https://your-ngrok-id.ngrok-free.dev"
                                        value={publicBaseUrl}
                                        onChange={(e) => handlePublicBaseUrlChange(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all mb-3"
                                    />

                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Link2 className="w-3.5 h-3.5" /> Callback URL
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 font-mono overflow-x-auto whitespace-nowrap">
                                            {webhookUrl}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(webhookUrl, setWebhookCopied)}
                                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                                webhookCopied
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-white/10'
                                            }`}
                                        >
                                            {webhookCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {webhookCopied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                {/* Verify Token */}
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5" /> Verify Token
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
                                            {verifyToken}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(verifyToken, setTokenCopied)}
                                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                                tokenCopied
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-white/10'
                                            }`}
                                        >
                                            {tokenCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {tokenCopied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                        <strong>How to use:</strong> Open your Meta App's dashboard at <strong>developers.facebook.com</strong>, navigate to <strong>WhatsApp → Configuration</strong>, click <strong>Edit</strong> next to the Webhook section, and paste this token into the <strong>"Verify Token"</strong> field along with the Callback URL above. This lets Meta confirm that the webhook belongs to your account.
                                    </p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                                    <strong>Required Webhook Fields:</strong> Make sure <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">messages</code> is subscribed under Webhook Fields in Meta Dashboard for button tracking to work.
                                </div>
                            </div>
                        </div>


                        {/* Welcome Message Card */}
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-background-dark/30">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5 text-purple-500" /> Welcome Auto-Reply
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">Sent automatically when a customer messages you for the first time in 24 hours.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={automations.welcomeMessage.enabled}
                                        onChange={e => setAutomations({
                                            ...automations,
                                            welcomeMessage: { ...automations.welcomeMessage, enabled: e.target.checked }
                                        })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#25D366]"></div>
                                </label>
                            </div>
                            {automations.welcomeMessage.enabled && (
                                <div className="p-6 bg-white dark:bg-surface-dark animate-in slide-in-from-top-2 fade-in duration-200">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Message Content
                                    </label>
                                    <textarea
                                        value={automations.welcomeMessage.text}
                                        onChange={e => setAutomations({
                                            ...automations,
                                            welcomeMessage: { ...automations.welcomeMessage, text: e.target.value }
                                        })}
                                        className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-none h-28"
                                        placeholder="Hello! Welcome to our store. How can we help you today?"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Off-Hours Message Card */}
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-background-dark/30">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-orange-500" /> Off-Hours Auto-Reply
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">Overrides the welcome message if the customer messages outside your defined business schedule.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={automations.offHoursMessage.enabled}
                                        onChange={e => setAutomations({
                                            ...automations,
                                            offHoursMessage: { ...automations.offHoursMessage, enabled: e.target.checked }
                                        })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#25D366]"></div>
                                </label>
                            </div>

                            {automations.offHoursMessage.enabled && (
                                <div className="p-6 bg-white dark:bg-surface-dark space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                    {/* Text Content */}
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                            Message Content
                                        </label>
                                        <textarea
                                            value={automations.offHoursMessage.text}
                                            onChange={e => setAutomations({
                                                ...automations,
                                                offHoursMessage: { ...automations.offHoursMessage, text: e.target.value }
                                            })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none h-24"
                                            placeholder="We are currently away. Our business hours are..."
                                        />
                                    </div>

                                    {/* Scheduler */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                <CalendarClock className="w-4 h-4 text-orange-500" /> Business Hours Scheduler
                                            </label>
                                            <select
                                                value={automations.offHoursMessage.timezone}
                                                onChange={e => setAutomations({
                                                    ...automations,
                                                    offHoursMessage: { ...automations.offHoursMessage, timezone: e.target.value }
                                                })}
                                                className="bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1 outline-none"
                                            >
                                                <option value="UTC">UTC</option>
                                                <option value="America/New_York">America/New_York</option>
                                                <option value="America/Chicago">America/Chicago</option>
                                                <option value="America/Denver">America/Denver</option>
                                                <option value="America/Los_Angeles">America/Los_Angeles</option>
                                                <option value="Europe/London">Europe/London</option>
                                                <option value="Europe/Paris">Europe/Paris</option>
                                                <option value="Asia/Dubai">Asia/Dubai</option>
                                                <option value="Asia/Kolkata">Asia/Kolkata</option>
                                                <option value="Asia/Singapore">Asia/Singapore</option>
                                                <option value="Australia/Sydney">Australia/Sydney</option>
                                            </select>
                                        </div>

                                        <div className="space-y-3">
                                            {DAYS.map((day) => {
                                                const config = automations.offHoursMessage.schedule.find(s => s.day === day.value) || { enabled: false, startTime: '09:00', endTime: '17:00' };
                                                return (
                                                    <div key={day.value} className="flex items-center gap-3 bg-slate-50/50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                                                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={config.enabled}
                                                                onChange={e => updateSchedule(day.value, 'enabled', e.target.checked)}
                                                            />
                                                            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-[#25D366]"></div>
                                                        </label>
                                                        <span className={cn("w-24 text-sm font-medium", config.enabled ? "text-slate-900 dark:text-white" : "text-slate-400")}>
                                                            {day.label}
                                                        </span>
                                                        <div className="flex-1 flex gap-2 items-center opacity-100 transition-opacity" style={{ opacity: config.enabled ? 1 : 0.3, pointerEvents: config.enabled ? 'auto' : 'none' }}>
                                                            <input
                                                                type="time"
                                                                value={config.startTime}
                                                                onChange={e => updateSchedule(day.value, 'startTime', e.target.value)}
                                                                className="flex-1 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-orange-500"
                                                            />
                                                            <span className="text-slate-400 text-xs">to</span>
                                                            <input
                                                                type="time"
                                                                value={config.endTime}
                                                                onChange={e => updateSchedule(day.value, 'endTime', e.target.value)}
                                                                className="flex-1 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-orange-500"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                </div>
            </div>
            </div>
        </div>
    );
}

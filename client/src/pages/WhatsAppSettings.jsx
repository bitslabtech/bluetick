import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
    Save, MessageCircle, Clock, MapPin, Mail, Globe,
    Briefcase, Info, Check, X, CalendarClock, RefreshCw, Upload, Image as ImageIcon, Shield, BellOff, Search, ChevronDown
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

// { tz, country, label } — label is what's shown in the dropdown
const TIMEZONES = [
    { tz: 'UTC',                      country: 'Universal',           label: 'UTC — Universal' },
    // Americas
    { tz: 'America/New_York',         country: 'United States',       label: 'America/New_York (ET) — United States' },
    { tz: 'America/Chicago',          country: 'United States',       label: 'America/Chicago (CT) — United States' },
    { tz: 'America/Denver',           country: 'United States',       label: 'America/Denver (MT) — United States' },
    { tz: 'America/Los_Angeles',      country: 'United States',       label: 'America/Los_Angeles (PT) — United States' },
    { tz: 'America/Anchorage',        country: 'United States',       label: 'America/Anchorage (AKT) — United States' },
    { tz: 'Pacific/Honolulu',         country: 'United States',       label: 'Pacific/Honolulu (HST) — United States' },
    { tz: 'America/Toronto',          country: 'Canada',              label: 'America/Toronto (ET) — Canada' },
    { tz: 'America/Vancouver',        country: 'Canada',              label: 'America/Vancouver (PT) — Canada' },
    { tz: 'America/Mexico_City',      country: 'Mexico',              label: 'America/Mexico_City (CST) — Mexico' },
    { tz: 'America/Bogota',           country: 'Colombia',            label: 'America/Bogota (COT) — Colombia' },
    { tz: 'America/Lima',             country: 'Peru',                label: 'America/Lima (PET) — Peru' },
    { tz: 'America/Caracas',          country: 'Venezuela',           label: 'America/Caracas (VET) — Venezuela' },
    { tz: 'America/Sao_Paulo',        country: 'Brazil',              label: 'America/Sao_Paulo (BRT) — Brazil' },
    { tz: 'America/Argentina/Buenos_Aires', country: 'Argentina',    label: 'America/Buenos_Aires (ART) — Argentina' },
    { tz: 'America/Santiago',         country: 'Chile',               label: 'America/Santiago (CLT) — Chile' },
    // Europe
    { tz: 'Europe/London',            country: 'United Kingdom',      label: 'Europe/London (GMT/BST) — United Kingdom' },
    { tz: 'Europe/Dublin',            country: 'Ireland',             label: 'Europe/Dublin (IST) — Ireland' },
    { tz: 'Europe/Lisbon',            country: 'Portugal',            label: 'Europe/Lisbon (WET) — Portugal' },
    { tz: 'Europe/Paris',             country: 'France',              label: 'Europe/Paris (CET) — France' },
    { tz: 'Europe/Berlin',            country: 'Germany',             label: 'Europe/Berlin (CET) — Germany' },
    { tz: 'Europe/Amsterdam',         country: 'Netherlands',         label: 'Europe/Amsterdam (CET) — Netherlands' },
    { tz: 'Europe/Brussels',          country: 'Belgium',             label: 'Europe/Brussels (CET) — Belgium' },
    { tz: 'Europe/Madrid',            country: 'Spain',               label: 'Europe/Madrid (CET) — Spain' },
    { tz: 'Europe/Rome',              country: 'Italy',               label: 'Europe/Rome (CET) — Italy' },
    { tz: 'Europe/Zurich',            country: 'Switzerland',         label: 'Europe/Zurich (CET) — Switzerland' },
    { tz: 'Europe/Stockholm',         country: 'Sweden',              label: 'Europe/Stockholm (CET) — Sweden' },
    { tz: 'Europe/Oslo',              country: 'Norway',              label: 'Europe/Oslo (CET) — Norway' },
    { tz: 'Europe/Copenhagen',        country: 'Denmark',             label: 'Europe/Copenhagen (CET) — Denmark' },
    { tz: 'Europe/Warsaw',            country: 'Poland',              label: 'Europe/Warsaw (CET) — Poland' },
    { tz: 'Europe/Vienna',            country: 'Austria',             label: 'Europe/Vienna (CET) — Austria' },
    { tz: 'Europe/Prague',            country: 'Czech Republic',      label: 'Europe/Prague (CET) — Czech Republic' },
    { tz: 'Europe/Budapest',          country: 'Hungary',             label: 'Europe/Budapest (CET) — Hungary' },
    { tz: 'Europe/Bucharest',         country: 'Romania',             label: 'Europe/Bucharest (EET) — Romania' },
    { tz: 'Europe/Sofia',             country: 'Bulgaria',            label: 'Europe/Sofia (EET) — Bulgaria' },
    { tz: 'Europe/Athens',            country: 'Greece',              label: 'Europe/Athens (EET) — Greece' },
    { tz: 'Europe/Helsinki',          country: 'Finland',             label: 'Europe/Helsinki (EET) — Finland' },
    { tz: 'Europe/Kyiv',              country: 'Ukraine',             label: 'Europe/Kyiv (EET) — Ukraine' },
    { tz: 'Europe/Istanbul',          country: 'Turkey',              label: 'Europe/Istanbul (TRT) — Turkey' },
    { tz: 'Europe/Moscow',            country: 'Russia',              label: 'Europe/Moscow (MSK) — Russia' },
    // Middle East & Africa
    { tz: 'Asia/Dubai',               country: 'UAE',                 label: 'Asia/Dubai (GST) — UAE' },
    { tz: 'Asia/Riyadh',              country: 'Saudi Arabia',        label: 'Asia/Riyadh (AST) — Saudi Arabia' },
    { tz: 'Asia/Kuwait',              country: 'Kuwait',              label: 'Asia/Kuwait (AST) — Kuwait' },
    { tz: 'Asia/Qatar',               country: 'Qatar',               label: 'Asia/Qatar (AST) — Qatar' },
    { tz: 'Asia/Bahrain',             country: 'Bahrain',             label: 'Asia/Bahrain (AST) — Bahrain' },
    { tz: 'Asia/Muscat',              country: 'Oman',                label: 'Asia/Muscat (GST) — Oman' },
    { tz: 'Asia/Jerusalem',           country: 'Israel',              label: 'Asia/Jerusalem (IST) — Israel' },
    { tz: 'Asia/Beirut',              country: 'Lebanon',             label: 'Asia/Beirut (EET) — Lebanon' },
    { tz: 'Africa/Cairo',             country: 'Egypt',               label: 'Africa/Cairo (EET) — Egypt' },
    { tz: 'Africa/Nairobi',           country: 'Kenya',               label: 'Africa/Nairobi (EAT) — Kenya' },
    { tz: 'Africa/Lagos',             country: 'Nigeria',             label: 'Africa/Lagos (WAT) — Nigeria' },
    { tz: 'Africa/Accra',             country: 'Ghana',               label: 'Africa/Accra (GMT) — Ghana' },
    { tz: 'Africa/Johannesburg',      country: 'South Africa',        label: 'Africa/Johannesburg (SAST) — South Africa' },
    { tz: 'Africa/Casablanca',        country: 'Morocco',             label: 'Africa/Casablanca (WET) — Morocco' },
    { tz: 'Africa/Addis_Ababa',       country: 'Ethiopia',            label: 'Africa/Addis_Ababa (EAT) — Ethiopia' },
    // Asia
    { tz: 'Asia/Kolkata',             country: 'India',               label: 'Asia/Kolkata (IST) — India' },
    { tz: 'Asia/Karachi',             country: 'Pakistan',            label: 'Asia/Karachi (PKT) — Pakistan' },
    { tz: 'Asia/Dhaka',               country: 'Bangladesh',          label: 'Asia/Dhaka (BST) — Bangladesh' },
    { tz: 'Asia/Colombo',             country: 'Sri Lanka',           label: 'Asia/Colombo (IST) — Sri Lanka' },
    { tz: 'Asia/Kathmandu',           country: 'Nepal',               label: 'Asia/Kathmandu (NPT) — Nepal' },
    { tz: 'Asia/Kabul',               country: 'Afghanistan',         label: 'Asia/Kabul (AFT) — Afghanistan' },
    { tz: 'Asia/Tehran',              country: 'Iran',                label: 'Asia/Tehran (IRST) — Iran' },
    { tz: 'Asia/Tashkent',            country: 'Uzbekistan',          label: 'Asia/Tashkent (UZT) — Uzbekistan' },
    { tz: 'Asia/Bangkok',             country: 'Thailand',            label: 'Asia/Bangkok (ICT) — Thailand' },
    { tz: 'Asia/Jakarta',             country: 'Indonesia',           label: 'Asia/Jakarta (WIB) — Indonesia' },
    { tz: 'Asia/Kuala_Lumpur',        country: 'Malaysia',            label: 'Asia/Kuala_Lumpur (MYT) — Malaysia' },
    { tz: 'Asia/Singapore',           country: 'Singapore',           label: 'Asia/Singapore (SGT) — Singapore' },
    { tz: 'Asia/Manila',              country: 'Philippines',         label: 'Asia/Manila (PHT) — Philippines' },
    { tz: 'Asia/Ho_Chi_Minh',         country: 'Vietnam',             label: 'Asia/Ho_Chi_Minh (ICT) — Vietnam' },
    { tz: 'Asia/Yangon',              country: 'Myanmar',             label: 'Asia/Yangon (MMT) — Myanmar' },
    { tz: 'Asia/Phnom_Penh',          country: 'Cambodia',            label: 'Asia/Phnom_Penh (ICT) — Cambodia' },
    { tz: 'Asia/Shanghai',            country: 'China',               label: 'Asia/Shanghai (CST) — China' },
    { tz: 'Asia/Hong_Kong',           country: 'Hong Kong',           label: 'Asia/Hong_Kong (HKT) — Hong Kong' },
    { tz: 'Asia/Taipei',              country: 'Taiwan',              label: 'Asia/Taipei (CST) — Taiwan' },
    { tz: 'Asia/Seoul',               country: 'South Korea',         label: 'Asia/Seoul (KST) — South Korea' },
    { tz: 'Asia/Tokyo',               country: 'Japan',               label: 'Asia/Tokyo (JST) — Japan' },
    // Pacific & Oceania
    { tz: 'Australia/Perth',          country: 'Australia',           label: 'Australia/Perth (AWST) — Australia' },
    { tz: 'Australia/Darwin',         country: 'Australia',           label: 'Australia/Darwin (ACST) — Australia' },
    { tz: 'Australia/Brisbane',       country: 'Australia',           label: 'Australia/Brisbane (AEST) — Australia' },
    { tz: 'Australia/Adelaide',       country: 'Australia',           label: 'Australia/Adelaide (ACDT) — Australia' },
    { tz: 'Australia/Sydney',         country: 'Australia',           label: 'Australia/Sydney (AEDT) — Australia' },
    { tz: 'Pacific/Auckland',         country: 'New Zealand',         label: 'Pacific/Auckland (NZDT) — New Zealand' },
    { tz: 'Pacific/Fiji',             country: 'Fiji',                label: 'Pacific/Fiji (FJT) — Fiji' },
];

export default function WhatsAppSettings() {
    const { showToast } = useUI();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [webhookCopied, setWebhookCopied] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);
    // Public base URL (ngrok or production domain) â€" persisted in localStorage
    const [publicBaseUrl, setPublicBaseUrl] = useState(
        () => localStorage.getItem('publicBaseUrl') || import.meta.env.VITE_API_URL || ''
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
    const [retryTzSearch, setRetryTzSearch] = useState('');
    const [retryTzOpen, setRetryTzOpen] = useState(false);
    const retryTzRef = useRef(null);
    const [offHoursTzSearch, setOffHoursTzSearch] = useState('');
    const [offHoursTzOpen, setOffHoursTzOpen] = useState(false);
    const offHoursTzRef = useRef(null);

    // Config State
    const [profile, setProfile] = useState({
        description: '', about: '', address: '', email: '', websites: [''], vertical: 'OTHER'
    });
    const [automations, setAutomations] = useState({
        welcomeMessage: { enabled: false, text: '' },
        offHoursMessage: {
            enabled: false, text: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            schedule: DAYS.map(d => ({ day: d.value, enabled: true, startTime: '09:00', endTime: '17:00' }))
        },
        retryDelivery: {
            mode: 'always',
            startTime: '09:00',
            endTime: '21:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    });

    useEffect(() => {
        fetchSettings();
        (async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings/webhook-token`);
                setVerifyToken(res.data.verifyToken || '');
            } catch (e) {
                setVerifyToken('Error loading token');
            }
        })();
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (retryTzRef.current && !retryTzRef.current.contains(e.target)) setRetryTzOpen(false);
            if (offHoursTzRef.current && !offHoursTzRef.current.contains(e.target)) setOffHoursTzOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
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
                    },
                    // Opt-Out fields
                    optOutEnabled: wa.optOutEnabled !== false,
                    optOutAck: wa.optOutAck || "You've been unsubscribed from our messages. Reply START to re-subscribe at any time.",
                    optInAck: wa.optInAck || "You've been re-subscribed! You'll receive our messages again. Reply STOP at any time to opt out.",
                    customOptOutKeywords: wa.customOptOutKeywords || [],
                    // Retry delivery window
                    retryDelivery: {
                        mode: wa.retryDelivery?.mode || 'always',
                        startTime: wa.retryDelivery?.startTime || '09:00',
                        endTime: wa.retryDelivery?.endTime || '21:00',
                        timezone: wa.retryDelivery?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
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
            <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark">
                <TopHeader />
                <div className="flex-1 overflow-y-auto w-full hide-scrollbar">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-6 animate-pulse">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
                                    <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                                </div>
                                <div className="space-y-3">
                                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-full" />
                                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader
                title="WhatsApp Settings"
                subtitle="Configure your Meta Business Profile and automations."
            />
            <div className="flex-1 overflow-y-auto w-full hide-scrollbar">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* ── LEFT COLUMN ── Business Profile ───────────────────────────── */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <Info className="w-5 h-5 text-[#25D366]" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Business Profile</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Visible to customers on WhatsApp — syncs live with Meta</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-[#25D366]" />
                            <div className="p-5 md:p-6">
                                <p className="text-xs text-slate-500 mb-5 bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                                    Editing these details will instantly sync and overwrite your public details on WhatsApp. Adhere to Meta's strict formatting limits.
                                </p>

                                <div className="flex items-start gap-5 mb-6">
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
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Profile Photo</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload a JPG or PNG (Max 5MB). Changes push instantly to WhatsApp.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                            <Info className="w-3.5 h-3.5 text-slate-400" /> Description <span className="text-slate-400 font-normal normal-case">(Max 256)</span>
                                        </label>
                                        <textarea
                                            value={profile.description}
                                            onChange={e => setProfile({ ...profile, description: e.target.value.substring(0, 256) })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-20"
                                            placeholder="Welcome to our official business channel..."
                                        />
                                        <div className="text-right text-[10px] text-slate-400 mt-1">{profile.description.length}/256</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                            <Info className="w-3.5 h-3.5 text-slate-400" /> About <span className="text-slate-400 font-normal normal-case">(Max 139)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.about}
                                            onChange={e => setProfile({ ...profile, about: e.target.value.substring(0, 139) })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="Hey there! I am using WhatsApp."
                                        />
                                        <div className="text-right text-[10px] text-slate-400 mt-1">{(profile.about || '').length}/139</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Industry
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
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address <span className="text-slate-400 font-normal normal-case">(Max 256)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.address}
                                            onChange={e => setProfile({ ...profile, address: e.target.value.substring(0, 256) })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="123 Main St, City, Country"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" /> Email <span className="text-slate-400 font-normal normal-case">(Max 128)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={e => setProfile({ ...profile, email: e.target.value.substring(0, 128) })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="support@company.com"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-400" /> Websites <span className="text-slate-400 font-normal normal-case">(Max 2)</span></div>
                                            {profile.websites.length < 2 && (
                                                <button onClick={addWebsite} className="text-xs text-primary hover:underline font-medium">+ Add another</button>
                                            )}
                                        </label>
                                        <div className="space-y-2">
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
                        </div>
                    </section>

                    {/* ── RIGHT COLUMN ── Automated Replies + Broadcast Settings ─────── */}
                    <div className="space-y-8">

                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Automated Replies</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Auto-respond to customers based on timing and keywords</p>
                            </div>
                        </div>
                        <div className="space-y-4">

                            {/* Welcome Message */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                                <div className="p-4 md:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-background-dark/30">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4 text-purple-500" /> Welcome Auto-Reply
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Sent when a customer messages you for the first time in 24 hours.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input type="checkbox" className="sr-only peer" checked={automations.welcomeMessage.enabled}
                                            onChange={e => setAutomations({ ...automations, welcomeMessage: { ...automations.welcomeMessage, enabled: e.target.checked } })} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#25D366]" />
                                    </label>
                                </div>
                                {automations.welcomeMessage.enabled && (
                                    <div className="p-4 md:p-5 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Message Content</label>
                                        <textarea
                                            value={automations.welcomeMessage.text}
                                            onChange={e => setAutomations({ ...automations, welcomeMessage: { ...automations.welcomeMessage, text: e.target.value } })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-none h-24"
                                            placeholder="Hello! Welcome to our store. How can we help you today?"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Off-Hours Message */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                                <div className="p-4 md:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-background-dark/30">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-orange-500" /> Off-Hours Auto-Reply
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Overrides welcome message when customers message outside business hours.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input type="checkbox" className="sr-only peer" checked={automations.offHoursMessage.enabled}
                                            onChange={e => setAutomations({ ...automations, offHoursMessage: { ...automations.offHoursMessage, enabled: e.target.checked } })} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#25D366]" />
                                    </label>
                                </div>
                                {automations.offHoursMessage.enabled && (
                                    <div className="p-4 md:p-5 space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Message Content</label>
                                            <textarea
                                                value={automations.offHoursMessage.text}
                                                onChange={e => setAutomations({ ...automations, offHoursMessage: { ...automations.offHoursMessage, text: e.target.value } })}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none h-20"
                                                placeholder="We are currently away. Our business hours are..."
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                                    <CalendarClock className="w-3.5 h-3.5 text-orange-500" /> Business Hours Scheduler
                                                </label>
                                                <div ref={offHoursTzRef} className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setOffHoursTzOpen(o => !o); setOffHoursTzSearch(''); }}
                                                        className="flex items-center gap-1.5 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-orange-500"
                                                    >
                                                        <span className="max-w-[140px] truncate">
                                                            {TIMEZONES.find(t => t.tz === automations.offHoursMessage.timezone)?.label?.split(' — ')[0] || automations.offHoursMessage.timezone}
                                                        </span>
                                                        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${offHoursTzOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {offHoursTzOpen && (
                                                        <div className="absolute right-0 z-50 mt-1 w-72 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                                                            <div className="p-2 border-b border-slate-100 dark:border-white/5">
                                                                <div className="relative">
                                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                                    <input autoFocus type="text" value={offHoursTzSearch} onChange={e => setOffHoursTzSearch(e.target.value)}
                                                                        placeholder="Search country or timezone…"
                                                                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-orange-500 text-slate-700 dark:text-slate-300" />
                                                                </div>
                                                            </div>
                                                            <ul className="max-h-52 overflow-y-auto py-1">
                                                                {TIMEZONES.filter(t => { const q = offHoursTzSearch.toLowerCase(); return !q || t.label.toLowerCase().includes(q) || t.country.toLowerCase().includes(q) || t.tz.toLowerCase().includes(q); }).map(t => (
                                                                    <li key={t.tz}>
                                                                        <button type="button"
                                                                            onClick={() => { setAutomations({ ...automations, offHoursMessage: { ...automations.offHoursMessage, timezone: t.tz } }); setOffHoursTzOpen(false); }}
                                                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors ${automations.offHoursMessage.timezone === t.tz ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                            {t.label}
                                                                        </button>
                                                                    </li>
                                                                ))}
                                                                {TIMEZONES.filter(t => { const q = offHoursTzSearch.toLowerCase(); return !q || t.label.toLowerCase().includes(q) || t.country.toLowerCase().includes(q) || t.tz.toLowerCase().includes(q); }).length === 0 && (
                                                                    <li className="px-3 py-4 text-xs text-slate-400 text-center">No timezone found</li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {DAYS.map((day) => {
                                                    const config = automations.offHoursMessage.schedule.find(s => s.day === day.value) || { enabled: false, startTime: '09:00', endTime: '17:00' };
                                                    return (
                                                        <div key={day.value} className="flex items-center gap-3 bg-slate-50/50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                                <input type="checkbox" className="sr-only peer" checked={config.enabled}
                                                                    onChange={e => updateSchedule(day.value, 'enabled', e.target.checked)} />
                                                                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-[#25D366]" />
                                                            </label>
                                                            <span className={cn("w-24 text-sm font-medium", config.enabled ? "text-slate-900 dark:text-white" : "text-slate-400")}>{day.label}</span>
                                                            <div className="flex-1 flex gap-2 items-center transition-opacity" style={{ opacity: config.enabled ? 1 : 0.3, pointerEvents: config.enabled ? 'auto' : 'none' }}>
                                                                <input type="time" value={config.startTime} onChange={e => updateSchedule(day.value, 'startTime', e.target.value)}
                                                                    className="flex-1 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-orange-500" />
                                                                <span className="text-slate-400 text-xs">to</span>
                                                                <input type="time" value={config.endTime} onChange={e => updateSchedule(day.value, 'endTime', e.target.value)}
                                                                    className="flex-1 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-orange-500" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Opt-Out Management */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                                <div className="p-4 md:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-background-dark/30">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <BellOff className="w-4 h-4 text-slate-500" /> Opt-Out Management
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Auto-detect unsubscribe keywords and exclude opted-out contacts from broadcasts.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input type="checkbox" className="sr-only peer" checked={automations.optOutEnabled !== false}
                                            onChange={e => setAutomations({ ...automations, optOutEnabled: e.target.checked })} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#25D366]" />
                                    </label>
                                </div>
                                {automations.optOutEnabled !== false && (
                                    <div className="p-4 md:p-5 space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 block">Built-in Opt-Out Keywords</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].map(kw => (
                                                    <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">{kw}</span>
                                                ))}
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-xs font-bold text-green-600 dark:text-green-400">
                                                    <Check className="w-3 h-3" /> Stop promotions <span className="ml-0.5 text-[9px] font-medium opacity-70">(Meta button)</span>
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1.5">These keywords are always active. Contact status flips to Opted Out.</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Custom Opt-Out Keywords <span className="text-slate-400 font-normal normal-case">(Optional)</span></label>
                                            <input type="text"
                                                value={(automations.customOptOutKeywords || []).join(', ')}
                                                onChange={e => setAutomations({ ...automations, customOptOutKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all"
                                                placeholder="e.g. रुको, arret, basta (comma-separated, case-insensitive)"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">Add keywords in any language. Multilingual opt-out support.</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Opt-Out Confirmation</label>
                                            <textarea value={automations.optOutAck || ''}
                                                onChange={e => setAutomations({ ...automations, optOutAck: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all resize-none h-20"
                                                placeholder="You've been unsubscribed. Reply START to re-subscribe." />
                                            <p className="text-[10px] text-slate-400 mt-1">Sent when contact sends STOP. Uses the free 24h conversation window — no template credits used.</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Re-Subscribe Confirmation</label>
                                            <textarea value={automations.optInAck || ''}
                                                onChange={e => setAutomations({ ...automations, optInAck: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all resize-none h-20"
                                                placeholder="You've been re-subscribed! Reply STOP to opt out again." />
                                            <p className="text-[10px] text-slate-400 mt-1">Sent when contact sends START after opting out. Status flips back to Active.</p>
                                        </div>
                                        <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3">
                                            <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-snug">
                                                <span className="font-bold">GDPR &amp; Meta Policy Compliant.</span> Opted-out contacts are permanently excluded from all broadcasts and campaigns.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ── Broadcast Settings ────────────────────────────────────────── */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                <CalendarClock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Broadcast Settings</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Control when failed broadcast messages are retried</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                            <div className="p-4 md:p-5 bg-slate-50/50 dark:bg-background-dark/30 border-b border-slate-100 dark:border-white/5">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" /> Retry Delivery Hours
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Initial sends always fire at scheduled time — this only controls automatic retries.</p>
                            </div>
                            <div className="p-4 md:p-5 space-y-5">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'always',    label: 'Round the Clock', desc: 'Retry anytime, day or night' },
                                        { value: 'scheduled', label: 'Business Hours',   desc: 'Retry only within your set window' }
                                    ].map(opt => (
                                        <button key={opt.value} type="button"
                                            onClick={() => setAutomations({ ...automations, retryDelivery: { ...automations.retryDelivery, mode: opt.value } })}
                                            className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${automations.retryDelivery.mode === opt.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                                        >
                                            <p className={`text-sm font-bold ${automations.retryDelivery.mode === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                                {automations.retryDelivery.mode === 'scheduled' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Timezone</label>
                                            <div ref={retryTzRef} className="relative">
                                                <button type="button"
                                                    onClick={() => { setRetryTzOpen(o => !o); setRetryTzSearch(''); }}
                                                    className="w-full flex items-center justify-between bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 text-left"
                                                >
                                                    <span className="truncate">{TIMEZONES.find(t => t.tz === automations.retryDelivery.timezone)?.label || automations.retryDelivery.timezone}</span>
                                                    <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 text-slate-400 transition-transform ${retryTzOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {retryTzOpen && (
                                                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                                                        <div className="p-2 border-b border-slate-100 dark:border-white/5">
                                                            <div className="relative">
                                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                                <input autoFocus type="text" value={retryTzSearch} onChange={e => setRetryTzSearch(e.target.value)}
                                                                    placeholder="Search country or timezone…"
                                                                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300" />
                                                            </div>
                                                        </div>
                                                        <ul className="max-h-52 overflow-y-auto py-1">
                                                            {TIMEZONES.filter(t => { const q = retryTzSearch.toLowerCase(); return !q || t.label.toLowerCase().includes(q) || t.country.toLowerCase().includes(q) || t.tz.toLowerCase().includes(q); }).map(t => (
                                                                <li key={t.tz}>
                                                                    <button type="button"
                                                                        onClick={() => { setAutomations({ ...automations, retryDelivery: { ...automations.retryDelivery, timezone: t.tz } }); setRetryTzOpen(false); }}
                                                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${automations.retryDelivery.timezone === t.tz ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                        {t.label}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                            {TIMEZONES.filter(t => { const q = retryTzSearch.toLowerCase(); return !q || t.label.toLowerCase().includes(q) || t.country.toLowerCase().includes(q) || t.tz.toLowerCase().includes(q); }).length === 0 && (
                                                                <li className="px-3 py-4 text-xs text-slate-400 text-center">No timezone found</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Delivery Window</label>
                                            <div className="flex items-center gap-3">
                                                <input type="time" value={automations.retryDelivery.startTime}
                                                    onChange={e => setAutomations({ ...automations, retryDelivery: { ...automations.retryDelivery, startTime: e.target.value } })}
                                                    className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500" />
                                                <span className="text-slate-400 text-sm font-medium">to</span>
                                                <input type="time" value={automations.retryDelivery.endTime}
                                                    onChange={e => setAutomations({ ...automations, retryDelivery: { ...automations.retryDelivery, endTime: e.target.value } })}
                                                    className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500" />
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-2">Retries due outside this window are held and fired at the next window open. Scheduled broadcasts still send at their chosen time.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    </div>{/* end right column */}
                    </div>{/* end grid */}
                    <div className="h-4" />
                </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="px-4 py-3 md:px-6 shrink-0 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-slate-200 dark:border-white/5 transition-colors duration-300 z-10 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-6xl mx-auto flex items-center justify-end gap-3">
                    <button
                        onClick={handleSyncProfile}
                        disabled={syncing}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${syncing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Sync from Meta</span>
                        <span className="sm:hidden">Sync</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Save className="w-4 h-4 sm:w-5 sm:h-5" />}
                        <span className="hidden sm:inline">Save Changes</span>
                        <span className="sm:hidden">Save</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

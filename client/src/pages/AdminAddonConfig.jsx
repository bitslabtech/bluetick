import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Save, ArrowLeft, DollarSign, Image, Upload,
    Video, Settings2, FileText, ToggleLeft, ToggleRight,
    Trash2, Link, Youtube, Film, Tag, Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const getCurrencySymbol = (c) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' }[c] || c || '$');

const AdminAddonConfig = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bannerUploading, setBannerUploading] = useState(false);
    const [videoUploading, setVideoUploading] = useState(false);
    const [videoMode, setVideoMode] = useState('youtube'); // 'youtube' or 'upload'
    const bannerInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const [addon, setAddon] = useState({
        name: '',
        description: '',
        shortDescription: '',
        longDescription: '',
        price: 0,
        currency: 'USD',
        isActive: false,
        isRecurring: false,
        recurringInterval: 'month',
        bannerUrl: '',
        demoVideoUrl: '',
        module_key: '',
        features: [],
        badge: ''
    });

    useEffect(() => { fetchAddon(); }, [id]);

    const fetchAddon = async () => {
        try {
            const res = await axios.get('/api/admin/addons', { headers: { Authorization: `Bearer ${token}` } });
            const found = res.data.find(a => a.id == id);
            if (found) {
                setAddon({ ...found, features: found.features || [] });
                // Detect if existing video is a YouTube link
                if (found.demoVideoUrl && (found.demoVideoUrl.includes('youtube') || found.demoVideoUrl.includes('youtu.be'))) {
                    setVideoMode('youtube');
                } else if (found.demoVideoUrl) {
                    setVideoMode('upload');
                }
            } else {
                toast.error('Addon not found');
                navigate('/superadmin/addons');
            }
        } catch (error) {
            console.error('Failed to fetch addon', error);
            toast.error('Failed to load addon details');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`/api/admin/addons/${id}`, addon, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Configuration saved successfully!');
        } catch (error) {
            console.error('Update failed', error);
            toast.error(error.response?.data?.error || 'Failed to update add-on');
        } finally {
            setSaving(false);
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('banner', file);
        setBannerUploading(true);
        try {
            const res = await axios.post(`/api/admin/addons/${id}/upload-banner`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            setAddon(prev => ({ ...prev, bannerUrl: res.data.bannerUrl }));
            toast.success('Banner uploaded and processed!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Banner upload failed');
        } finally {
            setBannerUploading(false);
        }
    };

    const handleVideoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('video', file);
        setVideoUploading(true);
        try {
            const res = await axios.post(`/api/admin/addons/${id}/upload-video`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (p) => {
                    const pct = Math.round((p.loaded * 100) / p.total);
                    toast.loading(`Uploading video: ${pct}%`, { id: 'video-upload' });
                }
            });
            setAddon(prev => ({ ...prev, demoVideoUrl: res.data.demoVideoUrl }));
            toast.success('Video uploaded successfully!', { id: 'video-upload' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Video upload failed', { id: 'video-upload' });
        } finally {
            setVideoUploading(false);
        }
    };

    const removeBanner = () => setAddon(prev => ({ ...prev, bannerUrl: '' }));

    const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm transition-all focus:bg-white dark:focus:bg-gray-800";
    const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";
    const cardClass = "bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden";
    const cardHeaderClass = "px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50";

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/superadmin/addons')}
                        className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <Settings2 className="w-6 h-6 text-indigo-600" />
                            Configure Add-on
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Module: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-indigo-600 text-xs">{addon.module_key}</code>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Main Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* General Info */}
                    <div className={cardClass}>
                        <div className={cardHeaderClass}>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" /> General Information
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className={labelClass}>Display Name</label>
                                <input type="text" value={addon.name || ''} onChange={e => setAddon({ ...addon, name: e.target.value })} className={inputClass} placeholder="e.g. AI Support Bot" />
                            </div>
                            <div>
                                <label className={labelClass}>Short Description <span className="text-gray-400 font-normal">(shown below the title on the detail page)</span></label>
                                <input
                                    type="text"
                                    maxLength={200}
                                    value={addon.shortDescription || ''}
                                    onChange={e => setAddon({ ...addon, shortDescription: e.target.value })}
                                    className={inputClass}
                                    placeholder="A concise one-liner about this add-on (max 200 chars)"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Long Description <span className="text-gray-400 font-normal">(shown below the media, above features)</span></label>
                                <textarea
                                    rows="5"
                                    value={addon.longDescription || ''}
                                    onChange={e => setAddon({ ...addon, longDescription: e.target.value })}
                                    className={inputClass}
                                    placeholder="Detailed explanation of what this add-on does, who it's for, and how it helps..."
                                ></textarea>
                            </div>
                            <div>
                                <label className={labelClass}>Core Features <span className="text-gray-400 font-normal">(one per line)</span></label>
                                <textarea
                                    rows="4"
                                    value={(addon.features || []).join('\n')}
                                    onChange={e => setAddon({ ...addon, features: e.target.value.split('\n') })}
                                    className={`${inputClass} font-mono`}
                                    placeholder={"Feature 1\nFeature 2\nFeature 3"}
                                ></textarea>
                                <p className="text-xs text-gray-400 mt-1">These appear as checked items on the detail page.</p>
                            </div>
                        </div>
                    </div>

                    {/* Media */}
                    <div className={cardClass}>
                        <div className={cardHeaderClass}>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Image className="w-4 h-4 text-purple-500" /> Media
                            </h2>
                        </div>
                        <div className="p-5 space-y-6">

                            {/* Banner Image Upload */}
                            <div>
                                <label className={labelClass}>
                                    <span className="flex items-center gap-1.5"><Image className="w-4 h-4" /> Banner Image</span>
                                </label>
                                {addon.bannerUrl ? (
                                    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video">
                                        <img src={addon.bannerUrl} alt="Banner preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => bannerInputRef.current?.click()}
                                                className="px-4 py-2 bg-white text-gray-900 text-sm font-bold rounded-lg flex items-center gap-2"
                                            >
                                                <Upload className="w-4 h-4" /> Replace
                                            </button>
                                            <button
                                                type="button"
                                                onClick={removeBanner}
                                                className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => bannerInputRef.current?.click()}
                                        disabled={bannerUploading}
                                        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer text-gray-500 dark:text-gray-400 group disabled:opacity-50"
                                    >
                                        {bannerUploading ? (
                                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Upload className="w-10 h-10 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
                                        )}
                                        <span className="text-sm font-semibold">{bannerUploading ? 'Processing image...' : 'Click to upload banner'}</span>
                                        <span className="text-xs text-gray-400">PNG, JPG, WebP — auto-resized to 1920x1080</span>
                                    </button>
                                )}
                                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                            </div>

                            {/* Demo Video */}
                            <div>
                                <label className={labelClass}>
                                    <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> Demo Video</span>
                                </label>
                                {/* Toggle between YouTube link and file upload */}
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setVideoMode('youtube')}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${videoMode === 'youtube' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                    >
                                        <Youtube className="w-4 h-4" /> YouTube Link
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVideoMode('upload')}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${videoMode === 'upload' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                    >
                                        <Film className="w-4 h-4" /> Upload File
                                    </button>
                                </div>

                                {videoMode === 'youtube' ? (
                                    <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-red-400 transition-all">
                                        <span className="flex items-center px-3 bg-gray-100 dark:bg-gray-700 text-gray-500 border-r border-gray-200 dark:border-gray-600">
                                            <Link className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="text"
                                            value={addon.demoVideoUrl || ''}
                                            onChange={e => setAddon({ ...addon, demoVideoUrl: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-sm dark:text-white focus:outline-none"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        {addon.demoVideoUrl && !addon.demoVideoUrl.includes('youtube') ? (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{addon.demoVideoUrl.split('/').pop()}</span>
                                                <button type="button" onClick={() => setAddon(prev => ({ ...prev, demoVideoUrl: '' }))} className="text-red-500 ml-2 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => videoInputRef.current?.click()}
                                                disabled={videoUploading}
                                                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer text-gray-500 disabled:opacity-50"
                                            >
                                                {videoUploading ? <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <Film className="w-9 h-9 text-gray-300 dark:text-gray-600" />}
                                                <span className="text-sm font-semibold">{videoUploading ? 'Uploading...' : 'Click to upload video'}</span>
                                                <span className="text-xs text-gray-400">MP4, MOV, WebM — max 200MB</span>
                                            </button>
                                        )}
                                        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 mt-1.5">Video takes priority over banner image on the detail page.</p>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Right: Sidebar */}
                <div className="space-y-6">

                    {/* Publishing Status */}
                    <div className={cardClass}>
                        <div className={cardHeaderClass}>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ToggleLeft className="w-4 h-4 text-green-500" /> Status
                            </h2>
                        </div>
                        <div className="p-5 space-y-3">
                            <button
                                type="button"
                                onClick={() => setAddon({ ...addon, isActive: !addon.isActive })}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${addon.isActive ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'}`}
                            >
                                <span className={`text-sm font-bold ${addon.isActive ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}`}>
                                    {addon.isActive ? 'Active (Visible in Marketplace)' : 'Inactive (Hidden)'}
                                </span>
                                {addon.isActive ? <ToggleRight className="w-7 h-7 text-green-500" /> : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                            </button>
                        </div>
                    </div>

                    {/* Badge Selection */}
                    <div className={cardClass}>
                        <div className={cardHeaderClass}>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Tag className="w-4 h-4 text-pink-500" /> Promotional Badge
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className={labelClass}>Select Badge</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['', 'New', 'Trending', 'Popular', 'Best Value', 'Limited'].map(b => (
                                        <button
                                            key={b}
                                            type="button"
                                            onClick={() => setAddon({ ...addon, badge: b })}
                                            className={`py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all ${addon.badge === b ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400' : 'border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-200 dark:hover:border-gray-600'}`}
                                        >
                                            {b || 'None'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Custom Badge Name</label>
                                <input
                                    type="text"
                                    value={addon.badge || ''}
                                    onChange={e => setAddon({ ...addon, badge: e.target.value })}
                                    className={inputClass}
                                    placeholder="e.g. Early Bird, Hot"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Select a preset or type a custom name.</p>
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className={cardClass}>
                        <div className={cardHeaderClass}>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-yellow-500" /> Pricing & Billing
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className={labelClass}>Currency</label>
                                <select
                                    value={addon.currency || 'USD'}
                                    onChange={e => setAddon({ ...addon, currency: e.target.value })}
                                    className={inputClass}
                                >
                                    {['USD', 'INR', 'EUR', 'GBP', 'AUD', 'SGD'].map(c => (
                                        <option key={c} value={c}>{getCurrencySymbol(c)} {c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Price</label>
                                <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-indigo-500">
                                    <span className="flex items-center px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm border-r border-gray-200 dark:border-gray-600">
                                        {getCurrencySymbol(addon.currency)}
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={addon.price || 0}
                                        onChange={e => setAddon({ ...addon, price: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 text-sm dark:text-white focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Set 0 for Free</p>
                            </div>
                            <div>
                                <label className={labelClass}>Billing Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAddon({ ...addon, isRecurring: false })}
                                        className={`flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${!addon.isRecurring ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                    >One-time</button>
                                    <button
                                        type="button"
                                        onClick={() => setAddon({ ...addon, isRecurring: true })}
                                        className={`flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${addon.isRecurring ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                    >Recurring</button>
                                </div>
                            </div>
                            {addon.isRecurring && (
                                <div>
                                    <label className={labelClass}>Billing Interval</label>
                                    <div className="flex gap-2">
                                        {['month', 'year'].map(interval => (
                                            <button
                                                key={interval}
                                                type="button"
                                                onClick={() => setAddon({ ...addon, recurringInterval: interval })}
                                                className={`flex-1 py-2 text-sm font-semibold rounded-xl border-2 capitalize transition-all ${addon.recurringInterval === interval ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                            >{interval}ly</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save Button (duplicate for convenience) */}
                    <button
                        type="submit"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminAddonConfig;

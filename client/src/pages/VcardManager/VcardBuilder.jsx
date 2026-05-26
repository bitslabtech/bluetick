import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Save, ArrowLeft, Image as ImageIcon, Link as LinkIcon, Briefcase, MessageSquare, Plus, Trash2, Eye, LayoutTemplate, Share2, Film, Images, Phone, ClipboardList, CalendarCheck, Instagram, Clock, Star, Upload, Youtube, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getThemeComponent } from '../VcardThemes';

export default function VcardBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast, publicSettings } = useUI();

    // Resolve the global currency symbol set by superadmin
    const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$', JPY: '¥', CNY: '¥' };
    const globalCurrencySymbol = CURRENCY_SYMBOLS[publicSettings?.currency] || publicSettings?.currency || '$';
    const { user } = useAuth();

    // Check Limits
    const vcardLimit = user?.planDetails?.vcardLimit || 0;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingHero, setUploadingHero] = useState(false);
    const [whatsappFieldError, setWhatsappFieldError] = useState(false);
    const [uploadingProfile, setUploadingProfile] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingArrayImg, setUploadingArrayImg] = useState({ type: null, index: null });
    const [activeTab, setActiveTab] = useState('basic'); // basic, theme, socials, services, seo

    const [vcard, setVcard] = useState({
        slug: '',
        name: '',
        designation: '',
        company: '',
        bio: '',
        profileImage: '',
        coverImage: '',
        email: '',
        phone: '',
        alternatePhone: '',
        whatsappNumber: '',
        website: '',
        location: '',
        themeId: 'modern-dark',
        primaryColor: '#0ea5e9',
        fontFamily: 'Inter',
        socialLinks: [],
        services: [],
        servicesAutoplay: false,
        products: [],
        testimonials: [],
        businessHours: { monday: { enabled: true, open: '09:00', close: '18:00' }, tuesday: { enabled: true, open: '09:00', close: '18:00' }, wednesday: { enabled: true, open: '09:00', close: '18:00' }, thursday: { enabled: true, open: '09:00', close: '18:00' }, friday: { enabled: true, open: '09:00', close: '18:00' }, saturday: { enabled: false, open: '10:00', close: '14:00' }, sunday: { enabled: false, open: '', close: '' } },
        heroMedia: { type: 'image', url: '', videoType: 'youtube', youtubeId: '', overlay: true },
        gallery: [],
        contactButtons: [],
        enquiryForm: { enabled: false, heading: 'Get In Touch', recipientEmail: '', submitLabel: 'Send Message' },
        booking: { enabled: false, heading: 'Book an Appointment', url: '', buttonLabel: 'Book Now', description: '' },
        instagramPosts: [],
        instagramDisplayStyle: 'slides',
        instagramSlidesPerView: 2,
        instagramAutoplay: true,
        seoTitle: '',
        seoDescription: '',
        showSaveContact: true,
        showWhatsappChat: true,
        status: 'active'
    });

    useEffect(() => {
        if (id) fetchVcard();
    }, [id]);

    const fetchVcard = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards/${id}`);
            setVcard(res.data);
        } catch (err) {
            showToast('Failed to load veCard', 'error');
            navigate('/vcards');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'whatsappNumber') setWhatsappFieldError(false);
        setVcard(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!vcard.slug || !vcard.name) {
            showToast('Slug and Name are required', 'error');
            return;
        }

        try {
            setSaving(true);
            const endpoint = id ? `${import.meta.env.VITE_API_URL}/api/vcards/${id}` : `${import.meta.env.VITE_API_URL}/api/vcards`;
            const method = id ? 'put' : 'post';

            const res = await axios[method](endpoint, vcard);

            showToast(`veCard ${id ? 'updated' : 'created'} successfully!`, 'success');
            if (!id && res.data.id) {
                navigate(`/vcards/builder/${res.data.id}`);
            }
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to save veCard', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleHeroUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingHero(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const endpoint = type === 'image' ? '/api/vcards/upload/hero-image' : '/api/vcards/upload/hero-video';
            const res = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, url: res.data.url } }));
            showToast('Media uploaded successfully!', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || 'Upload failed', 'error');
        } finally {
            setUploadingHero(false);
            e.target.value = null;
        }
    };
    const handleHeroArrayUpload = async (e, idx) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingArrayImg({ type: 'hero', index: idx });
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/vcards/upload/hero-image`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setVcard(p => {
                const urls = p.heroMedia?.urls?.length > 0 ? [...p.heroMedia.urls] : (p.heroMedia?.url ? [p.heroMedia.url] : []);
                urls[idx] = res.data.url;
                return { ...p, heroMedia: { ...p.heroMedia, urls, url: urls[0] || '' } };
            });
            showToast('Image uploaded successfully!', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || 'Upload failed', 'error');
        } finally {
            setUploadingArrayImg({ type: null, index: null });
            e.target.value = null;
        }
    };


    // Upload profile or cover image via the same hero-image endpoint
    const handleImageUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            showToast('Unsupported format. Please upload JPG, PNG, WEBP, or GIF.', 'error');
            e.target.value = null;
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB
            showToast('File size must be less than 5MB.', 'error');
            e.target.value = null;
            return;
        }

        const setSt = field === 'profileImage' ? setUploadingProfile : setUploadingCover;
        setSt(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/vcards/upload/hero-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setVcard(p => ({ ...p, [field]: res.data.url }));
            showToast('Image uploaded successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Upload failed', 'error');
        } finally {
            setSt(false);
            e.target.value = null;
        }
    };

    const handleArrayImageUpload = async (e, arrayName, index, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            showToast('Unsupported format. Please upload JPG, PNG, WEBP, or GIF.', 'error');
            e.target.value = null;
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB
            showToast('File size must be less than 5MB.', 'error');
            e.target.value = null;
            return;
        }

        setUploadingArrayImg({ type: arrayName, index });
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/vcards/upload/hero-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setVcard(p => {
                const arr = [...p[arrayName]];
                arr[index][fieldName] = res.data.url;
                return { ...p, [arrayName]: arr };
            });
            showToast('Image uploaded successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Upload failed', 'error');
        } finally {
            setUploadingArrayImg({ type: null, index: null });
            e.target.value = null;
        }
    };

    // --- Dynamic Arrays Handlers ---
    const addSocial = () => {
        setVcard(prev => ({
            ...prev,
            socialLinks: [...prev.socialLinks, { platform: 'whatsapp', url: '', label: '' }]
        }));
    };

    const updateSocial = (idx, field, val) => {
        const newLinks = [...vcard.socialLinks];
        newLinks[idx][field] = val;
        setVcard({ ...vcard, socialLinks: newLinks });
    };

    const removeSocial = (idx) => {
        setVcard(prev => ({
            ...prev,
            socialLinks: prev.socialLinks.filter((_, i) => i !== idx)
        }));
    };

    const addService = () => {
        setVcard(prev => ({
            ...prev,
            services: [...prev.services, { title: '', description: '', price: '', iconType: 'globe', url: '' }]
        }));
    };

    const updateService = (idx, field, val) => {
        const newServices = [...vcard.services];
        newServices[idx][field] = val;
        setVcard({ ...vcard, services: newServices });
    };

    const removeService = (idx) => {
        setVcard(prev => ({
            ...prev,
            services: prev.services.filter((_, i) => i !== idx)
        }));
    };

    if (loading) return <div className="text-center py-20 text-slate-500">Loading Builder...</div>;

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm animate-in fade-in">

            {/* Left Side: Configuration Panel */}
            <div className="w-full lg:w-[72%] xl:w-[76%] flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/vcards')} className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {id ? 'Edit veCard' : 'Create New veCard'}
                            </h2>
                            <p className="text-xs text-slate-500 font-mono">
                                domain.com/vcard/{vcard.slug || 'slug'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all font-mono"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* Body: Vertical Nav + Content */}
                <div className="flex flex-1 min-h-0">

                    {/* Vertical Sidebar Nav */}
                    <nav className="w-56 flex-shrink-0 flex flex-col gap-1 p-3 border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 overflow-y-auto">
                        {[
                            { key: 'basic', icon: <Briefcase className="w-4 h-4" />, label: 'Basic Details' },
                            { key: 'theme', icon: <LayoutTemplate className="w-4 h-4" />, label: 'Theme & Design' },
                            { key: 'hero', icon: <Film className="w-4 h-4" />, label: 'Hero Media' },
                            { key: 'socials', icon: <Share2 className="w-4 h-4" />, label: 'Social Links' },
                            { key: 'services', icon: <Plus className="w-4 h-4" />, label: 'Services' },
                            { key: 'gallery', icon: <Images className="w-4 h-4" />, label: 'Gallery' },
                            { key: 'testimonials', icon: <Star className="w-4 h-4" />, label: 'Testimonials' },
                            { key: 'hours', icon: <Clock className="w-4 h-4" />, label: 'Business Hours' },
                            { key: 'enquiry', icon: <ClipboardList className="w-4 h-4" />, label: 'Enquiry Form' },
                            { key: 'booking', icon: <CalendarCheck className="w-4 h-4" />, label: 'Booking' },
                            { key: 'instagram', icon: <Instagram className="w-4 h-4" />, label: 'Instagram' },
                            { key: 'seo', icon: <LinkIcon className="w-4 h-4" />, label: 'SEO & Tracking' },
                        ].map(({ key, icon, label }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${activeTab === key
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                            >
                                <span className={activeTab === key ? 'text-white' : 'text-slate-400'}>{icon}</span>
                                {label}
                            </button>
                        ))}
                    </nav>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                        {/* --- BASIC TAB --- */}
                        {activeTab === 'basic' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">

                                {/* ── Profile / Logo Upload ── */}
                                <div className="flex items-center gap-5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10">
                                    {/* Avatar preview */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                                            {vcard.profileImage
                                                ? <img src={vcard.profileImage} className="w-full h-full object-contain p-1" alt="Profile" />
                                                : <div className="flex flex-col items-center gap-1">
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-2xl font-black text-indigo-500">
                                                        {vcard.name ? vcard.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                        {vcard.profileImage && (
                                            <button
                                                onClick={() => setVcard(p => ({ ...p, profileImage: '' }))}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow hover:bg-rose-600 transition-colors"
                                                title="Remove image"
                                            >✕</button>
                                        )}
                                    </div>

                                    {/* Upload controls */}
                                    <div className="flex-1 space-y-2.5">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">Profile / Logo Image</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Appears as your avatar on the veCard. Upload a photo or logo.</p>
                                        </div>
                                        <label className="flex items-center justify-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl px-4 py-2.5 transition-colors w-full shadow-md shadow-indigo-500/20">
                                            <ImageIcon className="w-4 h-4" />
                                            {uploadingProfile ? 'Uploading...' : 'Upload Photo / Logo'}
                                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'profileImage')} className="hidden" disabled={uploadingProfile} />
                                        </label>
                                        <input
                                            type="url"
                                            name="profileImage"
                                            value={vcard.profileImage}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-500 dark:text-slate-400 font-mono"
                                            placeholder="or paste image URL here..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                                        <input type="text" name="name" value={vcard.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white" required placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">URL Slug *</label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm font-mono truncate max-w-[120px] max-w-full">/vcard/</span>
                                            <input type="text" name="slug" value={vcard.slug} onChange={handleChange} className="flex-1 w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-r-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white font-mono" required placeholder="john-doe" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                                        <input type="text" name="designation" value={vcard.designation} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" placeholder="Software Engineer" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company</label>
                                        <input type="text" name="company" value={vcard.company} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" placeholder="Tech Corp" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio / About</label>
                                    <textarea name="bio" value={vcard.bio} onChange={handleChange} rows="3" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none" placeholder="A short bio about yourself..." />
                                </div>

                                <hr className="border-slate-100 dark:border-white/5" />
                                <h3 className="font-bold text-slate-900 dark:text-white">Contact Information</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                                        <input type="text" name="phone" value={vcard.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" placeholder="+1234567890" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alternate Phone</label>
                                        <input type="text" name="alternatePhone" value={vcard.alternatePhone || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" placeholder="+0987654321" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                        <input type="email" name="email" value={vcard.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" placeholder="john@example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number</label>
                                        <input id="whatsapp-number-input" type="text" name="whatsappNumber" value={vcard.whatsappNumber || ''} onChange={handleChange} className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border ${whatsappFieldError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-white/10'} rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white`} placeholder="1234567890" />
                                        {whatsappFieldError && <p className="text-xs text-rose-500 mt-1">Required to enable WhatsApp Chat</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location / Address</label>
                                        <input type="text" name="location" value={vcard.location} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" placeholder="City, Country" />
                                    </div>
                                </div>

                                <hr className="border-slate-100 dark:border-white/5" />

                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10">
                                    <div className="flex-1 pr-4">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Show "Save Contact" Button</p>
                                        <p className="text-xs text-slate-500">Displays a floating button at the bottom of your veCard</p>
                                    </div>
                                    <button onClick={() => setVcard(p => ({ ...p, showSaveContact: p.showSaveContact !== false ? false : true }))} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${vcard.showSaveContact !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${vcard.showSaveContact !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 mt-4">
                                    <div className="flex-1 pr-4">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Show "Chat on WhatsApp" Button</p>
                                        <p className="text-xs text-slate-500">Displays a floating button next to Save Contact</p>
                                    </div>
                                    <button onClick={() => {
                                        if (vcard.showWhatsappChat !== false) {
                                            setVcard(p => ({ ...p, showWhatsappChat: false }));
                                        } else {
                                            if (!vcard.whatsappNumber || vcard.whatsappNumber.trim() === '') {
                                                setWhatsappFieldError(true);
                                                showToast('Please enter a WhatsApp number first', 'error');
                                                const field = document.getElementById('whatsapp-number-input');
                                                if (field) field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            } else {
                                                setVcard(p => ({ ...p, showWhatsappChat: true }));
                                            }
                                        }
                                    }} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${vcard.showWhatsappChat !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${vcard.showWhatsappChat !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- THEME TAB --- */}
                        {activeTab === 'theme' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Choose a Profession Theme</label>
                                    <p className="text-xs text-slate-500 mb-3">Pick the theme that matches your profession — each has its own unique background graphics and style.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            { id: 'corporate-executive', label: 'Corporate / Executive', sub: 'Lawyers, Consultants, Finance', bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', accent: '#c9a84c', emoji: '🏛️' },
                                            { id: 'creative-portfolio', label: 'Creative Portfolio', sub: 'Designers, Artists, Photographers', bg: 'linear-gradient(135deg, #0f0a1e 0%, #2d1b69 100%)', accent: '#a855f7', emoji: '🎨' },
                                            { id: 'tech-startup', label: 'Tech & Startup', sub: 'Developers, Engineers, IT', bg: 'linear-gradient(135deg, #020617 0%, #0c1a2e 100%)', accent: '#06b6d4', emoji: '💻' },
                                            { id: 'health-wellness', label: 'Health & Wellness', sub: 'Doctors, Therapists, Coaches', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', accent: '#10b981', emoji: '🌿' },
                                            { id: 'local-business', label: 'Cafe & Salon', sub: 'Cafes, Salons, Spas', bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', accent: '#f97316', emoji: '☕' },
                                            { id: 'beauty-salon', label: 'Business & Trade', sub: 'Trading, Agencies, Retail', bg: 'linear-gradient(135deg, #faf7f2 0%, #f5ede6 100%)', accent: '#c8a27c', emoji: '🏢' },
                                        ].map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => setVcard(prev => ({ ...prev, themeId: t.id, primaryColor: prev.primaryColor || t.accent }))}
                                                className={`relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${vcard.themeId === t.id ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-200 dark:border-white/10 hover:border-indigo-300'}`}
                                            >
                                                {/* Mini preview bg */}
                                                <div style={{ background: t.bg, height: 72, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>{t.emoji}</span>
                                                    {/* Accent glow dot */}
                                                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 10, height: 10, borderRadius: '50%', background: t.accent, boxShadow: `0 0 8px ${t.accent}` }} />
                                                    {vcard.themeId === t.id && (
                                                        <div style={{ position: 'absolute', top: 6, left: 6, background: '#6366f1', borderRadius: 99, padding: '2px 8px', fontSize: '0.6rem', fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>✓ ACTIVE</div>
                                                    )}
                                                </div>
                                                <div className="p-2.5 bg-white dark:bg-slate-900">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{t.label}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{t.sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Color</label>
                                        <div className="flex gap-2">
                                            <input type="color" name="primaryColor" value={vcard.primaryColor} onChange={handleChange} className="w-12 h-10 rounded cursor-pointer border border-slate-200 p-0.5" />
                                            <input type="text" name="primaryColor" value={vcard.primaryColor} onChange={handleChange} className="flex-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white uppercase font-mono text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Font Family</label>
                                        <select name="fontFamily" value={vcard.fontFamily} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
                                            <option value="Inter">Inter</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Outfit">Outfit</option>
                                            <option value="Poppins">Poppins</option>
                                            <option value="Playfair Display">Playfair Display (Serif)</option>
                                        </select>
                                    </div>
                                </div>



                            </div>
                        )}


                        {/* --- SOCIALS TAB --- */}
                        {activeTab === 'socials' && (
                            <div className="space-y-5 animate-in slide-in-from-right-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Share2 className="w-5 h-5 text-indigo-500" /> 
                                            Social Links
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Connect your audience to your online presence.</p>
                                    </div>
                                    <button onClick={addSocial} className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 w-full sm:w-auto justify-center">
                                        <Plus className="w-4 h-4" /> Add Profile
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {vcard.socialLinks.map((link, idx) => (
                                        <div key={idx} className="group flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all">
                                            <div className="flex-1 flex flex-col sm:flex-row gap-3">
                                                <div className="w-full sm:w-2/5 relative">
                                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                        <Share2 className="w-4 h-4 text-indigo-400" />
                                                    </div>
                                                    <select value={link.platform} onChange={(e) => updateSocial(idx, 'platform', e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                                                        <option value="whatsapp">WhatsApp</option>
                                                        <option value="facebook">Facebook</option>
                                                        <option value="instagram">Instagram</option>
                                                        <option value="linkedin">LinkedIn</option>
                                                        <option value="twitter">X (Twitter)</option>
                                                        <option value="youtube">YouTube</option>
                                                        <option value="tiktok">TikTok</option>
                                                        <option value="github">GitHub</option>
                                                        <option value="pinterest">Pinterest</option>
                                                        <option value="telegram">Telegram</option>
                                                        <option value="website">Website</option>
                                                    </select>
                                                </div>
                                                <div className="relative flex-1">
                                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                        <LinkIcon className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <input type="url" value={link.url} onChange={(e) => updateSocial(idx, 'url', e.target.value)} placeholder="https://..." className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800" />
                                                </div>
                                            </div>
                                            <button onClick={() => removeSocial(idx)} className="flex items-center justify-center p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors sm:self-center">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {vcard.socialLinks.length === 0 && (
                                        <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Share2 className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No social links yet</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Add your social media profiles to help people connect with you across different platforms.</p>
                                            <button onClick={addSocial} className="mt-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                                + Add your first profile
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- SERVICES TAB --- */}
                        {activeTab === 'services' && (
                            <div className="space-y-5 animate-in slide-in-from-right-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-teal-50 to-white dark:from-teal-950/20 dark:to-slate-900 p-5 rounded-2xl border border-teal-100 dark:border-teal-500/20 gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Briefcase className="w-5 h-5 text-teal-500" /> 
                                            Services Offered
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Showcase your professional services and offerings.</p>
                                    </div>
                                    <button onClick={addService} className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-200 dark:shadow-none px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 w-full sm:w-auto justify-center">
                                        <Plus className="w-4 h-4" /> Add Service
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-sm hover:border-teal-300 dark:hover:border-teal-500/50 transition-colors">
                                    <div className="pr-4">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Autoplay Services Slider</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">If your theme uses a slider, automatically cycle through your services.</p>
                                    </div>
                                    <button
                                        onClick={() => setVcard({ ...vcard, servicesAutoplay: !vcard.servicesAutoplay })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${vcard.servicesAutoplay ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${vcard.servicesAutoplay ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {vcard.services.map((service, idx) => (
                                        <div key={idx} className="group bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-teal-300 dark:hover:border-teal-500/50 transition-all relative">
                                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                                <div className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                    Service {idx + 1}
                                                </div>
                                                <button onClick={() => removeService(idx)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-4 mt-2">
                                                {/* Title Input */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Service Title</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                            <Briefcase className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <input type="text" value={service.title} onChange={(e) => updateService(idx, 'title', e.target.value)} placeholder="e.g. Web Development" className="w-full pl-9 pr-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800" />
                                                    </div>
                                                </div>

                                                {/* Description Textarea */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Description</label>
                                                    <div className="relative">
                                                        <div className="absolute top-3 left-3 pointer-events-none">
                                                            <Info className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <textarea value={service.description} onChange={(e) => updateService(idx, 'description', e.target.value)} placeholder="Brief description of what this service includes..." rows="2" className="w-full pl-9 pr-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800 resize-none" />
                                                    </div>
                                                </div>

                                                {/* Price and Link */}
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Price / Tag <span className="text-slate-400 font-normal">(Optional)</span></label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                                                                {globalCurrencySymbol}
                                                            </div>
                                                            <input type="text" value={service.price} onChange={(e) => updateService(idx, 'price', e.target.value)} placeholder={`e.g. ${globalCurrencySymbol}99 or Starting at ${globalCurrencySymbol}50`} className="w-full pl-8 pr-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Redirect Link <span className="text-slate-400 font-normal">(Optional)</span></label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                <LinkIcon className="w-4 h-4 text-slate-400" />
                                                            </div>
                                                            <input type="url" value={service.url} onChange={(e) => updateService(idx, 'url', e.target.value)} placeholder="https://..." className="w-full pl-9 pr-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {vcard.services.length === 0 && (
                                        <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                                            <div className="w-12 h-12 bg-teal-50 dark:bg-teal-500/10 text-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Briefcase className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No services added</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Highlight the products or services you offer to potential clients and customers.</p>
                                            <button onClick={addService} className="mt-4 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                                                + Create your first service
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- HERO MEDIA TAB --- */}
                        {activeTab === 'hero' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Hero Media Setup</h3>
                                    <p className="text-xs text-slate-500 mt-1">Make a stunning first impression by adding a background image or an auto-playing video to the top of your veCard.</p>
                                </div>

                                {/* Media Type Selection Cards */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Choose Background Type</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { type: 'image', icon: <ImageIcon className="w-6 h-6 mb-2" />, label: 'Static Image', desc: 'A beautiful background photo' },
                                            { type: 'video', icon: <Film className="w-6 h-6 mb-2" />, label: 'Dynamic Video', desc: 'Auto-playing looping video' }
                                        ].map(t => (
                                            <div key={t.type} onClick={() => setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, type: t.type } }))}
                                                className={`cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center text-center transition-all ${vcard.heroMedia?.type === t.type ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-white/10 hover:border-indigo-300 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                                {t.icon}
                                                <span className="font-bold text-sm">{t.label}</span>
                                                <span className="text-[10px] mt-1 opacity-70">{t.desc}</span>
                                                {vcard.heroMedia?.type === t.type && (
                                                    <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-[10px] font-bold">✓</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* --- IMAGE UPLOAD UI --- */}
                                {vcard.heroMedia?.type === 'image' && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Hero Images (Slider)</label>
                                            <p className="text-xs text-slate-500 mt-1">Upload up to 3 images. They will be displayed as a beautiful auto-playing slideshow at the top of your veCard. Uncropped preview.</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[0, 1, 2].map(idx => {
                                            const urls = vcard.heroMedia?.urls?.length > 0 ? vcard.heroMedia.urls : (vcard.heroMedia?.url ? [vcard.heroMedia.url] : []);
                                            const currentUrl = urls[idx] || '';

                                            return (
                                                <div key={idx} className="flex flex-col space-y-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Image {idx + 1} {idx === 0 ? '(Primary)' : ''}</span>
                                                        {currentUrl && (
                                                            <button onClick={() => {
                                                                const newUrls = urls.filter((_, i) => i !== idx);
                                                                setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, urls: newUrls, url: newUrls[0] || '' } }));
                                                            }} className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    <div className={`flex-1 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 overflow-hidden bg-slate-50 dark:bg-slate-800 transition-all hover:border-indigo-400 flex items-center justify-center ${currentUrl ? 'p-1' : 'min-h-[120px]'}`}>
                                                        {currentUrl ? (
                                                            <img src={currentUrl} className="w-full h-[120px] object-cover rounded-lg" alt={`Hero ${idx + 1}`} />
                                                        ) : (
                                                            <label className="flex flex-col items-center justify-center h-full w-full cursor-pointer text-center p-4">
                                                                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                                                                    <Upload className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{uploadingArrayImg?.index === idx ? 'Uploading...' : 'Upload Image'}</span>
                                                                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleHeroArrayUpload(e, idx)} disabled={uploadingArrayImg?.index === idx} />
                                                            </label>
                                                        )}
                                                    </div>
                                                    
                                                    {!currentUrl && (
                                                        <div className="mt-auto">
                                                            <div className="flex items-center gap-1.5 mt-2">
                                                                <LinkIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                                <input type="url" value={currentUrl} onChange={e => {
                                                                    const newUrls = [...urls];
                                                                    newUrls[idx] = e.target.value;
                                                                    setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, urls: newUrls, url: newUrls[0] || '' } }));
                                                                }} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-md text-[10px] text-slate-500 focus:ring-1 focus:ring-indigo-500" placeholder="https://..." />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        </div>
                                        
                                        {/* Animation Effect Dropdown */}
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                            <div className="mb-3">
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Slide Transition Effect</label>
                                                <p className="text-xs text-slate-500 mt-1">Select an animation effect. This will only be visible when 2 or more images are uploaded.</p>
                                            </div>
                                            <select
                                                value={vcard.heroMedia?.effect || 'kenburns'}
                                                onChange={(e) => setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, effect: e.target.value } }))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                                            >
                                                <option value="kenburns">Ken Burns (Cinematic Scale & Fade)</option>
                                                <option value="fade">Classic Crossfade</option>
                                                <option value="slideRight">Slide Right (Smooth Motion)</option>
                                                <option value="zoomOut">Zoom Out (Dramatic Depth)</option>
                                                <option value="blurFade">Blur Fade (Modern Reveal)</option>
                                                <option value="splitReveal">Split Reveal (Curtain Zoom)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* --- VIDEO SETUP UI --- */}
                                {vcard.heroMedia?.type === 'video' && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-5">
                                        
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Video Source Type</label>
                                            <div className="flex bg-slate-200 dark:bg-slate-900 p-1 rounded-xl">
                                                {['youtube', 'url'].map(t => (
                                                    <button key={t} onClick={() => setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, videoType: t } }))}
                                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${vcard.heroMedia?.videoType === t ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                                        {t === 'youtube' ? 'YouTube Embed' : 'Direct File Upload'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {vcard.heroMedia?.videoType === 'youtube' ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
                                                        <Youtube className="w-5 h-5" />
                                                    </div>
                                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">YouTube Video ID</label>
                                                </div>
                                                <input type="text" value={vcard.heroMedia?.youtubeId || ''} onChange={e => setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, youtubeId: e.target.value } }))} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white font-mono text-center tracking-widest text-lg" placeholder="dQw4w9WgXcQ" />
                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg flex items-start gap-2">
                                                    <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                                    <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">Extract the 11-character ID from your YouTube link.<br/>Example: youtube.com/watch?v=<span className="font-bold bg-white dark:bg-black/20 px-1 rounded">dQw4w9WgXcQ</span></p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Upload Video File</label>
                                                <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 overflow-hidden bg-white dark:bg-slate-900 transition-all hover:border-indigo-400">
                                                    <label className="flex flex-col items-center justify-center h-32 cursor-pointer text-center p-4 md:p-6">
                                                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                                                            <Upload className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{uploadingHero ? 'Uploading Video...' : 'Click to Browse .mp4 Files'}</span>
                                                        <span className="text-xs text-slate-400 mt-1">Keep it short! Max size: 50MB</span>
                                                        <input type="file" className="hidden" accept="video/mp4,video/webm" onChange={(e) => handleHeroUpload(e, 'video')} disabled={uploadingHero} />
                                                    </label>
                                                </div>
                                                
                                                <div className="relative">
                                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                        <div className="w-full border-t border-slate-200 dark:border-white/10" />
                                                    </div>
                                                    <div className="relative flex justify-center">
                                                        <span className="bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">or paste link</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <LinkIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    <input type="url" value={vcard.heroMedia?.url || ''} onChange={e => setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, url: e.target.value } }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white text-sm" placeholder="https://example.com/video.mp4" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* --- OVERLAY SETTING --- */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 mt-6">
                                    <div className="flex-1 pr-4">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Dark Gradient Overlay</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Applies a dark gradient over your media to make white text and profile pictures pop perfectly.</p>
                                    </div>
                                    <button onClick={() => setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, overlay: p.heroMedia?.overlay !== false ? false : true } }))} 
                                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${vcard.heroMedia?.overlay !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${vcard.heroMedia?.overlay !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* --- FLOATING SPARKLES SETTING --- */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 mt-3">
                                    <div className="flex-1 pr-4">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Floating Ambient Sparkles</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Adds subtle animated sparkles floating over your hero banner.</p>
                                    </div>
                                    <button onClick={() => setVcard(p => ({ ...p, heroMedia: { ...p.heroMedia, floatingSparkles: p.heroMedia?.floatingSparkles === true ? false : true } }))} 
                                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${vcard.heroMedia?.floatingSparkles === true ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${vcard.heroMedia?.floatingSparkles === true ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        )}



                        {/* --- GALLERY TAB --- */}
                        {activeTab === 'gallery' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Photo Gallery</h3>
                                        <p className="text-xs text-slate-500">Upload photos to showcase your portfolio or business.</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Style</label>
                                        <select value={vcard.galleryStyle || 'grid'} onChange={e => setVcard(p => ({ ...p, galleryStyle: e.target.value }))} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm">
                                            <option value="grid">Grid View</option>
                                            <option value="slides">Slideshow</option>
                                        </select>
                                    </div>
                                    {vcard.galleryStyle === 'slides' && (
                                        <>
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Images per View</label>
                                                <select value={vcard.gallerySlidesPerView || 1} onChange={e => setVcard(p => ({ ...p, gallerySlidesPerView: parseInt(e.target.value) }))} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm">
                                                    <option value={1}>1</option>
                                                    <option value={2}>2</option>
                                                    <option value={3}>3</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Autoplay Slideshow</label>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={vcard.galleryAutoplay || false} onChange={e => setVcard(p => ({ ...p, galleryAutoplay: e.target.checked }))} />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {(vcard.gallery || []).map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 group flex flex-col items-center justify-center">
                                            <button onClick={() => setVcard(p => ({ ...p, gallery: p.gallery.filter((_, i) => i !== idx) }))} className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>

                                            {img.url ? (
                                                <>
                                                    <img src={img.url} className="w-full h-full object-cover" alt="" onError={e => e.target.style.display = 'none'} />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <input type="text" value={img.caption} onChange={e => { const g = [...vcard.gallery]; g[idx].caption = e.target.value; setVcard(p => ({ ...p, gallery: g })); }} placeholder="Caption..." className="w-full bg-transparent border-none p-0 text-xs text-white placeholder-white/60 focus:ring-0 text-center font-medium" />
                                                    </div>
                                                </>
                                            ) : (
                                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                                                    {(uploadingArrayImg.type === 'gallery' && uploadingArrayImg.index === idx) ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Uploading</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                                <ImageIcon className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upload</span>
                                                        </>
                                                    )}
                                                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleArrayImageUpload(e, 'gallery', idx, 'url')} disabled={uploadingArrayImg.type === 'gallery' && uploadingArrayImg.index === idx} />
                                                </label>
                                            )}
                                        </div>
                                    ))}

                                    <button onClick={() => setVcard(p => ({ ...p, gallery: [...(p.gallery || []), { url: '', caption: '' }] }))} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-transparent flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 flex items-center justify-center mb-2 transition-colors">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Add Photo</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- TESTIMONIALS TAB --- */}
                        {activeTab === 'testimonials' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">

                                {/* Header */}
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Client Testimonials</h3>
                                        <p className="text-xs text-slate-500">Showcase reviews from happy clients.</p>
                                    </div>
                                    <button onClick={() => setVcard(p => ({ ...p, testimonials: [...(p.testimonials || []), { name: '', company: '', review: '', rating: 5, imageUrl: '' }] }))} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
                                        <Plus className="w-4 h-4" /> Add Review
                                    </button>
                                </div>

                                {/* Slider Settings */}
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 p-4 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                                            <Star className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Slider Settings</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reviews per slide</label>
                                        <div className="flex gap-1.5">
                                            {[1, 2].map(n => (
                                                <button key={n} onClick={() => setVcard(p => ({ ...p, testimonialsPerView: n }))} className={`w-9 h-8 rounded-lg text-sm font-bold transition-all ${(vcard.testimonialsPerView || 1) === n ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-indigo-300'}`}>
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5 border-t border-indigo-100 dark:border-indigo-500/20">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Autoplay Slider</label>
                                            <p className="text-xs text-slate-400">Auto-advances every 4 seconds</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={vcard.testimonialsAutoplay || false} onChange={e => setVcard(p => ({ ...p, testimonialsAutoplay: e.target.checked }))} />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Testimonials List */}
                                <div className="space-y-3">
                                    {(vcard.testimonials || []).map((t, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                                            {/* Card header with avatar and actions */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                                                <div className="flex items-center gap-4">
                                                    {/* Larger Avatar */}
                                                    <div className="relative flex-shrink-0">
                                                        {t.imageUrl
                                                            ? <img src={t.imageUrl} className="w-14 h-14 rounded-full object-cover border-2 border-indigo-100 dark:border-indigo-500/30 shadow-sm" alt="" />
                                                            : <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center text-indigo-400 font-bold text-lg shadow-sm border border-indigo-200 dark:border-indigo-800">{t.name?.charAt(0) || '?'}</div>
                                                        }
                                                    </div>
                                                    
                                                    {/* Explicit Upload Button */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-colors border border-indigo-100 dark:border-indigo-500/20 w-max shadow-sm active:scale-95">
                                                            {(uploadingArrayImg.type === 'testimonials' && uploadingArrayImg.index === idx) ? (
                                                                <>
                                                                    <div className="w-3.5 h-3.5 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                                                                    <span>Uploading...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-3.5 h-3.5" />
                                                                    <span>{t.imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
                                                                </>
                                                            )}
                                                            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleArrayImageUpload(e, 'testimonials', idx, 'imageUrl')} disabled={uploadingArrayImg.type === 'testimonials' && uploadingArrayImg.index === idx} />
                                                        </label>
                                                        {t.imageUrl && (
                                                            <button onClick={() => { const arr = [...vcard.testimonials]; arr[idx].imageUrl = ''; setVcard(p => ({ ...p, testimonials: arr })); }} className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold text-left ml-1 w-max">Remove Image</button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Rating & Delete */}
                                                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
                                                    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <button key={s} onClick={() => { const arr = [...vcard.testimonials]; arr[idx].rating = s; setVcard(p => ({ ...p, testimonials: arr })); }} className={`text-sm leading-none ${s <= t.rating ? 'text-amber-400 drop-shadow-sm' : 'text-slate-300 dark:text-slate-600'} hover:scale-125 transition-transform`} title={`Rate ${s} stars`}>★</button>
                                                        ))}
                                                    </div>
                                                    <button onClick={() => setVcard(p => ({ ...p, testimonials: p.testimonials.filter((_, i) => i !== idx) }))} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50" title="Delete Review">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Fields */}
                                            <div className="p-4 space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">Client Name</label>
                                                        <input type="text" value={t.name} onChange={e => { const arr = [...vcard.testimonials]; arr[idx].name = e.target.value; setVcard(p => ({ ...p, testimonials: arr })); }} placeholder="e.g. John Doe" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-800" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">Company or Role</label>
                                                        <input type="text" value={t.company} onChange={e => { const arr = [...vcard.testimonials]; arr[idx].company = e.target.value; setVcard(p => ({ ...p, testimonials: arr })); }} placeholder="e.g. CEO at TechCorp" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-800" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">The Review</label>
                                                    <textarea value={t.review} onChange={e => { const arr = [...vcard.testimonials]; arr[idx].review = e.target.value; setVcard(p => ({ ...p, testimonials: arr })); }} placeholder="What did they say about your service?" rows="3" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300 resize-none placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-800" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {(!vcard.testimonials || vcard.testimonials.length === 0) && (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                            <Star className="w-6 h-6 text-amber-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No reviews yet</p>
                                        <p className="text-xs text-slate-400 mt-1">Click "Add Review" to get started</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- BUSINESS HOURS TAB --- */}
                        {activeTab === 'hours' && (() => {
                            const DAYS = [
                                { key: 'monday', short: 'Mon' },
                                { key: 'tuesday', short: 'Tue' },
                                { key: 'wednesday', short: 'Wed' },
                                { key: 'thursday', short: 'Thu' },
                                { key: 'friday', short: 'Fri' },
                                { key: 'saturday', short: 'Sat' },
                                { key: 'sunday', short: 'Sun' },
                            ];
                            const getDay = (key) => vcard.businessHours?.[key] || { enabled: false, open: '09:00', close: '18:00' };
                            const setDay = (key, patch) => setVcard(p => ({ ...p, businessHours: { ...p.businessHours, [key]: { ...getDay(key), ...patch } } }));
                            const applyToWeekdays = () => {
                                const mon = getDay('monday');
                                ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(d => setVcard(p => ({ ...p, businessHours: { ...p.businessHours, [d]: { ...mon } } })));
                                showToast('Monday\'s hours applied to Tue – Fri ✓', 'success');
                            };
                            return (
                                <div className="space-y-4 animate-in slide-in-from-right-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Business Hours</h3>
                                        <p className="text-xs text-slate-500">Set your open and close times for each day.</p>
                                    </div>

                                    <div className="space-y-2">
                                        {DAYS.map(({ key, short }) => {
                                            const d = getDay(key);
                                            return (
                                                <div key={key} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${d.enabled ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/10'}`}>
                                                    {/* Toggle */}
                                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                                        <input type="checkbox" className="sr-only peer" checked={!!d.enabled} onChange={e => setDay(key, { enabled: e.target.checked })} />
                                                        <div className="w-8 h-4 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </label>

                                                    {/* Day Label */}
                                                    <span className={`w-8 text-xs font-bold flex-shrink-0 ${d.enabled ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400'}`}>{short}</span>

                                                    {/* Times or Closed badge */}
                                                    {d.enabled ? (
                                                        <div className="flex items-center gap-1.5 flex-1">
                                                            <input type="time" value={d.open || '09:00'} onChange={e => setDay(key, { open: e.target.value })} className="flex-1 min-w-0 px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                                            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">–</span>
                                                            <input type="time" value={d.close || '18:00'} onChange={e => setDay(key, { close: e.target.value })} className="flex-1 min-w-0 px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                                        </div>
                                                    ) : (
                                                        <span className="flex-1 text-xs text-slate-400 italic">Closed</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Quick action: copy Mon-Fri */}
                                    <button onClick={applyToWeekdays} className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-500/40 rounded-xl py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                                        <Clock className="w-3.5 h-3.5" />
                                        Apply Monday's hours to Tue – Fri
                                    </button>
                                </div>
                            );
                        })()}


                        {/* --- ENQUIRY FORM TAB --- */}
                        {activeTab === 'enquiry' && (
                            <div className="space-y-5 animate-in slide-in-from-right-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-violet-50 to-white dark:from-violet-950/20 dark:to-slate-900 p-5 rounded-2xl border border-violet-100 dark:border-violet-500/20 gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <ClipboardList className="w-5 h-5 text-violet-500" /> 
                                            Enquiry Form
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Allow visitors to send you messages directly from your veCard.</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 pr-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide ml-2">
                                            {vcard.enquiryForm?.enabled ? 'Active' : 'Disabled'}
                                        </span>
                                        <button onClick={() => setVcard(p => ({ ...p, enquiryForm: { ...p.enquiryForm, enabled: !p.enquiryForm?.enabled } }))} className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${vcard.enquiryForm?.enabled ? 'bg-violet-600 shadow-md shadow-violet-500/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${vcard.enquiryForm?.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>

                                {vcard.enquiryForm?.enabled ? (
                                    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Form Heading</label>
                                                <input type="text" value={vcard.enquiryForm?.heading || ''} onChange={e => setVcard(p => ({ ...p, enquiryForm: { ...p.enquiryForm, heading: e.target.value } }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-800" placeholder="e.g. Get In Touch" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Button Label</label>
                                                <input type="text" value={vcard.enquiryForm?.submitLabel || ''} onChange={e => setVcard(p => ({ ...p, enquiryForm: { ...p.enquiryForm, submitLabel: e.target.value } }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-800" placeholder="e.g. Send Message" />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-800 dark:text-white">Forward Enquiries via Email</label>
                                                <p className="text-xs text-slate-500 mt-0.5">Automatically send a copy of new enquiries to your email.</p>
                                            </div>
                                            <button 
                                                onClick={() => setVcard(p => ({ ...p, enquiryForm: { ...p.enquiryForm, forwardEmailEnabled: !p.enquiryForm?.forwardEmailEnabled } }))} 
                                                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${vcard.enquiryForm?.forwardEmailEnabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${vcard.enquiryForm?.forwardEmailEnabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {vcard.enquiryForm?.forwardEmailEnabled && (
                                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Forwarding Email</label>
                                                <p className="text-[10px] text-slate-400 ml-1 mb-2">Where should we send the incoming enquiries?</p>
                                                <input type="email" value={vcard.enquiryForm?.recipientEmail || ''} onChange={e => setVcard(p => ({ ...p, enquiryForm: { ...p.enquiryForm, recipientEmail: e.target.value } }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono text-violet-600 dark:text-violet-400 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-800" placeholder="you@example.com" />
                                            </div>
                                        )}

                                        <div className="mt-6 flex items-start gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-500/20 rounded-xl text-sm text-violet-800 dark:text-violet-200">
                                            <Info className="w-5 h-5 flex-shrink-0 text-violet-500 mt-0.5" />
                                            <div className="flex-1">
                                                <span className="font-bold">Form Structure:</span> The generated form will automatically include <span className="font-semibold text-violet-600 dark:text-violet-400">Name, Email, Phone, and Message</span> fields. All submissions are securely emailed directly to your forwarding email address above.
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                                            <ClipboardList className="w-6 h-6 opacity-50" />
                                        </div>
                                        <p className="text-base font-bold text-slate-700 dark:text-slate-300">Form is Disabled</p>
                                        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">Toggle the switch above to enable the enquiry form and allow visitors to contact you directly from your veCard.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- BOOKING TAB --- */}
                        {activeTab === 'booking' && (
                            <div className="space-y-5 animate-in slide-in-from-right-4">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10">
                                    <div className="flex-1 pr-4">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Enable Booking Section</p>
                                        <p className="text-xs text-slate-500">Show an appointment booking block</p>
                                    </div>
                                    <button onClick={() => setVcard(p => ({ ...p, booking: { ...p.booking, enabled: !p.booking?.enabled } }))} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${vcard.booking?.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${vcard.booking?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                {vcard.booking?.enabled && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Section Heading</label>
                                            <input type="text" value={vcard.booking?.heading || ''} onChange={e => setVcard(p => ({ ...p, booking: { ...p.booking, heading: e.target.value } }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white" placeholder="Book an Appointment" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Button Label</label>
                                            <input type="text" value={vcard.booking?.buttonLabel || ''} onChange={e => setVcard(p => ({ ...p, booking: { ...p.booking, buttonLabel: e.target.value } }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white" placeholder="Book Now" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description <span className="text-xs text-slate-400">(optional)</span></label>
                                            <textarea value={vcard.booking?.description || ''} onChange={e => setVcard(p => ({ ...p, booking: { ...p.booking, description: e.target.value } }))} rows="2" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-none text-sm" placeholder="Schedule a free 30-minute consultation..." />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- INSTAGRAM TAB --- */}
                        {activeTab === 'instagram' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Instagram Posts / Reels</h3>
                                        <p className="text-xs text-slate-500">Embed public posts or reels from Instagram.</p>
                                    </div>
                                    <button onClick={() => setVcard(p => ({ ...p, instagramPosts: [...(p.instagramPosts || []), { postUrl: '' }] }))} className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                        <Plus className="w-4 h-4" /> Add Post
                                    </button>
                                </div>

                                {/* Display Settings */}
                                <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-2xl border border-pink-100 dark:border-pink-500/20 p-4 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                                        </div>
                                        <span className="text-sm font-semibold text-pink-900 dark:text-pink-200">Display Settings</span>
                                    </div>

                                    {/* Display Style */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Style</label>
                                        <div className="flex gap-1.5">
                                            {[{ v: 'slides', label: '▶ Slides' }, { v: 'grid', label: '⊞ Grid' }].map(opt => (
                                                <button
                                                    key={opt.v}
                                                    onClick={() => setVcard(p => ({ ...p, instagramDisplayStyle: opt.v }))}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${(vcard.instagramDisplayStyle || 'slides') === opt.v
                                                            ? 'bg-pink-600 text-white shadow-sm shadow-pink-200'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-pink-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Slides-only: per view & autoplay */}
                                    {(vcard.instagramDisplayStyle || 'slides') === 'slides' && (
                                        <>
                                            <div className="flex items-center justify-between pt-2.5 border-t border-pink-100 dark:border-pink-500/20 animate-in fade-in zoom-in-95 duration-200">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Posts per Row</label>
                                                <div className="flex gap-1.5">
                                                    {[1, 2].map(n => (
                                                        <button
                                                            key={n}
                                                            onClick={() => setVcard(p => ({ ...p, instagramSlidesPerView: n }))}
                                                            className={`w-9 h-8 rounded-lg text-sm font-bold transition-all ${(vcard.instagramSlidesPerView || 2) === n
                                                                    ? 'bg-pink-600 text-white shadow-sm shadow-pink-200'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-pink-300'
                                                                }`}
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2.5 border-t border-pink-100 dark:border-pink-500/20 animate-in fade-in zoom-in-95 duration-200">
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Autoplay Slider</label>
                                                    <p className="text-xs text-slate-400">Auto-play after 4s</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={vcard.instagramAutoplay !== false} onChange={e => setVcard(p => ({ ...p, instagramAutoplay: e.target.checked }))} />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-pink-600"></div>
                                                </label>
                                            </div>
                                        </>
                                    )}

                                    {/* Grid info note */}
                                    {(vcard.instagramDisplayStyle || 'slides') === 'grid' && (
                                        <p className="text-xs text-pink-700 dark:text-pink-400 pt-1 border-t border-pink-100 dark:border-pink-500/20">
                                            📐 Shows 2 posts per row. First 4 visible with a "Load More" button for additional posts.
                                        </p>
                                    )}
                                </div>

                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                                    ⚠️ Posts &amp; Reels both supported — paste the full URL (e.g. <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">/p/ABC123/</code> or <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">/reel/ABC123/</code>). Must be <strong>public</strong>.
                                </div>

                                {(vcard.instagramPosts || []).map((post, idx) => (
                                    <div key={idx} className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-white/10 relative">
                                        <button onClick={() => setVcard(p => ({ ...p, instagramPosts: p.instagramPosts.filter((_, i) => i !== idx) }))} className="absolute top-2 right-2 p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">#{idx + 1} Post / Reel URL</label>
                                        <input type="url" value={post.postUrl} onChange={e => { const arr = [...vcard.instagramPosts]; arr[idx].postUrl = e.target.value; setVcard(p => ({ ...p, instagramPosts: arr })); }} placeholder="https://www.instagram.com/p/ABC123/ or /reel/ABC123/" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-mono" />
                                    </div>
                                ))}
                                {(!vcard.instagramPosts || vcard.instagramPosts.length === 0) && <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">No Instagram posts or reels added yet.</div>}
                            </div>
                        )}

                        {/* --- SEO TAB --- */}
                        {activeTab === 'seo' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SEO Title</label>
                                    <input type="text" name="seoTitle" value={vcard.seoTitle} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" placeholder="Page Title for Google" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SEO Description</label>
                                    <textarea name="seoDescription" value={vcard.seoDescription} onChange={handleChange} rows="3" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none" placeholder="Meta description..." />
                                </div>
                                <hr className="border-slate-100 dark:border-white/5" />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Google Analytics ID</label>
                                    <input type="text" name="googleAnalyticsId" value={vcard.googleAnalyticsId} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono text-sm" placeholder="G-XXXXXXXXXX" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Facebook Pixel ID</label>
                                    <input type="text" name="facebookPixelId" value={vcard.facebookPixelId} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono text-sm" placeholder="123456789012345" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>{/* end body flex */}
            </div>

            {/* Right Side: Live Mobile Preview */}
            <div className="hidden lg:flex lg:w-[28%] xl:w-[24%] bg-slate-100 dark:bg-black/40 items-start justify-center p-4 pt-6 relative isolate overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] -z-10" />
                <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-500/10 rounded-full blur-[60px] -z-10" />

                {/* Preview label */}
                <div className="absolute top-3 left-0 right-0 flex justify-center z-20">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Live Preview</span>
                    </div>
                </div>

                {/* Phone frame wrapper */}
                <div className="relative flex-shrink-0" style={{ marginTop: 28 }}>
                    {/* Phone shell */}
                    <div className="relative w-[220px] max-w-full bg-slate-900 rounded-[2.5rem] shadow-2xl border-[3px] border-slate-700 overflow-hidden" style={{ height: 460 }}>
                        {/* Top notch */}
                        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: 16, background: '#0f172a', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, zIndex: 30 }} />
                        {/* Side buttons (decorative) */}
                        <div style={{ position: 'absolute', top: 70, right: -6, width: 4, height: 32, background: '#334155', borderRadius: 2 }} />
                        <div style={{ position: 'absolute', top: 50, left: -6, width: 4, height: 22, background: '#334155', borderRadius: 2 }} />
                        <div style={{ position: 'absolute', top: 80, left: -6, width: 4, height: 22, background: '#334155', borderRadius: 2 }} />

                        {/* Screen — actual theme render, scaled down */}
                        <div
                            className="hide-scrollbar"
                            style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: 430,
                                height: '100vh',
                                transformOrigin: 'top left',
                                transform: `scale(${220 / 430})`,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                pointerEvents: 'none',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                            }}
                        >
                            {(() => {
                                const ThemeComponent = getThemeComponent(vcard.themeId);
                                return <ThemeComponent vcard={vcard} onShare={() => { }} />;
                            })()}
                        </div>
                    </div>

                    {/* Current theme badge */}
                    <div className="mt-3 flex justify-center">
                        <div className="px-3 py-1.5 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-center">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{vcard.themeId?.replace(/-/g, ' ') || 'Select a Theme'}</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

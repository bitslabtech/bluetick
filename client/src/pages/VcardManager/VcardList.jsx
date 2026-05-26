import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Contact, Plus, Eye, Edit, Trash2, Copy, ExternalLink, QrCode } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Nfc } from 'lucide-react';
import NfcStoreModal from '../../components/NfcStoreModal';
import NfcLinkModal from '../../components/NfcLinkModal';

export default function VcardList() {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [vcards, setVcards] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isLinkOpen, setIsLinkOpen] = useState(false);

    const vcardLimit = user?.planDetails?.vcardLimit || 0;

    useEffect(() => {
        fetchVcards();
    }, []);

    const fetchVcards = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards`);
            setVcards(res.data);
        } catch (error) {
            console.error("Error fetching vcards:", error);
            showToast('Failed to load vCards', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, slug) => {
        if (!window.confirm(`Are you sure you want to delete the vCard for ${slug}?`)) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/vcards/${id}`);
            showToast('vCard deleted successfully', 'success');
            setVcards(vcards.filter(v => v.id !== id));
        } catch (err) {
            showToast('Failed to delete vCard', 'error');
        }
    };

    const copyLink = (slug) => {
        const url = `${window.location.origin}/vcard/${slug}`;
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!', 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Contact className="w-6 h-6" />
                        </div>
                        Digital veCards
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Create, manage, and share your advanced digital business cards.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-sm font-medium text-slate-500">
                        Usage: <span className="text-slate-900 dark:text-white font-bold">{vcards.length} / {vcardLimit === 0 ? 'Unlimited' : vcardLimit}</span>
                    </div>
                    {(vcardLimit === 0 || vcards.length < vcardLimit) ? (
                        <Link to="/vcards/builder" className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                            <Plus className="w-5 h-5" />
                            Create New veCard
                        </Link>
                    ) : (
                        <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium rounded-xl cursor-not-allowed">
                            <Plus className="w-5 h-5" />
                            Limit Reached
                        </button>
                    )}
                </div>
            </div>

            {/* NFC Purchase Banner */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-4 md:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl items-center justify-center border border-white/20 shrink-0 shadow-inner">
                            <Nfc className="w-8 h-8 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold mb-2">Elevate your networking with Physical NFC</h3>
                            <p className="text-indigo-200 max-w-xl text-sm sm:text-base">Order premium Metal Cards, PVC Cards, or Keychains. Tap them on any smartphone to instantly share your digital veCard.</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                        <button onClick={() => setIsLinkOpen(true)} className="px-4 md:px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                            <Nfc className="w-4 h-4" /> Link NFC Device
                        </button>
                        <button onClick={() => setIsStoreOpen(true)} className="px-4 md:px-6 py-3 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            Open NFC Store
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-surface-dark p-5 rounded-2xl border border-slate-200 dark:border-white/10 h-64">
                            <Skeleton height={200} borderRadius={12} className="dark:opacity-10" />
                        </div>
                    ))
                ) : vcards.length === 0 ? (
                    <div className="col-span-full py-20 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 text-center">
                        <div className="inline-flex p-4 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-400 mb-4">
                            <Contact className="w-12 h-12" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No veCards Yet</h3>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto">You haven't created any digital business cards yet. Click the button above to build your first one.</p>
                    </div>
                ) : (
                    vcards.map(vcard => (
                        <div key={vcard.id} className="group flex flex-col bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all overflow-hidden relative">
                            {/* Card Status Indicator */}
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${vcard.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30'}`}>
                                    {vcard.status}
                                </span>
                            </div>

                            {/* Card Header (Preview Theme) */}
                            <div className="h-32 bg-slate-100 dark:bg-slate-800 relative select-none">
                                {vcard.coverImage ? (
                                    <img src={vcard.coverImage} className="w-full h-full object-cover" alt="Cover" />
                                ) : (
                                    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${vcard.primaryColor} 0%, rgba(0,0,0,0.8) 100%)` }} />
                                )}
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
                                
                                {/* Profile Picture inside header */}
                                <div className="absolute -bottom-6 left-5 w-14 h-14 rounded-full border-2 border-white dark:border-surface-dark overflow-hidden bg-slate-200 shadow-lg">
                                    {vcard.profileImage ? (
                                        <img src={vcard.profileImage} className="w-full h-full object-cover" alt="Profile" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500 font-bold text-xl">
                                            {vcard.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="flex-1 p-5 pt-8">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{vcard.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{vcard.designation || 'No Designation'}</p>
                                
                                <div className="flex items-center justify-between mt-6 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{vcard.views} Views</span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Theme: <span className="font-medium">{vcard.themeId}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="p-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/20 grid grid-cols-1 md:grid-cols-4 gap-2">
                                <a href={`/vcard/${vcard.slug}`} target="_blank" rel="noreferrer" title="View Public Card" className="flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                <button onClick={() => copyLink(vcard.slug)} title="Copy URL" className="flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                                    <Copy className="w-4 h-4" />
                                </button>
                                <Link to={`/vcards/builder/${vcard.id}`} title="Edit vCard" className="flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                                    <Edit className="w-4 h-4" />
                                </Link>
                                <button onClick={() => handleDelete(vcard.id, vcard.slug)} title="Delete" className="flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <NfcStoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
            <NfcLinkModal isOpen={isLinkOpen} onClose={() => setIsLinkOpen(false)} vcards={vcards} />
        </div>
    );
}

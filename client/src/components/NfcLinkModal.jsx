import React, { useState } from 'react';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import { X, Link2, Nfc } from 'lucide-react';

export default function NfcLinkModal({ isOpen, onClose, vcards = [], onLinked }) {
    const { showToast } = useUI();
    const [shortCode, setShortCode] = useState('');
    const [selectedVcardId, setSelectedVcardId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!shortCode || !selectedVcardId) return;
        setSubmitting(true);
        try {
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/nfc/link`, {
                shortCode,
                vcardId: selectedVcardId
            }, { headers: { 'x-auth-token': localStorage.getItem('token') } });
            
            showToast({ type: 'success', message: 'NFC Device Linked Successfully!' });
            if (onLinked) onLinked(data.card);
            onClose();
        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Failed to link NFC device' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="relative p-6 sm:p-8 border-b border-slate-100 dark:border-white/5">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                        <Nfc className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Link Physical Card</h2>
                    <p className="text-slate-500 text-sm">Enter the 8-character code from your physical NFC card/keychain to link it to your digital vCard.</p>
                </div>

                <div className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">NFC Device Code</label>
                            <input 
                                type="text" 
                                value={shortCode} 
                                onChange={e => setShortCode(e.target.value.toUpperCase())} 
                                placeholder="e.g. A1B2C3D4" 
                                maxLength={8}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-mono font-bold tracking-widest text-lg text-center uppercase" 
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Digital vCard</label>
                            <select 
                                value={selectedVcardId} 
                                onChange={e => setSelectedVcardId(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" 
                                required
                            >
                                <option value="" disabled>-- Choose vCard --</option>
                                {vcards.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.slug})</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="pt-2">
                            <button type="submit" disabled={submitting || !shortCode || !selectedVcardId} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-50">
                                {submitting ? <div className="w-5 h-5 rounded-full border-2 border-indigo-300 border-t-white animate-spin" /> : <Link2 className="w-5 h-5" />}
                                Link Device
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

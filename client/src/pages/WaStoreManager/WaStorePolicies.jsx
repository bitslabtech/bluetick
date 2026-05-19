import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FileText, Save, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStorePolicies() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState({
        termsConditions: '',
        privacyPolicy: '',
        returnPolicy: ''
    });

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                const myStore = res.data.find(s => s.id === id);
                if (myStore) {
                    setForm({
                        termsConditions: myStore.termsConditions || '',
                        privacyPolicy: myStore.privacyPolicy || '',
                        returnPolicy: myStore.returnPolicy || ''
                    });
                }
            } catch (error) {
                toast.error("Failed to load store policies");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [id]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${id}`, form, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            toast.success("Policies updated successfully!");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to save policies");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Store Policies
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Configure your Terms & Conditions, Privacy Policy, and Return Policy. These will be linked in your store footer.</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-sm shadow-indigo-600/20"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Policies
                </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-semibold mb-1">Why are policies important?</p>
                    <p>Clear policies build trust with your customers and can protect you from disputes. If you leave a policy blank, its link will simply not appear in your store's footer.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Terms & Conditions</label>
                    <p className="text-xs text-slate-500 mb-4">The rules and guidelines that users must agree to in order to use your store.</p>
                    <textarea 
                        value={form.termsConditions} 
                        onChange={e => setForm({...form, termsConditions: e.target.value})} 
                        rows={6}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-sm text-slate-900 dark:text-slate-100" 
                        placeholder="Enter your Terms and Conditions here..." 
                    />
                </div>

                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Privacy Policy</label>
                    <p className="text-xs text-slate-500 mb-4">How you collect, use, and protect your customers' personal information.</p>
                    <textarea 
                        value={form.privacyPolicy} 
                        onChange={e => setForm({...form, privacyPolicy: e.target.value})} 
                        rows={6}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-sm text-slate-900 dark:text-slate-100" 
                        placeholder="Enter your Privacy Policy here..." 
                    />
                </div>

                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Return & Refund Policy</label>
                    <p className="text-xs text-slate-500 mb-4">Your rules for accepting returns, issuing refunds, and exchanges.</p>
                    <textarea 
                        value={form.returnPolicy} 
                        onChange={e => setForm({...form, returnPolicy: e.target.value})} 
                        rows={6}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-sm text-slate-900 dark:text-slate-100" 
                        placeholder="Enter your Return Policy here..." 
                    />
                </div>

            </form>
        </div>
    );
}

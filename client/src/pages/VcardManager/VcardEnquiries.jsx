import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardList, CheckCircle, Trash2, Mail, Phone, CalendarClock } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Skeleton from 'react-loading-skeleton';

export default function VcardEnquiries() {
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useUI();

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const fetchEnquiries = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries`);
            // Filter only enquiries
            setEnquiries(res.data.filter(e => e.type === 'enquiry'));
        } catch (err) {
            showToast('Failed to load enquiries', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries/${id}/status`, { status });
            setEnquiries(enquiries.map(e => e.id === id ? { ...e, status } : e));
            showToast(`Marked as ${status}`, 'success');
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const deleteEnquiry = async (id) => {
        if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries/${id}`);
            setEnquiries(enquiries.filter(e => e.id !== id));
            showToast('Enquiry deleted', 'success');
        } catch (err) {
            showToast('Failed to delete', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 text-indigo-600" />
                    Enquiry Management
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Track and manage leads generated from your veCards.</p>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                            <tr>
                                <th className="p-4">Contact Details</th>
                                <th className="p-4">Message</th>
                                <th className="p-4">veCard Source</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td className="p-4"><Skeleton width={120} /></td>
                                        <td className="p-4"><Skeleton width={200} /></td>
                                        <td className="p-4"><Skeleton width={100} /></td>
                                        <td className="p-4"><Skeleton width={80} /></td>
                                        <td className="p-4"><Skeleton width={60} /></td>
                                    </tr>
                                ))
                            ) : enquiries.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400">
                                        No enquiries found. Leads will appear here once someone submits the form on your veCard.
                                    </td>
                                </tr>
                            ) : (
                                enquiries.map((enq) => (
                                    <tr key={enq.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 ${enq.status === 'new' ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                {enq.status === 'new' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                                                {enq.name}
                                            </div>
                                            {enq.email && <div className="text-slate-500 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {enq.email}</div>}
                                            {enq.phone && <div className="text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {enq.phone}</div>}
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={enq.message}>
                                            {enq.message || <span className="text-slate-400 italic">No message</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
                                                {enq.vcardName}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <CalendarClock className="w-4 h-4" />
                                                {new Date(enq.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {enq.status === 'new' ? (
                                                    <button onClick={() => updateStatus(enq.id, 'read')} title="Mark as Read" className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md font-bold">READ</span>
                                                )}
                                                <button onClick={() => deleteEnquiry(enq.id)} title="Delete" className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

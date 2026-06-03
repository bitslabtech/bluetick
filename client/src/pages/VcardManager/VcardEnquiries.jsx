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
                <p className="text-slate-500 dark:text-slate-400 mt-1">Track and manage leads generated from your VeCards.</p>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto sm:overflow-visible">
                    <table className="w-full text-left text-sm block sm:table">
                        <thead className="hidden sm:table-header-group bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                            <tr className="block sm:table-row">
                                <th className="block sm:table-cell p-4">Contact Details</th>
                                <th className="block sm:table-cell p-4">Message</th>
                                <th className="block sm:table-cell p-4">veCard Source</th>
                                <th className="block sm:table-cell p-4">Date</th>
                                <th className="block sm:table-cell p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="block sm:table-row-group divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="block sm:table-row p-4 sm:p-0">
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={120} /></td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={200} /></td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={100} /></td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={80} /></td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={60} /></td>
                                    </tr>
                                ))
                            ) : enquiries.length === 0 ? (
                                <tr className="block sm:table-row">
                                    <td colSpan="5" className="block sm:table-cell p-4 md:p-8 text-center text-slate-400">
                                        No enquiries found. Leads will appear here once someone submits the form on your veCard.
                                    </td>
                                </tr>
                            ) : (
                                enquiries.map((enq) => (
                                    <tr key={enq.id} className={`block sm:table-row hover:bg-slate-50 dark:hover:bg-white/5 p-4 sm:p-0 ${enq.status === 'new' ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                        <td className="block sm:table-cell px-0 sm:px-4 pt-1 sm:py-4 pb-3 sm:pb-4 border-b border-slate-100 dark:border-white/5 sm:border-0">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                {enq.status === 'new' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                                                {enq.name}
                                            </div>
                                            {enq.email && <div className="text-slate-500 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {enq.email}</div>}
                                            {enq.phone && <div className="text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {enq.phone}</div>}
                                        </td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-3 sm:py-4 text-slate-600 dark:text-slate-300 break-words sm:max-w-xs sm:truncate" title={enq.message}>
                                            <span className="sm:hidden text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Message</span>
                                            {enq.message || <span className="text-slate-400 italic">No message</span>}
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-start px-0 sm:px-4 py-2 sm:py-4">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source</span>
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
                                                {enq.vcardName}
                                            </span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-start px-0 sm:px-4 py-2 sm:py-4 text-slate-500 sm:whitespace-nowrap">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</span>
                                            <div className="flex items-center gap-1">
                                                <CalendarClock className="w-4 h-4" />
                                                {new Date(enq.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="block sm:table-cell px-0 sm:px-4 pt-4 sm:py-4 mt-2 sm:mt-0 border-t border-slate-100 dark:border-white/5 sm:border-0">
                                            <div className="flex items-center sm:justify-end gap-2">
                                                {enq.status === 'new' ? (
                                                    <button onClick={() => updateStatus(enq.id, 'read')} title="Mark as Read" className="flex-1 sm:flex-none p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 sm:bg-transparent rounded-lg flex items-center justify-center gap-2 transition-colors">
                                                        <CheckCircle className="w-4 h-4" /> <span className="sm:hidden font-medium text-sm">Mark Read</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 sm:flex-none flex items-center justify-center sm:justify-end">
                                                        <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 sm:px-2 sm:py-1 rounded-md font-bold text-center w-full sm:w-auto">READ</span>
                                                    </div>
                                                )}
                                                <button onClick={() => deleteEnquiry(enq.id)} title="Delete" className="flex-1 sm:flex-none p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 sm:bg-transparent rounded-lg flex items-center justify-center gap-2 transition-colors">
                                                    <Trash2 className="w-4 h-4" /> <span className="sm:hidden font-medium text-sm">Delete</span>
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

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CalendarCheck, CheckCircle, Trash2, Mail, Phone, CalendarClock } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Skeleton from 'react-loading-skeleton';

export default function VcardBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useUI();

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries`);
            // Filter only bookings
            setBookings(res.data.filter(e => e.type === 'booking'));
        } catch (err) {
            showToast('Failed to load bookings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries/${id}/status`, { status });
            setBookings(bookings.map(e => e.id === id ? { ...e, status } : e));
            showToast(`Marked as ${status}`, 'success');
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const deleteBooking = async (id) => {
        if (!window.confirm('Are you sure you want to delete this booking request?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries/${id}`);
            setBookings(bookings.filter(e => e.id !== id));
            showToast('Booking deleted', 'success');
        } catch (err) {
            showToast('Failed to delete', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <CalendarCheck className="w-6 h-6 text-indigo-600" />
                    Booking Requests
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Manage native appointment requests generated from your VeCards.</p>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto sm:overflow-visible">
                    <table className="w-full text-left text-sm block sm:table">
                        <thead className="hidden sm:table-header-group bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                            <tr className="block sm:table-row">
                                <th className="block sm:table-cell p-4">Client Details</th>
                                <th className="block sm:table-cell p-4">Requested Date/Time</th>
                                <th className="block sm:table-cell p-4">Notes</th>
                                <th className="block sm:table-cell p-4">veCard Source</th>
                                <th className="block sm:table-cell p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="block sm:table-row-group divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="block sm:table-row p-4 sm:p-0">
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={120} /></td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={150} /></td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={200} /></td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={100} /></td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-2 sm:py-4"><Skeleton width={60} /></td>
                                    </tr>
                                ))
                            ) : bookings.length === 0 ? (
                                <tr className="block sm:table-row">
                                    <td colSpan="5" className="block sm:table-cell p-4 md:p-8 text-center text-slate-400">
                                        No booking requests found. When visitors use your veCard native booking form, requests will appear here.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking.id} className={`block sm:table-row hover:bg-slate-50 dark:hover:bg-white/5 p-4 sm:p-0 ${booking.status === 'new' ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                        <td className="block sm:table-cell px-0 sm:px-4 pt-1 sm:py-4 pb-3 sm:pb-4 border-b border-slate-100 dark:border-white/5 sm:border-0">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                {booking.status === 'new' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                                                {booking.name}
                                            </div>
                                            {booking.email && <div className="text-slate-500 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {booking.email}</div>}
                                            {booking.phone && <div className="text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {booking.phone}</div>}
                                        </td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-3 sm:py-4 font-bold text-indigo-600 dark:text-indigo-400 sm:whitespace-nowrap">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Requested Time</span>
                                            {booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-3 sm:py-4 text-slate-600 dark:text-slate-300 break-words sm:max-w-xs sm:truncate" title={booking.message}>
                                            <span className="sm:hidden text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Notes</span>
                                            {booking.message || <span className="text-slate-400 italic">-</span>}
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-start px-0 sm:px-4 py-2 sm:py-4">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source</span>
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
                                                {booking.vcardName}
                                            </span>
                                        </td>
                                        <td className="block sm:table-cell px-0 sm:px-4 pt-4 sm:py-4 mt-2 sm:mt-0 border-t border-slate-100 dark:border-white/5 sm:border-0">
                                            <div className="flex items-center sm:justify-end gap-2">
                                                {booking.status === 'new' ? (
                                                    <button onClick={() => updateStatus(booking.id, 'read')} title="Mark as Reviewed" className="flex-1 sm:flex-none p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 sm:bg-transparent rounded-lg flex items-center justify-center gap-2 transition-colors">
                                                        <CheckCircle className="w-4 h-4" /> <span className="sm:hidden font-medium text-sm">Review</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 sm:flex-none flex items-center justify-center sm:justify-end">
                                                        <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 sm:px-2 sm:py-1 rounded-md font-bold text-center w-full sm:w-auto">REVIEWED</span>
                                                    </div>
                                                )}
                                                <button onClick={() => deleteBooking(booking.id)} title="Delete" className="flex-1 sm:flex-none p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 sm:bg-transparent rounded-lg flex items-center justify-center gap-2 transition-colors">
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

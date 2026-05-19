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
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
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
            await axios.put(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries/${id}/status`, { status }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setBookings(bookings.map(e => e.id === id ? { ...e, status } : e));
            showToast(`Marked as ${status}`, 'success');
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const deleteBooking = async (id) => {
        if (!window.confirm('Are you sure you want to delete this booking request?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries/${id}`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
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
                <p className="text-slate-500 dark:text-slate-400 mt-1">Manage native appointment requests generated from your veCards.</p>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                            <tr>
                                <th className="p-4">Client Details</th>
                                <th className="p-4">Requested Date/Time</th>
                                <th className="p-4">Notes</th>
                                <th className="p-4">veCard Source</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td className="p-4"><Skeleton width={120} /></td>
                                        <td className="p-4"><Skeleton width={150} /></td>
                                        <td className="p-4"><Skeleton width={200} /></td>
                                        <td className="p-4"><Skeleton width={100} /></td>
                                        <td className="p-4"><Skeleton width={60} /></td>
                                    </tr>
                                ))
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400">
                                        No booking requests found. When visitors use your veCard native booking form, requests will appear here.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 ${booking.status === 'new' ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                {booking.status === 'new' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                                                {booking.name}
                                            </div>
                                            {booking.email && <div className="text-slate-500 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {booking.email}</div>}
                                            {booking.phone && <div className="text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {booking.phone}</div>}
                                        </td>
                                        <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                            {booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={booking.message}>
                                            {booking.message || <span className="text-slate-400 italic">-</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
                                                {booking.vcardName}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {booking.status === 'new' ? (
                                                    <button onClick={() => updateStatus(booking.id, 'read')} title="Mark as Reviewed" className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md font-bold">REVIEWED</span>
                                                )}
                                                <button onClick={() => deleteBooking(booking.id)} title="Delete" className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
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

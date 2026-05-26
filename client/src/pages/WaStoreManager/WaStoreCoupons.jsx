import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Ticket, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStoreCoupons() {
    const { id: storeId } = useParams();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderValue: '',
        isActive: true,
        expiresAt: ''
    });

    const fetchCoupons = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/coupons`);
            setCoupons(res.data);
        } catch (error) {
            toast.error('Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, [storeId]);

    const handleCreate = async (e) => {
        e.preventDefault();

        // Client-side validation
        if (!form.code.trim()) {
            toast.error('Coupon code is required');
            return;
        }
        if (!form.discountValue || parseFloat(form.discountValue) <= 0) {
            toast.error('Discount value must be greater than 0');
            return;
        }

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/coupons`, {
                code: form.code.trim().toUpperCase(),
                discountType: form.discountType,
                discountValue: parseFloat(form.discountValue),
                minOrderValue: form.minOrderValue !== '' ? parseFloat(form.minOrderValue) : 0,
                isActive: form.isActive,
                expiresAt: form.expiresAt || null
            });
            toast.success('Coupon created successfully');
            setShowModal(false);
            setForm({ code: '', discountType: 'percentage', discountValue: '', minOrderValue: '', isActive: true, expiresAt: '' });
            fetchCoupons();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create coupon');
        }
    };

    const handleDelete = async (couponId) => {
        if (!window.confirm('Are you sure you want to delete this coupon?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/coupons/${couponId}`);
            toast.success('Coupon deleted');
            fetchCoupons();
        } catch (error) {
            toast.error('Failed to delete coupon');
        }
    };

    const handleToggleActive = async (coupon) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/coupons/${coupon.id}`, {
                isActive: !coupon.isActive
            });
            toast.success(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'}`);
            setCoupons(coupons.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div>;

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-indigo-500" /> Promo Codes
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Create discount codes for your customers to use at checkout.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Create Coupon
                </button>
            </div>

            {coupons.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                    <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-900">No active promo codes</h3>
                    <p className="text-slate-500 mt-1">Create your first discount to attract more sales!</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 md:px-6 py-4 font-medium text-slate-500">Code</th>
                                <th className="px-4 md:px-6 py-4 font-medium text-slate-500">Discount</th>
                                <th className="px-4 md:px-6 py-4 font-medium text-slate-500">Min Order</th>
                                <th className="px-4 md:px-6 py-4 font-medium text-slate-500">Status</th>
                                <th className="px-4 md:px-6 py-4 font-medium text-slate-500">Expiry</th>
                                <th className="px-4 md:px-6 py-4 font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {coupons.map(coupon => (
                                <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 md:px-6 py-4">
                                        <span className="font-bold font-mono px-2 py-1 bg-slate-100 rounded text-slate-800">
                                            {coupon.code}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 font-medium">
                                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `Fixed: ${coupon.discountValue}`}
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-slate-500">
                                        {coupon.minOrderValue ? `> ${coupon.minOrderValue}` : 'None'}
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <button 
                                            onClick={() => handleToggleActive(coupon)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${coupon.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                            title={coupon.isActive ? 'Click to deactivate' : 'Click to activate'}
                                        >
                                            <span className={`${coupon.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                        </button>
                                        <span className="ml-2 text-xs font-medium text-slate-500">
                                            {coupon.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-slate-500">
                                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(coupon.id)} className="text-slate-400 hover:text-rose-500 p-2">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-lg">Create Promo Code</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-4 md:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Coupon Code</label>
                                <input required type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg uppercase" placeholder="e.g. SUMMER50" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Discount Value</label>
                                    <input required type="number" step="0.01" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="10" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Min Order Value (Optional)</label>
                                <input type="number" step="0.01" value={form.minOrderValue} onChange={e => setForm({...form, minOrderValue: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Expiry Date (Optional)</label>
                                <input type="date" value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 font-medium">Cancel</button>
                                <button type="submit" className="px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

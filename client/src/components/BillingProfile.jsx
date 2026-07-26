/**
 * BillingProfile.jsx
 * ───────────────────────────────────────────────────────────────────────────
 * Shared component for user billing/GST profile editing.
 * Used in: Billing.jsx (sidebar), Settings.jsx (dedicated tab), Checkout.jsx (collapsible).
 *
 * Saves to: PATCH /api/users/billing-profile
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const INDIAN_STATES = [
    { name: 'Andaman and Nicobar Islands', code: '35' },
    { name: 'Andhra Pradesh', code: '28' },
    { name: 'Arunachal Pradesh', code: '12' },
    { name: 'Assam', code: '18' },
    { name: 'Bihar', code: '10' },
    { name: 'Chandigarh', code: '04' },
    { name: 'Chhattisgarh', code: '22' },
    { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
    { name: 'Delhi', code: '07' },
    { name: 'Goa', code: '30' },
    { name: 'Gujarat', code: '24' },
    { name: 'Haryana', code: '06' },
    { name: 'Himachal Pradesh', code: '02' },
    { name: 'Jammu and Kashmir', code: '01' },
    { name: 'Jharkhand', code: '20' },
    { name: 'Karnataka', code: '29' },
    { name: 'Kerala', code: '32' },
    { name: 'Ladakh', code: '38' },
    { name: 'Lakshadweep', code: '31' },
    { name: 'Madhya Pradesh', code: '23' },
    { name: 'Maharashtra', code: '27' },
    { name: 'Manipur', code: '14' },
    { name: 'Meghalaya', code: '17' },
    { name: 'Mizoram', code: '15' },
    { name: 'Nagaland', code: '13' },
    { name: 'Odisha', code: '21' },
    { name: 'Puducherry', code: '34' },
    { name: 'Punjab', code: '03' },
    { name: 'Rajasthan', code: '08' },
    { name: 'Sikkim', code: '11' },
    { name: 'Tamil Nadu', code: '33' },
    { name: 'Telangana', code: '36' },
    { name: 'Tripura', code: '16' },
    { name: 'Uttar Pradesh', code: '09' },
    { name: 'Uttarakhand', code: '05' },
    { name: 'West Bengal', code: '19' }
];

/**
 * @param {object}   props
 * @param {boolean}  props.compact   — If true: render a compact collapsible card (for checkout)
 * @param {function} props.onSaved   — Optional callback after save
 */
export default function BillingProfile({ compact = false, onSaved }) {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const [form, setForm] = useState({
        company: '',
        gstin: '',
        pan: '',
        address: '',
        state: '',
        stateCode: '',
        country: 'India',
        pincode: '',
        phone: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [collapsed, setCollapsed] = useState(compact);

    useEffect(() => {
        axios.get(`${API_BASE}/api/auth/billing-profile`)
            .then(r => {
                if (r.data?.billingProfile) {
                    setForm(prev => ({ ...prev, ...r.data.billingProfile }));
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const update = (key, val) => {
        setForm(f => ({ ...f, [key]: val }));
        if (key === 'state') {
            const stateObj = INDIAN_STATES.find(s => s.name === val);
            setForm(f => ({ ...f, state: val, stateCode: stateObj?.code || '' }));
        }
        setSaved(false);
    };

    const handleSave = async () => {
        const required = ['company', 'gstin', 'address', 'state', 'country', 'pincode'];
        for (const reqField of required) {
            if (!form[reqField] || !String(form[reqField]).trim()) {
                const label = reqField === 'company' ? 'Business Name' : reqField === 'gstin' ? 'GSTIN' : reqField;
                setError(`Please provide your ${label} to save billing details.`);
                return;
            }
        }

        setSaving(true);
        setError('');
        try {
            await axios.patch(`${API_BASE}/api/auth/billing-profile`, { billingProfile: form });
            setSaved(true);
            onSaved && onSaved(form);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save billing profile.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-black/20 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all";
    const labelCls = "block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1";

    if (loading) return <div className="text-slate-400 text-sm py-4 text-center">Loading billing profile…</div>;

    // ── Compact / Collapsible Mode (for Checkout) ─────────────────────────────
    if (compact) {
        return (
            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => setCollapsed(c => !c)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🧾</span>
                        <div>
                            <div className="font-semibold text-sm text-slate-800 dark:text-white">Add GST Details</div>
                            <div className="text-xs text-slate-500">Fill your business details for GST invoice</div>
                        </div>
                    </div>
                    <span className="text-slate-400 text-lg">{collapsed ? '▸' : '▾'}</span>
                </button>

                {!collapsed && (
                    <div className="p-4 space-y-3 bg-white dark:bg-surface-dark">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className={labelCls}>Business Name <span className="text-red-500">*</span></label>
                                <input value={form.company} onChange={e => update('company', e.target.value)} className={inputCls} placeholder="Your Company Pvt. Ltd." />
                            </div>
                            <div>
                                <label className={labelCls}>GSTIN <span className="text-red-500">*</span></label>
                                <input value={form.gstin} onChange={e => update('gstin', e.target.value.toUpperCase())} className={inputCls} placeholder="22AABCC1234F1Z5" maxLength={15} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>Billing Address <span className="text-red-500">*</span></label>
                                <textarea value={form.address} onChange={e => update('address', e.target.value)} className={inputCls + ' resize-none'} rows={2} placeholder="Street, City" />
                            </div>
                            <div>
                                <label className={labelCls}>State <span className="text-red-500">*</span></label>
                                <select value={form.state} onChange={e => update('state', e.target.value)} className={inputCls}>
                                    <option value="">Select…</option>
                                    {INDIAN_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Pincode <span className="text-red-500">*</span></label>
                                <input value={form.pincode} onChange={e => update('pincode', e.target.value)} className={inputCls} placeholder="500001" maxLength={6} />
                            </div>
                        </div>
                        <button onClick={handleSave} disabled={saving} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors">
                            {saving ? 'Saving…' : saved ? '✅ GST Details Saved' : 'Save GST Details'}
                        </button>
                        {error && <p className="text-xs text-red-500">{error}</p>}
                    </div>
                )}
            </div>
        );
    }

    // ── Full Mode (for Billing page / Settings) ────────────────────────────────
    return (
        <div className="space-y-4">
            <div>
                <label className={labelCls}>Business / Company Name <span className="text-red-500">*</span></label>
                <input id="bp-company" value={form.company} onChange={e => update('company', e.target.value)} className={inputCls} placeholder="Your Company Pvt. Ltd." />
            </div>
            <div>
                <label className={labelCls}>GSTIN <span className="text-red-500">*</span></label>
                <input id="bp-gstin" value={form.gstin} onChange={e => update('gstin', e.target.value.toUpperCase())} className={inputCls} placeholder="22AABCC1234F1Z5" maxLength={15} />
                <p className="text-xs text-slate-400 mt-1">15-character GST Identification Number</p>
            </div>
            <div>
                <label className={labelCls}>Billing Phone</label>
                <input id="bp-phone" value={form.phone} onChange={e => update('phone', e.target.value)} className={inputCls} placeholder="+91 9876543210" />
            </div>
            <div>
                <label className={labelCls}>Billing Address <span className="text-red-500">*</span></label>
                <textarea id="bp-address" value={form.address} onChange={e => update('address', e.target.value)} className={inputCls + ' resize-none'} rows={3} placeholder="Flat no, Building, Street, City" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>State <span className="text-red-500">*</span></label>
                    <select id="bp-state" value={form.state} onChange={e => update('state', e.target.value)} className={inputCls}>
                        <option value="">Select…</option>
                        {INDIAN_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Country <span className="text-red-500">*</span></label>
                    <select id="bp-country" value={form.country} onChange={e => update('country', e.target.value)} className={inputCls}>
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Canada">Canada</option>
                        <option value="Singapore">Singapore</option>
                        <option value="UAE">UAE</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Pincode <span className="text-red-500">*</span></label>
                    <input id="bp-pincode" value={form.pincode} onChange={e => update('pincode', e.target.value)} className={inputCls} placeholder="500001" maxLength={6} />
                </div>
                <div>
                    <label className={labelCls}>State Code</label>
                    <input value={form.stateCode} readOnly className={inputCls + ' bg-slate-50 dark:bg-white/5 cursor-not-allowed'} placeholder="Auto-filled" />
                </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
            {saved && <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">✅ Billing profile saved successfully!</p>}

            <button
                id="billing-profile-save"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
                {saving ? 'Saving…' : 'Save Billing Details'}
            </button>
        </div>
    );
}

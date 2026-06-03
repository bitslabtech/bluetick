import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Settings, Trash2, AlertTriangle, BarChart2, Eye, Globe, Info, ChevronDown, ChevronUp, LayoutGrid, Smartphone, Monitor, ShoppingBag, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStoreSettings() {
    const { storeId } = useOutletContext();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [savingDomain, setSavingDomain] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [customDomain, setCustomDomain] = useState('');
    const [showDnsInstructions, setShowDnsInstructions] = useState(false);
    const [gridColumns, setGridColumns] = useState({ desktop: 4, mobile: 2 });
    const [savingGrid, setSavingGrid] = useState(false);

    const [checkoutMode, setCheckoutMode] = useState('whatsapp');
    const [paymentProvider, setPaymentProvider] = useState('');
    const [paymentConfig, setPaymentConfig] = useState({ razorpayKeyId: '', razorpayKeySecret: '', phonepeMerchantId: '', phonepeSaltKey: '', phonepeSaltIndex: '1' });
    const [savingCheckout, setSavingCheckout] = useState(false);

    const [taxConfig, setTaxConfig] = useState({ enabled: false, type: 'gst', rate: 0, autoGenerateBill: false, autoSendWhatsApp: false });
    const [savingTax, setSavingTax] = useState(false);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
                if (myStore?.customDomain) setCustomDomain(myStore.customDomain);
                if (myStore?.gridColumns) setGridColumns(myStore.gridColumns);
                if (myStore?.checkoutMode) setCheckoutMode(myStore.checkoutMode);
                if (myStore?.paymentProvider) setPaymentProvider(myStore.paymentProvider);
                if (myStore?.paymentConfig) setPaymentConfig(prev => ({ ...prev, ...myStore.paymentConfig }));
                if (myStore?.taxConfig) setTaxConfig(prev => ({ ...prev, ...myStore.taxConfig }));
            } catch (error) {
                toast.error('Failed to load store settings');
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [storeId]);

    const handleDelete = async () => {
        if (confirmText !== store.name) {
            toast.error('Store name does not match. Please type it exactly.');
            return;
        }
        setDeleting(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`);
            toast.success('Store deleted successfully.');
            navigate('/wastore');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete store');
        } finally {
            setDeleting(false);
        }
    };

    const handleSaveDomain = async () => {
        setSavingDomain(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                customDomain: customDomain
            });
            toast.success('Custom domain updated successfully.');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update custom domain');
        } finally {
            setSavingDomain(false);
        }
    };

    const handleSaveGrid = async () => {
        setSavingGrid(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                gridColumns
            });
            toast.success('Grid layout saved!');
        } catch (error) {
            toast.error('Failed to save grid layout');
        } finally {
            setSavingGrid(false);
        }
    };

    const handleSaveCheckout = async () => {
        setSavingCheckout(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                checkoutMode, paymentProvider, paymentConfig
            });
            toast.success('Checkout settings saved!');
        } catch (error) {
            toast.error('Failed to save checkout settings');
        } finally {
            setSavingCheckout(false);
        }
    };

    const handleSaveTax = async () => {
        setSavingTax(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                taxConfig
            });
            toast.success('Tax settings saved!');
        } catch (error) {
            toast.error('Failed to save tax settings');
        } finally {
            setSavingTax(false);
        }
    };

    if (loading || !store) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
    );

    return (
        <div className="max-w-2xl space-y-6 pb-7 sm:pb-20">
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    Store Settings
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Advanced settings and administrative controls for your store.
                </p>
            </div>

            {/* Store Stats Card */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-indigo-400" /> Store Overview
                    </h3>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{store.views ?? 0}</div>
                        <div className="text-xs text-slate-500 font-medium mt-1 flex items-center justify-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> Total Views
                        </div>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl font-black ${store.isActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {store.isActive ? 'Live' : 'Draft'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1">Store Status</div>
                    </div>
                    <div className="text-center col-span-2 md:col-span-1">
                        <div className="text-3xl font-black text-slate-700 dark:text-slate-300 capitalize">{store.themeId || 'vogue'}</div>
                        <div className="text-xs text-slate-500 font-medium mt-1">Active Theme</div>
                    </div>
                </div>
                <div className="px-4 md:px-6 pb-5">
                    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-sm text-indigo-700 dark:text-indigo-300">
                        <p className="font-semibold mb-0.5">Store URL</p>
                        <a
                            href={`${window.location.origin}/store/${store.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline break-all font-mono text-xs"
                        >
                            {window.location.origin}/store/{store.slug}
                        </a>
                    </div>
                </div>
            </div>

            {/* Custom Domain Mapping */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-400" /> Custom Domain Mapping
                    </h3>
                </div>
                <div className="p-4 md:p-6 space-y-4">
                    <p className="text-sm text-slate-500">
                        Map your own domain name (e.g., <strong>shop.yourbrand.com</strong>) to your Online Store.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Domain Name</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="shop.example.com"
                                value={customDomain}
                                onChange={e => setCustomDomain(e.target.value.toLowerCase())}
                                className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                            />
                            <button
                                onClick={handleSaveDomain}
                                disabled={savingDomain}
                                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm"
                            >
                                {savingDomain ? 'Saving...' : 'Save Domain'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="mt-6 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <button 
                            onClick={() => setShowDnsInstructions(!showDnsInstructions)}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                <Info className="w-4 h-4 text-indigo-500" /> How to configure your DNS
                            </h4>
                            {showDnsInstructions ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </button>
                        
                        {showDnsInstructions && (
                            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                                    To make your custom domain work, you need to log into your domain provider (e.g. GoDaddy, Namecheap, Route53) and add the following record to your DNS settings.
                                </p>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                <th className="px-4 py-2 font-medium border border-slate-200 dark:border-slate-700">Type</th>
                                                <th className="px-4 py-2 font-medium border border-slate-200 dark:border-slate-700">Name / Host</th>
                                                <th className="px-4 py-2 font-medium border border-slate-200 dark:border-slate-700">Value / Target</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 font-mono text-xs">CNAME</td>
                                                <td className="px-4 py-3 border border-slate-200 dark:border-slate-700">
                                                    <span className="font-mono text-xs bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">www</span> or <span className="font-mono text-xs bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">shop</span>
                                                </td>
                                                <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 font-mono text-xs select-all text-indigo-600 dark:text-indigo-400">
                                                    {window.location.hostname}
                                                </td>
                                            </tr>
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                                <td colSpan="3" className="px-4 py-2 text-xs text-slate-500 border border-slate-200 dark:border-slate-700">
                                                    * Note: If you are using an apex domain (e.g. <code>yourdomain.com</code> without the www), create an <strong>A Record</strong> pointing to our server IP instead. DNS changes may take up to 24-48 hours to propagate globally.
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Product Grid Layout */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-indigo-400" /> Product Grid Layout
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Control how many products appear per row on different devices.</p>
                </div>
                <div className="p-4 md:p-6 space-y-6">

                    {/* Desktop Columns */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            <Monitor className="w-4 h-4 text-indigo-400" /> Desktop Columns
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {[2, 3, 4, 5, 6].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setGridColumns(g => ({ ...g, desktop: n }))}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                        gridColumns.desktop === n
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                    }`}
                                >
                                    {/* Mini grid preview */}
                                    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(n, 4)}, 1fr)`, width: 52 }}>
                                        {Array(Math.min(n * 2, 8)).fill(0).map((_, i) => (
                                            <div key={i} className={`h-3 rounded-sm ${ gridColumns.desktop === n ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                        ))}
                                    </div>
                                    <span className={`text-xs font-bold ${ gridColumns.desktop === n ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{n} col</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mobile Columns */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            <Smartphone className="w-4 h-4 text-indigo-400" /> Mobile Columns
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setGridColumns(g => ({ ...g, mobile: n }))}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                        gridColumns.mobile === n
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                    }`}
                                >
                                    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: 52 }}>
                                        {Array(n * 2).fill(0).map((_, i) => (
                                            <div key={i} className={`h-4 rounded-sm ${ gridColumns.mobile === n ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                        ))}
                                    </div>
                                    <span className={`text-xs font-bold ${ gridColumns.mobile === n ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{n} col</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSaveGrid}
                        disabled={savingGrid}
                        className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm"
                    >
                        {savingGrid ? 'Saving...' : 'Save Grid Layout'}
                    </button>
                </div>
            </div>

            {/* Checkout & Payment Configuration */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-indigo-400" /> Checkout & Payment
                    </h3>
                </div>
                <div className="p-4 md:p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Checkout Mode</label>
                        <select 
                            value={checkoutMode} 
                            onChange={e => setCheckoutMode(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                        >
                            <option value="whatsapp">WhatsApp Conversational Checkout</option>
                            <option value="gateway">Direct Payment Gateway (Express Checkout)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {checkoutMode === 'whatsapp' ? 'Customers will complete their order by sending a WhatsApp message to your number.' : 'Customers will pay directly on your website using a payment gateway.'}
                        </p>
                    </div>

                    {checkoutMode === 'gateway' && (
                        <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Payment Provider</label>
                                <select 
                                    value={paymentProvider} 
                                    onChange={e => setPaymentProvider(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                                >
                                    <option value="">-- Select Provider --</option>
                                    <option value="razorpay">Razorpay</option>
                                    <option value="phonepe">PhonePe</option>
                                </select>
                            </div>

                            {paymentProvider === 'razorpay' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Razorpay Key ID</label>
                                        <input type="text" value={paymentConfig.razorpayKeyId || ''} onChange={e => setPaymentConfig(p => ({...p, razorpayKeyId: e.target.value}))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Razorpay Key Secret</label>
                                        <input type="password" value={paymentConfig.razorpayKeySecret || ''} onChange={e => setPaymentConfig(p => ({...p, razorpayKeySecret: e.target.value}))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                    </div>
                                </div>
                            )}

                            {paymentProvider === 'phonepe' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Merchant ID</label>
                                        <input type="text" value={paymentConfig.phonepeMerchantId || ''} onChange={e => setPaymentConfig(p => ({...p, phonepeMerchantId: e.target.value}))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Salt Key</label>
                                        <input type="password" value={paymentConfig.phonepeSaltKey || ''} onChange={e => setPaymentConfig(p => ({...p, phonepeSaltKey: e.target.value}))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Salt Index</label>
                                        <input type="text" value={paymentConfig.phonepeSaltIndex || '1'} onChange={e => setPaymentConfig(p => ({...p, phonepeSaltIndex: e.target.value}))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSaveCheckout}
                        disabled={savingCheckout}
                        className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm"
                    >
                        {savingCheckout ? 'Saving...' : 'Save Checkout Settings'}
                    </button>
                </div>
            </div>

            {/* Tax & GST Configuration */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" /> Tax & GST Configuration
                    </h3>
                </div>
                <div className="p-4 md:p-6 space-y-5">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={taxConfig.enabled} 
                            onChange={e => setTaxConfig({...taxConfig, enabled: e.target.checked})}
                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Enable Taxes / GST</span>
                    </label>

                    {taxConfig.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8 border-l-2 border-indigo-100 dark:border-indigo-900/50 mt-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tax System</label>
                                <select 
                                    value={taxConfig.type} 
                                    onChange={e => setTaxConfig({...taxConfig, type: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                >
                                    <option value="gst">Indian GST (CGST/SGST/IGST)</option>
                                    <option value="vat">Global VAT / Fixed Tax</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Default Tax Rate (%)</label>
                                <input 
                                    type="number" 
                                    value={taxConfig.rate} 
                                    onChange={e => setTaxConfig({...taxConfig, rate: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-3 mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={taxConfig.autoGenerateBill} 
                                        onChange={e => setTaxConfig({...taxConfig, autoGenerateBill: e.target.checked})}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Auto-generate Tax Invoice PDF when order is placed</span>
                                </label>

                                {taxConfig.autoGenerateBill && (
                                    <label className="flex items-center gap-3 cursor-pointer pl-6">
                                        <input 
                                            type="checkbox" 
                                            checked={taxConfig.autoSendWhatsApp} 
                                            onChange={e => setTaxConfig({...taxConfig, autoSendWhatsApp: e.target.checked})}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Auto-send Invoice PDF to customer via WhatsApp</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSaveTax}
                        disabled={savingTax}
                        className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm"
                    >
                        {savingTax ? 'Saving...' : 'Save Tax Settings'}
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-rose-200 dark:border-rose-900/30 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <h3 className="font-bold text-rose-800 dark:text-rose-400">Danger Zone</h3>
                </div>
                <div className="p-4 md:p-6 space-y-4">
                    <p className="text-rose-700 dark:text-rose-300/80 text-sm leading-relaxed">
                        Deleting your store is <strong>permanent and irreversible</strong>. All products, settings, and analytics data will be lost. 
                        To confirm, type your store name exactly as shown below.
                    </p>

                    <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 font-mono text-sm text-rose-800 dark:text-rose-300 select-all">
                        {store.name}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-rose-700 dark:text-rose-400">
                            Type store name to confirm deletion:
                        </label>
                        <input
                            type="text"
                            placeholder={`Type "${store.name}" to confirm`}
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting || confirmText !== store.name}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold sm:font-semibold transition-all text-sm shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        {deleting ? 'Deleting Store…' : 'Permanently Delete Store'}
                    </button>
                </div>
            </div>
        </div>
    );
}

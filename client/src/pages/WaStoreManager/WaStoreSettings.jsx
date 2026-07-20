import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Settings, Trash2, AlertTriangle, BarChart2, Eye, Globe, Info, ChevronDown, ChevronUp, LayoutGrid, Smartphone, Monitor, ShoppingBag, FileText, ClipboardList, Sparkles } from 'lucide-react';
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
    const [showCrossSells, setShowCrossSells] = useState(true);
    const [mobileBottomMenu, setMobileBottomMenu] = useState([
        { id: 'home', enabled: true },
        { id: 'search', enabled: true },
        { id: 'cart', enabled: true },
        { id: 'whatsapp', enabled: true },
        { id: 'categories', enabled: false },
        { id: 'policies', enabled: false },
        { id: 'profile', enabled: false }
    ]);
    const [savingGrid, setSavingGrid] = useState(false);

    const [checkoutMode, setCheckoutMode] = useState('whatsapp');
    const [currency, setCurrency] = useState('USD');
    const [paymentProvider, setPaymentProvider] = useState('');
    const [paymentConfig, setPaymentConfig] = useState({ razorpayKeyId: '', razorpayKeySecret: '', phonepeMerchantId: '', phonepeSaltKey: '', phonepeSaltIndex: '1' });
    const [checkoutConfig, setCheckoutConfig] = useState({ minOrderValue: 0, flatShippingRate: 0, freeShippingThreshold: 0 });
    const [savingCheckout, setSavingCheckout] = useState(false);

    const [taxConfig, setTaxConfig] = useState({ enabled: false, type: 'gst', taxInclusive: false, slabs: [], rate: 0, autoGenerateBill: false, autoSendWhatsApp: false });
    const [savingTax, setSavingTax] = useState(false);

    const [inventoryConfig, setInventoryConfig] = useState({ enabled: false, autoOutOfStock: false, showLowStock: false, preventCartAdd: false, showOutOfStock: false });
    const [savingInventory, setSavingInventory] = useState(false);

    const [invoiceConfig, setInvoiceConfig] = useState({ prefixOnline: 'ORD-', prefixPos: 'POS-', startingNumber: 1001 });
    const [savingInvoice, setSavingInvoice] = useState(false);

    const [customerAuthConfig, setCustomerAuthConfig] = useState({
        enabled: false,
        methods: ['email_password'],
        allowGuestCheckout: true,
        requireLoginForCheckout: false,
    });
    const [savingAuth, setSavingAuth] = useState(false);
    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
                if (myStore?.customDomain) setCustomDomain(myStore.customDomain);
                if (myStore?.gridColumns) setGridColumns(myStore.gridColumns);
                if (myStore?.showCrossSells !== undefined) setShowCrossSells(myStore.showCrossSells);
                if (myStore?.mobileBottomMenu) setMobileBottomMenu(myStore.mobileBottomMenu);
                if (myStore?.checkoutMode) setCheckoutMode(myStore.checkoutMode);
                if (myStore?.currency) setCurrency(myStore.currency);
                if (myStore?.paymentProvider) setPaymentProvider(myStore.paymentProvider);
                if (myStore?.paymentConfig) setPaymentConfig(prev => ({ ...prev, ...myStore.paymentConfig }));
                if (myStore?.checkoutConfig) setCheckoutConfig(prev => ({ ...prev, ...myStore.checkoutConfig }));
                if (myStore?.taxConfig) setTaxConfig(prev => ({ ...prev, ...myStore.taxConfig }));
                if (myStore?.inventoryConfig) setInventoryConfig(prev => ({ ...prev, ...myStore.inventoryConfig }));
                if (myStore?.invoiceConfig) setInvoiceConfig(prev => ({ ...prev, ...myStore.invoiceConfig }));
                if (myStore?.customerAuthConfig) setCustomerAuthConfig(prev => ({ ...prev, ...myStore.customerAuthConfig }));
            } catch (error) {
                toast.error('Failed to load store settings');
            } finally {
                setLoading(false);
            }
        };
        const fetchTemplates = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`);
                setTemplates(res.data.filter(t => t.status === 'APPROVED' && t.category === 'AUTHENTICATION'));
            } catch (error) {
                console.error("Failed to load templates", error);
            }
        };
        fetchStore();
        fetchTemplates();
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
                gridColumns,
                showCrossSells,
                mobileBottomMenu
            });
            toast.success('Display layout saved!');
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
                checkoutMode, currency, paymentProvider, paymentConfig, checkoutConfig
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
            toast.success('Tax & Invoice settings saved!');
        } catch (error) {
            toast.error('Failed to save tax settings');
        } finally {
            setSavingTax(false);
        }
    };

    const handleSaveInvoice = async () => {
        setSavingInvoice(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                invoiceConfig
            });
            toast.success('Invoice numbering preferences saved!');
        } catch (error) {
            toast.error('Failed to save invoice numbering');
        } finally {
            setSavingInvoice(false);
        }
    };

    const handleSaveInventory = async () => {
        setSavingInventory(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                inventoryConfig
            });
            toast.success('Inventory preferences saved!');
        } catch (error) {
            toast.error('Failed to save inventory preferences');
        } finally {
            setSavingInventory(false);
        }
    };

    if (loading || !store) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
    );
    return (
        <div className="max-w-4xl space-y-6 pb-7 sm:pb-20">
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
            {/* Product Display Options */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" /> Product Display Options
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Control what extra content is shown on the single product page.</p>
                </div>
                <div className="p-4 md:p-6 space-y-5">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <div className="relative mt-0.5 shrink-0">
                            <input
                                type="checkbox"
                                id="showCrossSells"
                                checked={showCrossSells}
                                onChange={e => setShowCrossSells(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div
                                onClick={() => setShowCrossSells(v => !v)}
                                className={`w-11 h-6 rounded-full transition-colors cursor-pointer border-2 ${
                                    showCrossSells
                                        ? 'bg-indigo-600 border-indigo-600'
                                        : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                                } cursor-pointer`}
                            >
                                <div className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                    showCrossSells ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                            </div>
                        </div>
                        <div>
                            <span className="block text-sm font-medium text-slate-900 dark:text-white">Show Cross-Sells ("You May Also Like")</span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                                When a customer opens a product, show other products from the same category below the product details.
                            </span>
                        </div>
                    </label>

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleSaveGrid}
                            disabled={savingGrid}
                            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm"
                        >
                            {savingGrid ? 'Saving...' : 'Save Display Options'}
                        </button>
                    </div>
                </div>
            </div>
            {/* Mobile Bottom Menu Config */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-indigo-400" /> Mobile Bottom Menu
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Configure the icons that appear in the sticky navigation bar on mobile devices.</p>
                </div>
                <div className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {mobileBottomMenu.map((item, idx) => (
                            <label key={item.id} className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="relative mt-0.5 shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={item.enabled}
                                        onChange={e => {
                                            const updated = [...mobileBottomMenu];
                                            updated[idx].enabled = e.target.checked;
                                            setMobileBottomMenu(updated);
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div
                                        className={`w-9 h-5 rounded-full transition-colors cursor-pointer border-2 ${
                                            item.enabled
                                                ? 'bg-indigo-600 border-indigo-600'
                                                : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${
                                            item.enabled ? 'translate-x-4' : 'translate-x-0'
                                        }`} />
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-sm font-semibold text-slate-900 dark:text-white capitalize">{item.id === 'whatsapp' ? 'WhatsApp Redirect' : item.id}</span>
                                    <span className="block text-[10px] text-slate-500 mt-0.5">
                                        {item.id === 'home' && 'Link back to store home page'}
                                        {item.id === 'search' && 'Open search overlay'}
                                        {item.id === 'cart' && 'Open shopping cart drawer'}
                                        {item.id === 'whatsapp' && 'Open wa.me/ to configured store WhatsApp number'}
                                        {item.id === 'categories' && 'Open categories list'}
                                        {item.id === 'policies' && 'Open store policies modal'}
                                        {item.id === 'profile' && 'User profile / orders link'}
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={handleSaveGrid}
                            disabled={savingGrid}
                            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm"
                        >
                            {savingGrid ? 'Saving...' : 'Save Mobile Menu Config'}
                        </button>
                    </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Store Currency</label>
                            <select 
                                value={currency} 
                                onChange={e => setCurrency(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                            >
                                <option value="USD">USD — US Dollar ($)</option>
                                <option value="EUR">EUR — Euro (€)</option>
                                <option value="GBP">GBP — British Pound (£)</option>
                                <option value="INR">INR — Indian Rupee (₹)</option>
                                <option value="AED">AED — UAE Dirham (د.إ)</option>
                                <option value="SGD">SGD — Singapore Dollar (S$)</option>
                                <option value="AUD">AUD — Australian Dollar (A$)</option>
                                <option value="CAD">CAD — Canadian Dollar (C$)</option>
                            </select>
                        </div>
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
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 -mt-3">
                        {checkoutMode === 'whatsapp' ? 'Customers will complete their order by sending a WhatsApp message to your number.' : 'Customers will pay directly on your website using a payment gateway.'}
                    </p>

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

                    {/* Order & Shipping Rules */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 mt-6">
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Order & Shipping Rules</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum Order Value</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                    <input type="number" min="0" value={checkoutConfig?.minOrderValue || 0} onChange={e => setCheckoutConfig(p => ({...p, minOrderValue: Number(e.target.value)}))} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Set to 0 for no minimum.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Flat Shipping Rate</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                    <input type="number" min="0" value={checkoutConfig?.flatShippingRate || 0} onChange={e => setCheckoutConfig(p => ({...p, flatShippingRate: Number(e.target.value)}))} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Delivery fee added to cart.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Free Shipping Threshold</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                    <input type="number" min="0" value={checkoutConfig?.freeShippingThreshold || 0} onChange={e => setCheckoutConfig(p => ({...p, freeShippingThreshold: Number(e.target.value)}))} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Waive fee if cart &gt; this amount. (0 to disable)</p>
                            </div>
                        </div>
                    </div>

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
            {/* Inventory Configuration */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-indigo-400" /> Inventory Preferences
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Control how stock levels are tracked and displayed in your store.</p>
                </div>
                <div className="p-4 md:p-6 space-y-5">

                    {/* Master Toggle */}
                    <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                        <div className="relative mt-0.5 shrink-0">
                            <input
                                type="checkbox"
                                checked={inventoryConfig.enabled}
                                onChange={e => setInventoryConfig({ ...inventoryConfig, enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div
                                onClick={() => setInventoryConfig(c => ({ ...c, enabled: !c.enabled }))}
                                className={`w-11 h-6 rounded-full transition-colors cursor-pointer border-2 ${
                                    inventoryConfig.enabled
                                        ? 'bg-indigo-600 border-indigo-600'
                                        : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                                } cursor-pointer`}
                            >
                                <div className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                    inventoryConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                            </div>
                        </div>
                        <div>
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">Enable Inventory Management</span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                                When enabled, you can track stock levels per product, and product creation will ask for stock quantity.
                            </span>
                        </div>
                    </label>

                    {/* Sub-options (only shown when inventory is enabled) */}
                    {inventoryConfig.enabled && (
                        <div className="space-y-4 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={inventoryConfig.autoOutOfStock} 
                                    onChange={e => setInventoryConfig({...inventoryConfig, autoOutOfStock: e.target.checked})}
                                    className="w-5 h-5 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-slate-900 dark:text-white">Auto "Out of Stock"</span>
                                    <span className="block text-xs text-slate-500 mt-0.5">Automatically mark items as Out of Stock when quantity reaches 0.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={inventoryConfig.preventCartAdd} 
                                    onChange={e => setInventoryConfig({...inventoryConfig, preventCartAdd: e.target.checked})}
                                    className="w-5 h-5 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-slate-900 dark:text-white">Prevent Adding to Cart on Zero Stock</span>
                                    <span className="block text-xs text-slate-500 mt-0.5">Disable the "Add to Cart" button if the product's exact stock quantity is 0.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={inventoryConfig.showLowStock} 
                                    onChange={e => setInventoryConfig({...inventoryConfig, showLowStock: e.target.checked})}
                                    className="w-5 h-5 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-slate-900 dark:text-white">Show "X items left"</span>
                                    <span className="block text-xs text-slate-500 mt-0.5">Show a low stock badge to customers on the storefront when stock drops below threshold.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={inventoryConfig.showOutOfStock} 
                                    onChange={e => setInventoryConfig({...inventoryConfig, showOutOfStock: e.target.checked})}
                                    className="w-5 h-5 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-slate-900 dark:text-white">Show Out of Stock Products</span>
                                    <span className="block text-xs text-slate-500 mt-0.5">Display out-of-stock products in your storefront with an "Out of Stock" badge instead of hiding them.</span>
                                </div>
                            </label>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleSaveInventory}
                            disabled={savingInventory}
                            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm"
                        >
                            {savingInventory ? 'Saving...' : 'Save Inventory Preferences'}
                        </button>
                    </div>
                </div>
            </div>
            {/* Invoice Configuration */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" /> Invoice Numbering
                    </h3>
                </div>
                <div className="p-4 md:p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Online Order Prefix</label>
                            <input 
                                type="text" 
                                value={invoiceConfig.prefixOnline} 
                                onChange={e => setInvoiceConfig({...invoiceConfig, prefixOnline: e.target.value.toUpperCase()})}
                                placeholder="ORD-"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm uppercase font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">POS Order Prefix</label>
                            <input 
                                type="text" 
                                value={invoiceConfig.prefixPos} 
                                onChange={e => setInvoiceConfig({...invoiceConfig, prefixPos: e.target.value.toUpperCase()})}
                                placeholder="POS-"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm uppercase font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Starting Number</label>
                            <input 
                                type="number" 
                                value={invoiceConfig.startingNumber} 
                                onChange={e => setInvoiceConfig({...invoiceConfig, startingNumber: parseInt(e.target.value) || 0})}
                                placeholder="1001"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm font-mono"
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleSaveInvoice}
                            disabled={savingInvoice}
                            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm"
                        >
                            {savingInvoice ? 'Saving...' : 'Save Invoice Preferences'}
                        </button>
                    </div>
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
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pricing Mode</label>
                                <select 
                                    value={taxConfig.taxInclusive ? 'inclusive' : 'exclusive'} 
                                    onChange={e => setTaxConfig({...taxConfig, taxInclusive: e.target.value === 'inclusive'})}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                >
                                    <option value="exclusive">Product Price Excludes Tax (Tax added at checkout)</option>
                                    <option value="inclusive">Product Price Includes Tax</option>
                                </select>
                            </div>

                            {/* Tax Slabs Manager */}
                            <div className="col-span-1 md:col-span-2 mt-2">
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Tax Slabs (Product-Wise)</label>
                                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                                    {(taxConfig.slabs || []).map((slab, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <input 
                                                type="text" 
                                                placeholder="Slab Name (e.g., 18% GST)"
                                                value={slab.name}
                                                onChange={e => {
                                                    const newSlabs = [...(taxConfig.slabs || [])];
                                                    newSlabs[index].name = e.target.value;
                                                    setTaxConfig({...taxConfig, slabs: newSlabs});
                                                }}
                                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                            />
                                            <div className="relative w-24">
                                                <input 
                                                    type="number" 
                                                    placeholder="Rate"
                                                    value={slab.rate}
                                                    onChange={e => {
                                                        const newSlabs = [...(taxConfig.slabs || [])];
                                                        newSlabs[index].rate = parseFloat(e.target.value) || 0;
                                                        setTaxConfig({...taxConfig, slabs: newSlabs});
                                                    }}
                                                    className="w-full px-3 py-2 pr-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const newSlabs = [...(taxConfig.slabs || [])];
                                                    newSlabs.splice(index, 1);
                                                    setTaxConfig({...taxConfig, slabs: newSlabs});
                                                }}
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        type="button"
                                        onClick={() => setTaxConfig({...taxConfig, slabs: [...(taxConfig.slabs || []), { name: '', rate: 0 }]})}
                                        className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                                    >
                                        + Add Tax Slab
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">If no slabs are defined, a global default rate of {taxConfig.rate}% is applied.</p>
                            </div>

                            {/* Legacy Global Rate (kept as fallback) */}
                            {(!taxConfig.slabs || taxConfig.slabs.length === 0) && (
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Global Default Tax Rate (%)</label>
                                    <input 
                                        type="number" 
                                        value={taxConfig.rate} 
                                        onChange={e => setTaxConfig({...taxConfig, rate: parseFloat(e.target.value) || 0})}
                                        className="w-full md:w-1/2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                    />
                                </div>
                            )}

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

            {/* ─── CUSTOMER ACCOUNTS ─── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-500" /> Customer Accounts
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Allow your store customers to create accounts, track orders, and save addresses.
                </p>

                {/* Enable toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                    <div>
                        <p className="font-medium text-slate-800 dark:text-white text-sm">Enable Customer Accounts</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Shows Login/Register button on your store</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCustomerAuthConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${customerAuthConfig.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${customerAuthConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {customerAuthConfig.enabled && (
                    <div className="space-y-4">
                        {/* Auth methods */}
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Login Methods</p>
                            <div className="space-y-2">
                                {[
                                    { id: 'email_password', label: 'Email + Password', desc: 'Classic username/password login' },
                                    { id: 'whatsapp_otp', label: 'WhatsApp OTP', desc: 'Login via WhatsApp one-time code (uses your WA credentials)' },
                                ].map(method => {
                                    const isActive = (customerAuthConfig.methods || []).includes(method.id);
                                    return (
                                        <label key={method.id} className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={() => {
                                                    const methods = customerAuthConfig.methods || [];
                                                    const updated = isActive
                                                        ? methods.filter(m => m !== method.id)
                                                        : [...methods, method.id];
                                                    setCustomerAuthConfig(prev => ({ ...prev, methods: updated }));
                                                }}
                                                className="mt-0.5"
                                            />
                                            <div className="w-full">
                                                <p className="text-sm font-medium text-slate-800 dark:text-white">{method.label}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{method.desc}</p>
                                                {method.id === 'whatsapp_otp' && isActive && (
                                                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                            Select OTP Template
                                                        </label>
                                                        <select
                                                            value={customerAuthConfig.otpTemplateName || ''}
                                                            onChange={e => {
                                                                const templateName = e.target.value;
                                                                const template = templates.find(t => t.name === templateName);
                                                                setCustomerAuthConfig(prev => ({
                                                                    ...prev,
                                                                    otpTemplateName: templateName,
                                                                    otpTemplateLanguage: template ? template.language : 'en'
                                                                }));
                                                            }}
                                                            className="w-full sm:max-w-xs text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        >
                                                            <option value="">-- No template selected --</option>
                                                            {templates.map(t => (
                                                                <option key={t.id || t.name} value={t.name}>
                                                                    {t.name} ({t.language})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <p className="text-[10px] text-slate-500 mt-1">Required by Meta for new customers. Template must have 1 variable for the OTP.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                                <div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-white">Allow Guest Checkout</p>
                                    <p className="text-xs text-slate-500">Customers can checkout without account</p>
                                </div>
                                <button type="button"
                                    onClick={() => setCustomerAuthConfig(prev => ({ ...prev, allowGuestCheckout: !prev.allowGuestCheckout }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${customerAuthConfig.allowGuestCheckout ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${customerAuthConfig.allowGuestCheckout ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </label>
                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                                <div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-white">Require Login to Checkout</p>
                                    <p className="text-xs text-slate-500">Force login before placing orders</p>
                                </div>
                                <button type="button"
                                    onClick={() => setCustomerAuthConfig(prev => ({ ...prev, requireLoginForCheckout: !prev.requireLoginForCheckout }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${customerAuthConfig.requireLoginForCheckout ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${customerAuthConfig.requireLoginForCheckout ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </label>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    disabled={savingAuth}
                    onClick={async () => {
                        setSavingAuth(true);
                        try {
                            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, { customerAuthConfig });
                            toast.success('Customer account settings saved!');
                        } catch {
                            toast.error('Failed to save settings.');
                        } finally { setSavingAuth(false); }
                    }}
                    className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                    {savingAuth ? 'Saving…' : 'Save Account Settings'}
                </button>
            </div>
        </div>
    );
}

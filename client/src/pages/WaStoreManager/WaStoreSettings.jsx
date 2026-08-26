import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Settings, Trash2, AlertTriangle, BarChart2, Eye, Globe, Info, ChevronDown, ChevronUp, LayoutGrid, Smartphone, Monitor, ShoppingBag, FileText, ClipboardList, Sparkles, CheckCircle, XCircle, Copy, ExternalLink, RefreshCw, Shield, Zap, ArrowRight, Clock, HelpCircle, Link2, Unlink, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const INDIAN_STATES = [
    { code: "01", name: "Jammu and Kashmir" },
    { code: "02", name: "Himachal Pradesh" },
    { code: "03", name: "Punjab" },
    { code: "04", name: "Chandigarh" },
    { code: "05", name: "Uttarakhand" },
    { code: "06", name: "Haryana" },
    { code: "07", name: "Delhi" },
    { code: "08", name: "Rajasthan" },
    { code: "09", name: "Uttar Pradesh" },
    { code: "10", name: "Bihar" },
    { code: "11", name: "Sikkim" },
    { code: "12", name: "Arunachal Pradesh" },
    { code: "13", name: "Nagaland" },
    { code: "14", name: "Manipur" },
    { code: "15", name: "Mizoram" },
    { code: "16", name: "Tripura" },
    { code: "17", name: "Meghalaya" },
    { code: "18", name: "Assam" },
    { code: "19", name: "West Bengal" },
    { code: "20", name: "Jharkhand" },
    { code: "21", name: "Odisha" },
    { code: "22", name: "Chhattisgarh" },
    { code: "23", name: "Madhya Pradesh" },
    { code: "24", name: "Gujarat" },
    { code: "25", name: "Daman and Diu" },
    { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
    { code: "27", name: "Maharashtra" },
    { code: "29", name: "Karnataka" },
    { code: "30", name: "Goa" },
    { code: "31", name: "Lakshadweep" },
    { code: "32", name: "Kerala" },
    { code: "33", name: "Tamil Nadu" },
    { code: "34", name: "Puducherry" },
    { code: "35", name: "Andaman and Nicobar Islands" },
    { code: "36", name: "Telangana" },
    { code: "37", name: "Andhra Pradesh" },
    { code: "38", name: "Ladakh" }
];

function validateGSTIN(gstin) {
    if (!gstin || gstin.length !== 15) return false;
    const regex = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!regex.test(gstin)) return false;
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sum = 0;
    for (let i = 0; i < 14; i++) {
        let codePoint = chars.indexOf(gstin[i]);
        let product = codePoint * ((i % 2 === 0) ? 1 : 2);
        sum += Math.floor(product / 36) + (product % 36);
    }
    let checkCode = 36 - (sum % 36);
    if (checkCode === 36) checkCode = 0;
    return chars[checkCode] === gstin[14];
}


export default function WaStoreSettings() {
    const { storeId } = useOutletContext();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [savingDomain, setSavingDomain] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [customDomain, setCustomDomain] = useState('www.');
    const [showDnsInstructions, setShowDnsInstructions] = useState(false);
    const [domainStatus, setDomainStatus] = useState(null); // null | 'pending' | 'verified' | 'failed'
    const [domainVerifiedAt, setDomainVerifiedAt] = useState(null);
    const [verifyingDomain, setVerifyingDomain] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);
    const [removingDomain, setRemovingDomain] = useState(false);
    const [domainType, setDomainType] = useState('subdomain'); // 'root' or 'subdomain'
    const [copiedField, setCopiedField] = useState(null);
    const [gridColumns, setGridColumns] = useState({ desktop: 4, mobile: 2 });
    const [paginationConfig, setPaginationConfig] = useState({ mode: 'none' });
    const [showCrossSells, setShowCrossSells] = useState(true);
    const [categoryDisplayConfig, setCategoryDisplayConfig] = useState({ mobileLayout: 3, shape: 'round' });
    const [savingGrid, setSavingGrid] = useState(false);

    const [checkoutMode, setCheckoutMode] = useState('whatsapp');
    const [currency, setCurrency] = useState('USD');
    const [paymentProvider, setPaymentProvider] = useState('');
    const [paymentConfig, setPaymentConfig] = useState({ razorpayKeyId: '', razorpayKeySecret: '', phonepeMerchantId: '', phonepeSaltKey: '', phonepeSaltIndex: '1' });
    const [checkoutConfig, setCheckoutConfig] = useState({ minOrderValue: 0, flatShippingRate: 0, freeShippingThreshold: 0 });
    const [savingCheckout, setSavingCheckout] = useState(false);

    const [taxConfig, setTaxConfig] = useState({
        enabled: false, type: 'gst', taxInclusive: false, slabs: [], rate: 0,
        enableGlobalRate: false,
        autoGenerateBill: false, autoSendWhatsApp: false,
        // Seller/Business GST registration details
        sellerLegalName: '', sellerGstin: '',
        sellerAddress: '', sellerState: '', sellerStateCode: ''
    });
    const [savingTax, setSavingTax] = useState(false);

    const [inventoryConfig, setInventoryConfig] = useState({ enabled: false, autoOutOfStock: false, showLowStock: false, preventCartAdd: false, showOutOfStock: false });
    const [savingInventory, setSavingInventory] = useState(false);

    const [invoiceConfig, setInvoiceConfig] = useState({ prefixOnline: 'ORD-', prefixPos: 'POS-', onlineStartingNumber: 1001, posStartingNumber: 1001 });
    const [savingInvoice, setSavingInvoice] = useState(false);

    const [customerAuthConfig, setCustomerAuthConfig] = useState({
        enabled: false,
        methods: ['email_password'],
        allowGuestCheckout: true,
        requireLoginForCheckout: false,
    });
    const [savingAuth, setSavingAuth] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [activeTab, setActiveTab] = useState('domain');

    const tabs = [
        { id: 'domain', label: 'General', icon: <Globe className="w-4 h-4" /> },
        { id: 'layout', label: 'Layout & Display', icon: <LayoutGrid className="w-4 h-4" /> },
        { id: 'checkout', label: 'Checkout & Auth', icon: <ShoppingBag className="w-4 h-4" /> },
        { id: 'tax_invoice', label: 'Tax & Invoice', icon: <FileText className="w-4 h-4" /> },
        { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4" /> },
    ];

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
                if (myStore?.customDomain) setCustomDomain(myStore.customDomain.replace(/^www\./i, ''));
                else setCustomDomain('');
                if (myStore?.domainStatus) setDomainStatus(myStore.domainStatus);
                if (myStore?.domainVerifiedAt) setDomainVerifiedAt(myStore.domainVerifiedAt);
                if (myStore?.gridColumns) setGridColumns(myStore.gridColumns);
                if (myStore?.categoryDisplayConfig) setCategoryDisplayConfig(prev => ({ ...prev, ...myStore.categoryDisplayConfig }));
                if (myStore?.paginationConfig) setPaginationConfig(myStore.paginationConfig);
                if (myStore?.showCrossSells !== undefined) setShowCrossSells(myStore.showCrossSells);
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
        if (!customDomain.trim()) {
            toast.error('Please enter a domain name.');
            return;
        }
        setSavingDomain(true);
        setVerifyResult(null);
        try {
            const finalDomain = `www.${customDomain.trim().toLowerCase().replace(/^www\./, '')}`;
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                customDomain: finalDomain
            });
            const savedDomain = res.data.customDomain || finalDomain;
            const savedStatus = res.data.domainStatus || 'pending';
            setCustomDomain(savedDomain.replace(/^www\./i, ''));
            setDomainStatus(savedStatus);
            // Update local store object so store?.customDomain references in JSX reflect immediately
            setStore(prev => prev ? { ...prev, customDomain: savedDomain, domainStatus: savedStatus } : prev);
            setShowDnsInstructions(true);
            // Auto-detect domain type from input (with www. it's always a subdomain structure)
            setDomainType('subdomain');
            toast.success('Domain saved! Now configure your DNS records below.');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update custom domain');
        } finally {
            setSavingDomain(false);
        }
    };

    const handleVerifyDomain = async () => {
        setVerifyingDomain(true);
        setVerifyResult(null);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/verify-domain`);
            setVerifyResult(res.data);
            setDomainStatus(res.data.domainStatus);
            if (res.data.verified) {
                setDomainVerifiedAt(new Date().toISOString());
                toast.success('🎉 Domain verified successfully! Your store is now live on your custom domain.');
            } else {
                toast.error('DNS verification failed. Check the details below.');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Verification failed. Please try again.');
        } finally {
            setVerifyingDomain(false);
        }
    };

    const handleRemoveDomain = async () => {
        if (!window.confirm('Are you sure you want to disconnect this custom domain? Your store will only be accessible via the default URL.')) return;
        setRemovingDomain(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/domain`);
            setCustomDomain('');
            setDomainStatus(null);
            setDomainVerifiedAt(null);
            setVerifyResult(null);
            setShowDnsInstructions(false);
            // Clear from local store object so wizard/disconnect button disappear immediately
            setStore(prev => prev ? { ...prev, customDomain: null, domainStatus: null, domainVerifiedAt: null } : prev);
            toast.success('Custom domain removed.');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to remove domain');
        } finally {
            setRemovingDomain(false);
        }
    };

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            toast.success('Copied to clipboard!');
            setTimeout(() => setCopiedField(null), 2000);
        }).catch(() => toast.error('Failed to copy'));
    };

    const handleSaveGrid = async () => {
        setSavingGrid(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                gridColumns,
                categoryDisplayConfig,
                paginationConfig,
                showCrossSells
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
        if (taxConfig.enabled) {
            if (!taxConfig.slabs || taxConfig.slabs.length === 0 || taxConfig.slabs.some(s => !s.name || s.name.trim() === '')) {
                toast.error("Please add and name at least one tax slab.");
                return;
            }
            if (taxConfig.enableGlobalRate) {
                const validRate = (taxConfig.slabs || []).some(s => s.rate === taxConfig.rate);
                if (!validRate) {
                    toast.error("Please select a valid global default tax slab.");
                    return;
                }
            }
        }

        if (taxConfig.enabled && taxConfig.type === 'gst') {
            if (!taxConfig.sellerLegalName || !taxConfig.sellerGstin || !taxConfig.sellerState || !taxConfig.sellerAddress) {
                toast.error("Please fill all mandatory Seller GST Details");
                return;
            }
            if (!validateGSTIN(taxConfig.sellerGstin)) {
                toast.error("Invalid GSTIN format or checksum!");
                return;
            }
            if (taxConfig.sellerGstin.substring(0, 2) !== taxConfig.sellerStateCode) {
                toast.error("GSTIN state code does not match selected State!");
                return;
            }
        }
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


    return (
        <div className="max-w-4xl pb-7 sm:pb-20">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                Store Settings
            </h2>

            {/* Tabs Navigation */}
            <div className="sticky top-[-16px] md:top-[-24px] z-40 bg-slate-50 dark:bg-slate-900 py-3 border-b border-slate-200 dark:border-slate-800 mb-6 -mx-4 px-4 md:-mx-8 md:px-8">
                <div className="flex overflow-x-auto hide-scrollbar gap-2">
                    {loading || !store ? (
                        [1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-10 w-28 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0 animate-pulse" />
                        ))
                    ) : tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Contents */}
            <div className="space-y-6">

                {loading || !store ? (
                    <div className="space-y-6 animate-pulse mt-4">
                        {[1, 2].map(i => (
                            <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
                                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                                <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
                                <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>

                        {activeTab === 'domain' && (
                            <>
                                {/* Custom Domain Mapping */}
                                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-indigo-400" /> Custom Domain Mapping
                                            </h3>
                                            {/* Domain Status Badge */}
                                            {domainStatus && (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${domainStatus === 'verified' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                        domainStatus === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                    }`}>
                                                    {domainStatus === 'verified' && <CheckCircle className="w-3 h-3" />}
                                                    {domainStatus === 'pending' && <Clock className="w-3 h-3" />}
                                                    {domainStatus === 'failed' && <XCircle className="w-3 h-3" />}
                                                    {domainStatus === 'verified' ? 'Connected' : domainStatus === 'pending' ? 'Pending Verification' : 'DNS Not Found'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-6 space-y-6">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Connect your own domain (e.g., <strong className="text-slate-700 dark:text-slate-300">yourbrand.com</strong> or <strong className="text-slate-700 dark:text-slate-300">shop.yourbrand.com</strong>) to your online store. Customers will visit your domain and see your store.
                                        </p>

                                        {/* Domain Input */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Your Domain Name</label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="relative w-full sm:flex-1 flex rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                                                    <input
                                                        type="text"
                                                        placeholder="yourbrand.com or www.yourbrand.com"
                                                        value={customDomain}
                                                        onChange={e => {
                                                            let val = e.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                                                            setCustomDomain(val);
                                                        }}
                                                        className="flex-1 w-full px-4 py-3 sm:py-2.5 bg-transparent outline-none text-slate-900 dark:text-white text-sm m-0 border-none focus:ring-0"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleSaveDomain}
                                                        disabled={savingDomain || !customDomain.trim()}
                                                        className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold sm:font-semibold transition-all text-sm shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        {savingDomain ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                                        {savingDomain ? 'Saving...' : (store?.customDomain ? 'Update Domain' : 'Link Domain')}
                                                    </button>
                                                    {store?.customDomain && (
                                                        <button
                                                            onClick={handleRemoveDomain}
                                                            disabled={removingDomain}
                                                            className="px-3 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl transition-all border border-red-200 dark:border-red-800"
                                                            title="Disconnect domain"
                                                        >
                                                            <Unlink className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1.5">Enter your domain exactly as you want it (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">mystore.in</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">www.mystore.in</code>)</p>
                                        </div>

                                        {/* Verified Domain Info */}
                                        {domainStatus === 'verified' && store?.customDomain && (
                                            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Domain is connected and live!</p>
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                            Your store is accessible at <a href={`https://${store.customDomain}`} target="_blank" rel="noopener noreferrer" className="underline font-semibold inline-flex items-center gap-1">
                                                                {store.customDomain} <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        </p>
                                                        {domainVerifiedAt && (
                                                            <p className="text-[10px] text-emerald-500/70 mt-1">Verified on {new Date(domainVerifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={handleVerifyDomain}
                                                        disabled={verifyingDomain}
                                                        className="shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        {verifyingDomain ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                        Re-verify
                                                    </button>
                                                </div>
                                                {/* Show re-verify result even when domain is verified */}
                                                {verifyResult && (
                                                    <div className={`mt-3 rounded-lg p-3 text-xs border ${verifyResult.verified ? 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400'}`}>
                                                        {verifyResult.details}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <hr className="border-slate-200 dark:border-white/10" />

                                        {/* Step-by-Step DNS Setup Guide */}
                                        {(customDomain) && (
                                            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
                                                <div className="mb-6">
                                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                                        <Zap className="w-5 h-5 text-indigo-500" /> DNS Setup Guide
                                                    </h3>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Follow these steps to connect <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-bold">{customDomain}</code> to your store</p>
                                                </div>

                                                <div className="space-y-6">

                                                    {/* Step 1: CNAME Record */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Add this CNAME record at your domain registrar</h4>
                                                        </div>
                                                        <div className="ml-8 space-y-4">
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                                Log in to your domain registrar (GoDaddy, Namecheap, Hostinger, etc.) and add the following DNS record:
                                                            </p>

                                                            {/* DNS Record Table */}
                                                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead>
                                                                        <tr className="bg-slate-100 dark:bg-slate-800">
                                                                            <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Type</th>
                                                                            <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Name / Host</th>
                                                                            <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Value / Target</th>
                                                                            <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider w-16">Copy</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        <tr className="bg-white dark:bg-slate-900">
                                                                            <td className="px-4 py-3">
                                                                                <span className="font-mono text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">CNAME</span>
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                                                    {(() => {
                                                                                        const d = customDomain || '';
                                                                                        const parts = d.split('.');
                                                                                        if (d.startsWith('www.')) return 'www';
                                                                                        const isCcTld = ['.co.in', '.co.uk', '.com.au', '.com.br', '.org.in'].some(t => d.endsWith(t));
                                                                                        if (isCcTld && parts.length > 3) return parts.slice(0, -3).join('.');
                                                                                        if (!isCcTld && parts.length > 2) return parts.slice(0, -2).join('.');
                                                                                        return '@';
                                                                                    })()}
                                                                                </span>
                                                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                                                    {(() => {
                                                                                        const d = customDomain || '';
                                                                                        const parts = d.split('.');
                                                                                        if (d.startsWith('www.')) return 'Exactly "www" — do not include your domain name';
                                                                                        const isCcTld = ['.co.in', '.co.uk', '.com.au', '.com.br', '.org.in'].some(t => d.endsWith(t));
                                                                                        if ((isCcTld && parts.length > 3) || (!isCcTld && parts.length > 2)) return 'The subdomain part before your main domain';
                                                                                        return 'Exactly "@" (represents your root domain)';
                                                                                    })()}
                                                                                </p>
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">router.bluetick.cloud</span>
                                                                                <p className="text-[10px] text-slate-400 mt-0.5">If your registrar says invalid, try: <span className="font-mono font-bold">router.bluetick.cloud.</span></p>
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                <button onClick={() => copyToClipboard('router.bluetick.cloud', 'cname')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Copy value">
                                                                                    {copiedField === 'cname' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>

                                                            {/* Important Note */}
                                                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 flex flex-col gap-2">
                                                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-2">
                                                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                                    <span><strong>Important:</strong> Delete any existing conflicting records for this host before adding the new one.</span>
                                                                </p>
                                                                {(() => {
                                                                    const d = customDomain || '';
                                                                    const isCcTld = ['.co.in', '.co.uk', '.com.au', '.com.br', '.org.in'].some(t => d.endsWith(t));
                                                                    const isRoot = (isCcTld && d.split('.').length === 3) || (!isCcTld && d.split('.').length === 2);
                                                                    if (isRoot) {
                                                                        return (
                                                                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-2">
                                                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                                                <span><strong>Root Domain Notice:</strong> Some domain registrars do not allow CNAME records on the root domain (@). If your registrar blocks this, we recommend connecting <strong>www.{customDomain}</strong> instead, or moving your DNS to Cloudflare (free) which supports root CNAME flattening.</span>
                                                                            </p>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>

                                                            {/* Registrar Tips */}
                                                            <details className="group">
                                                                <summary className="cursor-pointer flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1">
                                                                    <HelpCircle className="w-4 h-4" />
                                                                    Step-by-step for popular registrars
                                                                    <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                                                                </summary>
                                                                <div className="mt-3 space-y-3">
                                                                    {[
                                                                        { name: 'GoDaddy', steps: ['Log in → My Products → DNS', 'Click "Add" → Select Type: CNAME', 'Name: www, Value: router.bluetick.cloud', 'Save'] },
                                                                        { name: 'Namecheap', steps: ['Log in → Domain List → Manage → Advanced DNS', 'Click "Add New Record" → CNAME Record', 'Host: www, Value: router.bluetick.cloud', 'Save all changes'] },
                                                                        { name: 'Hostinger', steps: ['Log in → Domains → DNS / Nameservers', 'Add Record → Type: CNAME', 'Name: www, Target: router.bluetick.cloud', 'Save'] },
                                                                        { name: 'Cloudflare', steps: ['Log in → Select your domain → DNS', 'Add record → Type: CNAME', 'Name: www, Target: router.bluetick.cloud, Proxy: OFF (Grey cloud)', 'Save'] },
                                                                    ].map(reg => (
                                                                        <details key={reg.name} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                                            <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">{reg.name}</summary>
                                                                            <ol className="px-4 pb-3 pt-1 space-y-1.5">
                                                                                {reg.steps.map((step, i) => (
                                                                                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                                                                                        <span className="text-indigo-500 font-bold shrink-0">{i + 1}.</span> {step}
                                                                                    </li>
                                                                                ))}
                                                                            </ol>
                                                                        </details>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        </div>
                                                    </div>

                                                    {/* Step 2: Domain Redirect */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Redirect alternative domain <span className="text-slate-400 font-normal">(optional but recommended)</span></h4>
                                                        </div>
                                                        <div className="ml-8">
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2">
                                                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                                                    So visitors who type the other version of your domain also reach your store, set up a <strong>URL Redirect</strong> at your registrar:
                                                                </p>
                                                                {(() => {
                                                                    const d = customDomain || '';
                                                                    const isRoot = !d.startsWith('www.');
                                                                    const rootDom = d.replace(/^www\./, '');
                                                                    return (
                                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
                                                                            <span className="text-slate-500 break-all">{isRoot ? `www.${rootDom}` : rootDom}</span>
                                                                            <span className="text-slate-400 hidden sm:inline">→</span>
                                                                            <span className="text-slate-400 sm:hidden">↓</span>
                                                                            <span className="text-indigo-600 dark:text-indigo-400 font-bold break-all">{d}</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <p className="text-xs text-slate-400 mt-2">Look for "URL Redirect" or "Domain Forwarding" in your registrar — this is different from a DNS record.</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Step 3: Verify */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Verify your DNS configuration</h4>
                                                        </div>
                                                        <div className="ml-8 space-y-3">
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                                After adding the DNS records, click the button below to verify. DNS changes can take <strong>5 minutes to 48 hours</strong> to propagate globally.
                                                            </p>
                                                            <button
                                                                onClick={handleVerifyDomain}
                                                                disabled={verifyingDomain}
                                                                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${domainStatus === 'verified'
                                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                                    } disabled:opacity-50`}
                                                            >
                                                                {verifyingDomain ? (
                                                                    <><RefreshCw className="w-4 h-4 animate-spin" /> Checking DNS...</>
                                                                ) : domainStatus === 'verified' ? (
                                                                    <><CheckCircle className="w-4 h-4" /> Re-verify Domain</>
                                                                ) : (
                                                                    <><Search className="w-4 h-4" /> Verify DNS Configuration</>
                                                                )}
                                                            </button>

                                                            {/* Verification Result */}
                                                            {verifyResult && (
                                                                <div className={`rounded-xl p-4 border ${verifyResult.verified
                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30'
                                                                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                                                                    }`}>
                                                                    <div className="flex items-start gap-3">
                                                                        {verifyResult.verified ? (
                                                                            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                                                        ) : (
                                                                            <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                                                                        )}
                                                                        <div>
                                                                            <p className={`text-sm font-bold ${verifyResult.verified ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                                                                                {verifyResult.verified ? '✅ Domain Verified Successfully!' : '❌ DNS Verification Failed'}
                                                                            </p>
                                                                            <p className={`text-xs mt-1 ${verifyResult.verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                                {verifyResult.details}
                                                                            </p>
                                                                            {verifyResult.method && (
                                                                                <p className="text-[10px] text-slate-500 mt-1">Verification method: {verifyResult.method} record</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Troubleshooting Tips */}
                                {store?.customDomain && (
                                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                        <details className="group">
                                            <summary className="cursor-pointer px-4 md:px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                                                    <HelpCircle className="w-4 h-4 text-amber-500" /> Troubleshooting & FAQ
                                                </h3>
                                                <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="px-4 md:px-6 pb-5 space-y-3 border-t border-slate-100 dark:border-white/5 pt-4">
                                                {[
                                                    { q: 'How long does DNS take to propagate?', a: 'DNS changes typically take 5 minutes to 2 hours, but can take up to 48 hours in rare cases. You can check propagation status at dnschecker.org.' },
                                                    { q: 'Can I use my root domain (without www)?', a: 'Yes! Use an A record pointing to our server IP. If your DNS provider is Cloudflare, you can use a CNAME for @ and Cloudflare will auto-flatten it.' },
                                                    { q: 'Domain was working but stopped?', a: 'This can happen if the DNS records were changed or if your domain expired. Re-verify your DNS to check the current status.' },
                                                    { q: 'Can I use Cloudflare proxy (orange cloud)?', a: 'Yes! Cloudflare proxy is fully compatible and recommended — it adds DDoS protection and free SSL to your store.' },
                                                    { q: 'Do I need an SSL certificate?', a: 'SSL is handled automatically. If you use Cloudflare, their free SSL works out of the box. Otherwise, our server handles SSL via Let\'s Encrypt.' },
                                                    { q: 'My old website was on this domain. What happens?', a: 'Once you change the DNS records to point to Bluetick, your old website will stop loading on that domain. Make sure to back up your old site first.' }
                                                ].map((item, i) => (
                                                    <details key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">{item.q}</summary>
                                                        <p className="px-4 pb-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.a}</p>
                                                    </details>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </>
                        )}
                        {activeTab === 'layout' && (
                            <>
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
                                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${gridColumns.desktop === n
                                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                            }`}
                                                    >
                                                        {/* Mini grid preview */}
                                                        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(n, 4)}, 1fr)`, width: 52 }}>
                                                            {Array(Math.min(n * 2, 8)).fill(0).map((_, i) => (
                                                                <div key={i} className={`h-3 rounded-sm ${gridColumns.desktop === n ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                            ))}
                                                        </div>
                                                        <span className={`text-xs font-bold ${gridColumns.desktop === n ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{n} col</span>
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
                                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${gridColumns.mobile === n
                                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                            }`}
                                                    >
                                                        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: 52 }}>
                                                            {Array(n * 2).fill(0).map((_, i) => (
                                                                <div key={i} className={`h-4 rounded-sm ${gridColumns.mobile === n ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                            ))}
                                                        </div>
                                                        <span className={`text-xs font-bold ${gridColumns.mobile === n ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{n} col</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Category Display Settings */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                <LayoutGrid className="w-4 h-4 text-indigo-400" /> Category Layout & Shape
                                            </label>
                                            <p className="text-xs text-slate-500 mb-4">Control how categories are displayed on mobile and their shape.</p>

                                            <div className="grid grid-cols-1 gap-6">
                                                {/* Category Mobile Columns */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                                        <Smartphone className="inline w-3 h-3 mr-1" /> Category Mobile Columns
                                                    </label>
                                                    <div className="flex gap-2">
                                                        {[2, 3, 4].map(n => (
                                                            <button
                                                                key={n}
                                                                type="button"
                                                                onClick={() => setCategoryDisplayConfig(c => ({ ...c, mobileLayout: n }))}
                                                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${categoryDisplayConfig.mobileLayout === n
                                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                                    }`}
                                                            >
                                                                <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: 52 }}>
                                                                    {Array(n).fill(0).map((_, i) => (
                                                                        <div key={i} className={`h-4 ${categoryDisplayConfig.shape === 'circle' ? 'rounded-full' : 'rounded-sm'} ${categoryDisplayConfig.mobileLayout === n ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                                    ))}
                                                                </div>
                                                                <span className={`text-xs font-bold ${categoryDisplayConfig.mobileLayout === n ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{n} col</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Category Shape */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                                        Category Shape (All Devices)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCategoryDisplayConfig(c => ({ ...c, shape: 'round' }))}
                                                            className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all flex-1 ${categoryDisplayConfig.shape === 'round'
                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                                }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg ${categoryDisplayConfig.shape === 'round' ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                            <span className={`text-xs font-bold ${categoryDisplayConfig.shape === 'round' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Rounded</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCategoryDisplayConfig(c => ({ ...c, shape: 'circle' }))}
                                                            className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all flex-1 ${categoryDisplayConfig.shape === 'circle'
                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                                }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full ${categoryDisplayConfig.shape === 'circle' ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                            <span className={`text-xs font-bold ${categoryDisplayConfig.shape === 'circle' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Circle</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pagination Options */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                <LayoutGrid className="w-4 h-4 text-indigo-400" /> Pagination & Loading
                                            </label>
                                            <p className="text-xs text-slate-500 mb-4">Choose how multiple products are loaded. We recommend Load More or Pagination for stores with many products.</p>

                                            <div className="grid sm:grid-cols-3 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setPaginationConfig({ mode: 'none' })}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${paginationConfig.mode === 'none'
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <span className={`block font-bold text-sm ${paginationConfig.mode === 'none' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>Show All</span>
                                                    <span className="block text-xs text-slate-500 mt-1">Loads all products at once.</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setPaginationConfig({ mode: 'pagination' })}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${paginationConfig.mode === 'pagination'
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <span className={`block font-bold text-sm ${paginationConfig.mode === 'pagination' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>Numbered Pages</span>
                                                    <span className="block text-xs text-slate-500 mt-1">Standard 1, 2, 3... page buttons.</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setPaginationConfig({ mode: 'load_more' })}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${paginationConfig.mode === 'load_more'
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <span className={`block font-bold text-sm ${paginationConfig.mode === 'load_more' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>Load More Button</span>
                                                    <span className="block text-xs text-slate-500 mt-1">Appends products on click.</span>
                                                </button>
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
                                                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer border-2 ${showCrossSells
                                                        ? 'bg-indigo-600 border-indigo-600'
                                                        : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                                                        } cursor-pointer`}
                                                >
                                                    <div className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${showCrossSells ? 'translate-x-5' : 'translate-x-0'
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
                            </>
                        )}
                        {activeTab === 'checkout' && (
                            <>
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
                                                            <input type="text" value={paymentConfig.razorpayKeyId || ''} onChange={e => setPaymentConfig(p => ({ ...p, razorpayKeyId: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Razorpay Key Secret</label>
                                                            <input type="password" value={paymentConfig.razorpayKeySecret || ''} onChange={e => setPaymentConfig(p => ({ ...p, razorpayKeySecret: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                                        </div>
                                                    </div>
                                                )}

                                                {paymentProvider === 'phonepe' && (
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Merchant ID</label>
                                                            <input type="text" value={paymentConfig.phonepeMerchantId || ''} onChange={e => setPaymentConfig(p => ({ ...p, phonepeMerchantId: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Salt Key</label>
                                                            <input type="password" value={paymentConfig.phonepeSaltKey || ''} onChange={e => setPaymentConfig(p => ({ ...p, phonepeSaltKey: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Salt Index</label>
                                                            <input type="text" value={paymentConfig.phonepeSaltIndex || '1'} onChange={e => setPaymentConfig(p => ({ ...p, phonepeSaltIndex: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
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
                                                        <input type="number" min="0" value={checkoutConfig?.minOrderValue || 0} onChange={e => setCheckoutConfig(p => ({ ...p, minOrderValue: Number(e.target.value) }))} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500" />
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-1">Set to 0 for no minimum.</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Flat Shipping Rate</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                                        <input type="number" min="0" value={checkoutConfig?.flatShippingRate || 0} onChange={e => setCheckoutConfig(p => ({ ...p, flatShippingRate: Number(e.target.value) }))} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500" />
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-1">Delivery fee added to cart.</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Free Shipping Threshold</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                                        <input type="number" min="0" value={checkoutConfig?.freeShippingThreshold || 0} onChange={e => setCheckoutConfig(p => ({ ...p, freeShippingThreshold: Number(e.target.value) }))} className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500" />
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
                            </>
                        )}
                        {activeTab === 'domain' && (
                            <>
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
                                                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer border-2 ${inventoryConfig.enabled
                                                        ? 'bg-indigo-600 border-indigo-600'
                                                        : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                                                        } cursor-pointer`}
                                                >
                                                    <div className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${inventoryConfig.enabled ? 'translate-x-5' : 'translate-x-0'
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
                                                        onChange={e => setInventoryConfig({ ...inventoryConfig, autoOutOfStock: e.target.checked })}
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
                                                        onChange={e => setInventoryConfig({ ...inventoryConfig, preventCartAdd: e.target.checked })}
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
                                                        onChange={e => setInventoryConfig({ ...inventoryConfig, showLowStock: e.target.checked })}
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
                                                        onChange={e => setInventoryConfig({ ...inventoryConfig, showOutOfStock: e.target.checked })}
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
                            </>
                        )}
                        {activeTab === 'tax_invoice' && (
                            <>
                                {/* Invoice Configuration */}
                                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-400" /> Invoice Numbering
                                        </h3>
                                    </div>
                                    <div className="p-4 md:p-6 space-y-5">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Online Order Prefix</label>
                                                    <input
                                                        type="text"
                                                        value={invoiceConfig.prefixOnline}
                                                        onChange={e => setInvoiceConfig({ ...invoiceConfig, prefixOnline: e.target.value.toUpperCase() })}
                                                        placeholder="ORD-"
                                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm uppercase font-mono shadow-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Online Starting Number</label>
                                                    <input
                                                        type="number"
                                                        value={invoiceConfig.onlineStartingNumber ?? invoiceConfig.startingNumber ?? 1001}
                                                        onChange={e => setInvoiceConfig({ ...invoiceConfig, onlineStartingNumber: parseInt(e.target.value) || 0 })}
                                                        placeholder="1001"
                                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm font-mono shadow-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">POS Order Prefix</label>
                                                    <input
                                                        type="text"
                                                        value={invoiceConfig.prefixPos}
                                                        onChange={e => setInvoiceConfig({ ...invoiceConfig, prefixPos: e.target.value.toUpperCase() })}
                                                        placeholder="POS-"
                                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm uppercase font-mono shadow-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">POS Starting Number</label>
                                                    <input
                                                        type="number"
                                                        value={invoiceConfig.posStartingNumber ?? invoiceConfig.startingNumber ?? 1001}
                                                        onChange={e => setInvoiceConfig({ ...invoiceConfig, posStartingNumber: parseInt(e.target.value) || 0 })}
                                                        placeholder="1001"
                                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm font-mono shadow-sm"
                                                    />
                                                </div>
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
                                                onChange={e => setTaxConfig({ ...taxConfig, enabled: e.target.checked })}
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
                                                        onChange={e => setTaxConfig({ ...taxConfig, type: e.target.value })}
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
                                                        onChange={e => setTaxConfig({ ...taxConfig, taxInclusive: e.target.value === 'inclusive' })}
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
                                                                        setTaxConfig({ ...taxConfig, slabs: newSlabs });
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
                                                                            newSlabs[index].rate = e.target.value === '' ? '' : e.target.value;
                                                                            setTaxConfig({ ...taxConfig, slabs: newSlabs });
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
                                                                        setTaxConfig({ ...taxConfig, slabs: newSlabs });
                                                                    }}
                                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => setTaxConfig({ ...taxConfig, slabs: [...(taxConfig.slabs || []), { name: '', rate: 0 }] })}
                                                            className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                                                        >
                                                            + Add Tax Slab
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Global Default Rate */}
                                                <div className="col-span-1 md:col-span-2 mt-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={taxConfig.enableGlobalRate || false}
                                                            onChange={e => setTaxConfig({ ...taxConfig, enableGlobalRate: e.target.checked })}
                                                            className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                                                        />
                                                        <div>
                                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">Enable Global Default Tax Rate</span>
                                                            <span className="text-xs text-slate-500">Automatically apply a fallback rate to products without a specific tax slab.</span>
                                                        </div>
                                                    </label>

                                                    {taxConfig.enableGlobalRate && (
                                                        <div className="mt-4 ml-7 border-l-2 border-indigo-100 dark:border-indigo-900/50 pl-4">
                                                            <select
                                                                value={taxConfig.rate === 0 && !(taxConfig.slabs || []).some(s => s.rate === 0) ? '' : taxConfig.rate}
                                                                onChange={e => setTaxConfig({ ...taxConfig, rate: parseFloat(e.target.value) || 0 })}
                                                                className="w-full md:w-1/2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            >
                                                                <option value="">Select Tax Slab...</option>
                                                                {(taxConfig.slabs || []).filter(s => s.name).map((slab, index) => (
                                                                    <option key={index} value={slab.rate}>{slab.name} ({slab.rate}%)</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Seller / Business GST Registration Details */}
                                                {taxConfig.type === 'gst' && (
                                                    <div className="col-span-1 md:col-span-2 mt-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl space-y-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-amber-700 dark:text-amber-400 font-semibold text-sm">🏢 Seller GST Registration Details</span>
                                                            <span className="text-xs text-amber-600 dark:text-amber-500">(Printed on every invoice)</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Legal Business Name <span className="text-red-500">*</span></label>
                                                                <input type="text" value={taxConfig.sellerLegalName || ''} onChange={e => setTaxConfig({ ...taxConfig, sellerLegalName: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" placeholder="As registered with GST" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">GSTIN <span className="text-red-500">*</span></label>
                                                                <input type="text" value={taxConfig.sellerGstin || ''} onChange={e => setTaxConfig({ ...taxConfig, sellerGstin: e.target.value.toUpperCase() })} maxLength={15} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono uppercase" placeholder="22AABCC1234F1Z5" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">State <span className="text-red-500">*</span></label>
                                                                <select
                                                                    value={taxConfig.sellerState || ''}
                                                                    onChange={e => {
                                                                        const stName = e.target.value;
                                                                        const stCode = INDIAN_STATES.find(s => s.name === stName)?.code || '';
                                                                        setTaxConfig({ ...taxConfig, sellerState: stName, sellerStateCode: stCode });
                                                                    }}
                                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                                >
                                                                    <option value="">Select State</option>
                                                                    {INDIAN_STATES.map(s => (
                                                                        <option key={s.code} value={s.name}>{s.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">State Code</label>
                                                                <input type="text" value={taxConfig.sellerStateCode || ''} readOnly className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm cursor-not-allowed" placeholder="Select state first" />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Registered Address <span className="text-red-500">*</span></label>
                                                                <textarea value={taxConfig.sellerAddress || ''} onChange={e => setTaxConfig({ ...taxConfig, sellerAddress: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" placeholder="Full registered address" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="col-span-1 md:col-span-2 space-y-3 mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={taxConfig.autoGenerateBill}
                                                            onChange={e => setTaxConfig({ ...taxConfig, autoGenerateBill: e.target.checked })}
                                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm text-slate-700 dark:text-slate-300">Auto-generate Tax Invoice PDF when order is placed</span>
                                                    </label>

                                                    {taxConfig.autoGenerateBill && (
                                                        <label className="flex items-center gap-3 cursor-pointer pl-6">
                                                            <input
                                                                type="checkbox"
                                                                checked={taxConfig.autoSendWhatsApp}
                                                                onChange={e => setTaxConfig({ ...taxConfig, autoSendWhatsApp: e.target.checked })}
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
                            </>
                        )}
                        {activeTab === 'danger' && (
                            <>
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

                            </>
                        )}
                        {activeTab === 'checkout' && (
                            <>
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
                                                        onClick={() => setCustomerAuthConfig(prev => {
                                                            const newValue = !prev.allowGuestCheckout;
                                                            return { ...prev, allowGuestCheckout: newValue, requireLoginForCheckout: newValue ? false : prev.requireLoginForCheckout };
                                                        })}
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
                                                        onClick={() => setCustomerAuthConfig(prev => {
                                                            const newValue = !prev.requireLoginForCheckout;
                                                            return { ...prev, requireLoginForCheckout: newValue, allowGuestCheckout: newValue ? false : prev.allowGuestCheckout };
                                                        })}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${customerAuthConfig.requireLoginForCheckout ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${customerAuthConfig.requireLoginForCheckout ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </label>
                                            </div>

                                            {/* WhatsApp Requirement Setting */}
                                            <div className="mt-3">
                                                <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800 dark:text-white">WhatsApp Number in Registration</p>
                                                        <p className="text-xs text-slate-500">Should users be forced to provide WhatsApp number when signing up?</p>
                                                    </div>
                                                    <select
                                                        value={customerAuthConfig.whatsappRequirement || 'optional'}
                                                        onChange={e => setCustomerAuthConfig(prev => ({ ...prev, whatsappRequirement: e.target.value }))}
                                                        className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    >
                                                        <option value="optional">Optional</option>
                                                        <option value="mandatory">Mandatory</option>
                                                    </select>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        disabled={savingAuth}
                                        onClick={async () => {
                                            if (customerAuthConfig?.methods?.includes('whatsapp_otp') && !customerAuthConfig?.otpTemplateName) {
                                                toast.error('Please select a WhatsApp Template for OTP before saving.');
                                                return;
                                            }

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
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
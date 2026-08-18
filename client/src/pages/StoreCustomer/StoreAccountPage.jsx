import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Package, MapPin, User, Lock, LogOut, ArrowLeft, Plus, Trash2, Edit3, Check, X, ChevronRight, Loader2, ShoppingBag, ShieldCheck, Calendar, Sparkles, Clock, Copy } from 'lucide-react';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import WaStoreHeader from '../../components/WaStoreHeader';
import WaStoreFooter from '../../components/WaStoreFooter';
import { getThemeConfig } from '../../utils/wastoreThemes';
import toast from 'react-hot-toast';
import { getStoreRoute } from '../../utils/storeRouting';

const STATUS_COLORS = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200/60',
    processing: 'bg-purple-50 text-purple-700 border-purple-200/60',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200/60',
};

const tabs = [
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'security', label: 'Security & Auth', icon: Lock },
];

export default function StoreAccountPage({ store, products = [] }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { customer, isLoggedIn, loading, logout, updateProfile, fetchOrders, addAddress, updateAddress, deleteAddress, changePassword } = useStoreCustomer();

    const [activeTab, setActiveTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);

    // Profile
    const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
    const [savingProfile, setSavingProfile] = useState(false);

    // Security
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [savingPwd, setSavingPwd] = useState(false);

    // Addresses
    const [addresses, setAddresses] = useState([]);
    const [editingAddr, setEditingAddr] = useState(null); // null | { idx, ...data }
    const [addingAddr, setAddingAddr] = useState(false);
    const [addrForm, setAddrForm] = useState({ label: 'Home', name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false });

    // Header & Theme integration
    const [cartCount, setCartCount] = useState(0);
    
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(`wa_cart_${slug}`);
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                setCartCount(parsed.reduce((sum, item) => sum + item.qty, 0));
            }
        } catch (e) {}
    }, [slug]);
    const theme = getThemeConfig(store?.themeCustomizations?.theme || 'modern', store?.themeCustomizations);
    const themeColor = store?.themeCustomizations?.primaryColor || '#6366f1';

    useEffect(() => {
        if (!loading && !isLoggedIn) navigate(getStoreRoute(slug, `/account/login`));
    }, [loading, isLoggedIn, slug, navigate]);

    useEffect(() => {
        if (customer) {
            setProfileForm({ name: customer.name || '', phone: customer.phone || '' });
            setAddresses(customer.savedAddresses || []);
        }
    }, [customer]);

    useEffect(() => {
        if (activeTab === 'orders' && isLoggedIn) {
            setOrdersLoading(true);
            fetchOrders()
                .then(res => setOrders(res || []))
                .catch(() => toast.error('Failed to load orders.'))
                .finally(() => setOrdersLoading(false));
        }
    }, [activeTab, isLoggedIn, fetchOrders]);

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            await updateProfile(profileForm);
            toast.success('Profile updated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update profile.');
        } finally { setSavingProfile(false); }
    };

    const handleChangePwd = async (e) => {
        e.preventDefault();
        if (pwdForm.newPassword !== pwdForm.confirm) { toast.error('Passwords do not match.'); return; }
        setSavingPwd(true);
        try {
            await changePassword(pwdForm.currentPassword, pwdForm.newPassword);
            toast.success('Password updated successfully!');
            setPwdForm({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to change password.');
        } finally { setSavingPwd(false); }
    };

    const handleSaveAddress = async () => {
        const { label, name, phone, address, city, state, pincode } = addrForm;
        if (!label?.trim() || !name?.trim() || !phone?.trim() || !address?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim()) {
            toast.error("All address fields are mandatory.");
            return;
        }
        try {
            if (editingAddr !== null) {
                const updated = await updateAddress(editingAddr.idx, addrForm);
                setAddresses(updated || []);
                setEditingAddr(null);
            } else {
                const updated = await addAddress(addrForm);
                setAddresses(updated || []);
                setAddingAddr(false);
            }
            setAddrForm({ label: 'Home', name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false });
            toast.success('Address saved!');
        } catch (err) {
            toast.error('Failed to save address.');
        }
    };

    const handleDeleteAddress = async (idx) => {
        try {
            const updated = await deleteAddress(idx);
            setAddresses(updated || []);
            toast.success('Address removed.');
        } catch { toast.error('Failed to remove address.'); }
    };

    const startEditAddr = (idx) => {
        setAddrForm({ ...addresses[idx] });
        setEditingAddr({ idx });
        setAddingAddr(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied "${text}"`);
    };

    if (loading || !store) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50">
                <Loader2 size={36} className="animate-spin text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-500">Loading account portal...</p>
            </div>
        );
    }

    const CurrencySymbol = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const userInitials = (customer?.name || 'Customer').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/70 font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
            {/* ── STORE HEADER ── */}
            <WaStoreHeader
                store={store}
                theme={theme}
                slug={slug}
                products={products}
                categories={[]}
                cartCount={cartCount}
                setIsCartOpen={(val) => {
                    if (val) {
                        navigate(getStoreRoute(slug, `?cart=open`));
                    }
                }}
                authEnabled={true}
                storeCustomer={customer}
            />

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                
                {/* ── CUSTOMER HERO BANNER ── */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 md:p-8 text-white shadow-xl shadow-slate-900/10 border border-slate-800 mb-8">
                    {/* Decorative brand glow */}
                    <div 
                        className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
                        style={{ background: themeColor }}
                    />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        
                        {/* User Profile Info */}
                        <div className="flex items-center gap-4 sm:gap-5">
                            <div 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-2xl sm:text-3xl text-white shadow-lg shadow-black/20 ring-4 ring-white/10 shrink-0"
                                style={{ background: themeColor }}
                            >
                                {userInitials}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{customer?.name || 'Valued Customer'}</h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                        <ShieldCheck size={12} /> Verified Member
                                    </span>
                                </div>
                                <p className="text-sm text-slate-300 mt-1 font-medium">{customer?.email || customer?.phone || 'Logged in'}</p>
                                {customer?.createdAt && (
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                        <Calendar size={12} /> Joined {new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats Grid & Logout */}
                        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 px-4 min-w-[110px] text-center border border-white/10 shrink-0">
                                <p className="text-xs font-medium text-slate-300">Total Orders</p>
                                <p className="text-lg font-bold text-white mt-0.5">{orders.length}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 px-4 min-w-[110px] text-center border border-white/10 shrink-0">
                                <p className="text-xs font-medium text-slate-300">Saved Addr</p>
                                <p className="text-lg font-bold text-white mt-0.5">{addresses.length}</p>
                            </div>
                            <button
                                onClick={() => { logout(); navigate(getStoreRoute(slug)); }}
                                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-2xl p-3.5 px-5 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shrink-0 ml-auto md:ml-0"
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── ACCOUNT LAYOUT GRID ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* ── SIDEBAR NAVIGATION ── */}
                    <aside className="lg:col-span-3">
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-3 shadow-sm sticky top-24">
                            <div className="px-4 py-3 border-b border-slate-100 mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account Portal</p>
                            </div>
                            <nav className="space-y-1.5">
                                {tabs.map(t => {
                                    const Icon = t.icon;
                                    const isActive = activeTab === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setActiveTab(t.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                                                isActive
                                                    ? 'text-white shadow-md shadow-slate-900/5'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                            style={isActive ? { background: themeColor } : {}}
                                        >
                                            <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </aside>

                    {/* ── TAB CONTENT ── */}
                    <section className="lg:col-span-9 min-w-0">

                        {/* ── MY ORDERS TAB ── */}
                        {activeTab === 'orders' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Order History</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Track and view details of your recent store orders</p>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                                        {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                                    </span>
                                </div>

                                {ordersLoading ? (
                                    <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center">
                                        <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 font-medium">Fetching your order history...</p>
                                    </div>
                                ) : orders.length === 0 ? (
                                    <div className="bg-white rounded-3xl border border-slate-200/80 p-12 sm:p-16 text-center shadow-sm">
                                        <div 
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                            style={{ background: `${themeColor}15`, color: themeColor }}
                                        >
                                            <ShoppingBag size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">No orders placed yet</h3>
                                        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                                            Your cart is waiting! Explore our catalog and place your first order.
                                        </p>
                                        <Link 
                                            to={getStoreRoute(slug)} 
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
                                            style={{ background: themeColor }}
                                        >
                                            Start Shopping <ChevronRight size={16} />
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {orders.map(order => (
                                            <div key={order.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                                                
                                                {/* Header row */}
                                                <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 flex-wrap">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900 text-base">{order.orderNumber}</span>
                                                            <button 
                                                                onClick={() => copyToClipboard(order.orderNumber)}
                                                                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
                                                                title="Copy Order ID"
                                                            >
                                                                <Copy size={13} />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>

                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                        {order.status}
                                                    </span>
                                                </div>

                                                {/* Items list */}
                                                <div className="space-y-3 mb-5">
                                                    {(order.items || []).map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between gap-4 text-sm bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
                                                            <div className="flex items-center gap-3.5 min-w-0">
                                                                {item.imageUrls?.[0] ? (
                                                                    <img src={item.imageUrls[0]} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                                                                        <Package size={18} className="text-slate-400" />
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                                                                    <p className="text-xs text-slate-500 mt-0.5">Quantity: {item.qty || item.quantity}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="font-bold text-slate-900">
                                                                    {CurrencySymbol[order.currency] || ''}{parseFloat(item.price).toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Footer row */}
                                                <div className="flex items-center justify-between pt-2">
                                                    <div>
                                                        <p className="text-xs text-slate-400">Total Amount</p>
                                                        <p className="text-lg font-extrabold text-slate-900">
                                                            {CurrencySymbol[order.currency] || ''}{parseFloat(order.total || order.subtotal).toFixed(2)}
                                                        </p>
                                                    </div>

                                                    {order.trackingUrl ? (
                                                        <a 
                                                            href={order.trackingUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                                                            style={{ background: themeColor }}
                                                        >
                                                            Track Package <ChevronRight size={14} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                                                            {order.status === 'delivered' ? 'Order Fulfilled' : 'Processing Order'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── SAVED ADDRESSES TAB ── */}
                        {activeTab === 'addresses' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Saved Shipping Addresses</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Manage your delivery locations for faster checkout</p>
                                    </div>
                                    {!addingAddr && editingAddr === null && (
                                        <button 
                                            onClick={() => { setAddingAddr(true); setAddrForm({ label: 'Home', name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false }); }}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl text-white shadow-sm transition-transform hover:-translate-y-0.5"
                                            style={{ background: themeColor }}
                                        >
                                            <Plus size={14} /> Add New Address
                                        </button>
                                    )}
                                </div>

                                {/* Form Modal / Block */}
                                {(addingAddr || editingAddr !== null) && (
                                    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
                                        <h3 className="font-bold text-slate-900 text-base">{editingAddr !== null ? 'Edit Address' : 'New Address'}</h3>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {[
                                                { key: 'label', label: 'Address Label *', placeholder: 'Home / Work / Office' },
                                                { key: 'name', label: 'Full Name *', placeholder: 'John Doe' },
                                                { key: 'phone', label: 'Contact Phone *', placeholder: '+1 234 567 8900' },
                                                { key: 'address', label: 'Street Address *', placeholder: 'House No., Building, Street', cols: 2 },
                                                { key: 'city', label: 'City *', placeholder: 'City' },
                                                { key: 'state', label: 'State / Province *', placeholder: 'State' },
                                                { key: 'pincode', label: 'Postal / ZIP Code *', placeholder: '10001' },
                                            ].map(f => (
                                                <div key={f.key} className={f.cols === 2 ? 'sm:col-span-2' : ''}>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">{f.label}</label>
                                                    <input 
                                                        value={addrForm[f.key] || ''} 
                                                        onChange={e => setAddrForm(a => ({ ...a, [f.key]: e.target.value }))}
                                                        placeholder={f.placeholder}
                                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                                        style={{ '--tw-ring-color': themeColor }}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer pt-1">
                                            <input 
                                                type="checkbox" 
                                                checked={addrForm.isDefault} 
                                                onChange={e => setAddrForm(a => ({ ...a, isDefault: e.target.checked }))}
                                                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900" 
                                            />
                                            Set as my primary default delivery address
                                        </label>

                                        <div className="flex items-center gap-3 pt-3">
                                            <button 
                                                onClick={handleSaveAddress}
                                                className="px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm" 
                                                style={{ background: themeColor }}
                                            >
                                                <Check size={14} /> Save Address
                                            </button>
                                            <button 
                                                onClick={() => { setAddingAddr(false); setEditingAddr(null); }}
                                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
                                            >
                                                <X size={14} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Address Grid */}
                                {addresses.length === 0 && !addingAddr ? (
                                    <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
                                        <MapPin size={36} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-sm font-medium text-slate-600">No saved shipping addresses yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {addresses.map((addr, idx) => (
                                            <div key={idx} className="bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                                                            {addr.label || 'Home'}
                                                        </span>
                                                        {addr.isDefault && (
                                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                                ✓ Default
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-slate-900 text-base">{addr.name}</p>
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{addr.address}, {addr.city}, {addr.state} {addr.pincode}</p>
                                                    {addr.phone && <p className="text-xs text-slate-500 font-medium mt-2">📞 {addr.phone}</p>}
                                                </div>

                                                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                                                    <button 
                                                        onClick={() => startEditAddr(idx)} 
                                                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1 transition-colors"
                                                    >
                                                        <Edit3 size={13} /> Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteAddress(idx)} 
                                                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1 transition-colors"
                                                    >
                                                        <Trash2 size={13} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── PROFILE DETAILS TAB ── */}
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Update your account profile and contact info</p>
                                </div>

                                <div className="space-y-4 max-w-lg">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                                        <input 
                                            value={profileForm.name} 
                                            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                                        <input 
                                            value={customer?.email || ''} 
                                            readOnly
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed" 
                                        />
                                        <p className="text-xs text-slate-400 mt-1">Email address cannot be changed.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Phone Number</label>
                                        <input 
                                            value={profileForm.phone} 
                                            onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                                            placeholder="+1 234 567 8900"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" 
                                        />
                                    </div>

                                    <button 
                                        onClick={handleSaveProfile} 
                                        disabled={savingProfile}
                                        className="px-6 py-3 rounded-2xl text-white font-bold text-xs flex items-center gap-2 hover:opacity-95 disabled:opacity-60 shadow-md transition-all pt-3"
                                        style={{ background: themeColor }}
                                    >
                                        {savingProfile ? <Loader2 size={14} className="animate-spin" /> : null}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── SECURITY TAB ── */}
                        {activeTab === 'security' && (
                            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Security & Password</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Manage your credentials and login protection</p>
                                </div>

                                {!customer?.email ? (
                                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-amber-800 text-sm">
                                        You logged in via WhatsApp OTP authentication. Password configuration is not required.
                                    </div>
                                ) : (
                                    <form onSubmit={handleChangePwd} className="space-y-4 max-w-lg">
                                        {[
                                            { key: 'currentPassword', label: 'Current Password', placeholder: '••••••••' },
                                            { key: 'newPassword', label: 'New Password', placeholder: 'Min. 6 characters' },
                                            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
                                        ].map(f => (
                                            <div key={f.key}>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{f.label}</label>
                                                <input 
                                                    type="password" 
                                                    value={pwdForm[f.key]}
                                                    onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                    placeholder={f.placeholder} 
                                                    required
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" 
                                                />
                                            </div>
                                        ))}
                                        <button 
                                            type="submit" 
                                            disabled={savingPwd}
                                            className="px-6 py-3 rounded-2xl text-white font-bold text-xs flex items-center gap-2 hover:opacity-95 disabled:opacity-60 shadow-md transition-all pt-3"
                                            style={{ background: themeColor }}
                                        >
                                            {savingPwd ? <Loader2 size={14} className="animate-spin" /> : null}
                                            Update Password
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* ── STORE FOOTER ── */}
            <WaStoreFooter store={store} />
        </div>
    );
}

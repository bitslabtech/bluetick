import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Package, MapPin, User, Lock, LogOut, ArrowLeft, Plus, Trash2, Edit3, Check, X, ChevronRight, Loader2, ShoppingBag } from 'lucide-react';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const tabs = [
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
];

export default function StoreAccountPage({ store }) {
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

    const themeColor = store?.themeCustomizations?.primaryColor || '#6366f1';

    useEffect(() => {
        if (!loading && !isLoggedIn) navigate(`/store/${slug}/account/login`);
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
                .then(setOrders)
                .catch(() => toast.error('Failed to load orders.'))
                .finally(() => setOrdersLoading(false));
        }
    }, [activeTab, isLoggedIn, fetchOrders]);

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            await updateProfile(profileForm);
            toast.success('Profile updated!');
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
            toast.success('Password changed!');
            setPwdForm({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to change password.');
        } finally { setSavingPwd(false); }
    };

    const handleSaveAddress = async () => {
        try {
            if (editingAddr !== null) {
                const updated = await updateAddress(editingAddr.idx, addrForm);
                setAddresses(updated);
                setEditingAddr(null);
            } else {
                const updated = await addAddress(addrForm);
                setAddresses(updated);
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
            setAddresses(updated);
            toast.success('Address removed.');
        } catch { toast.error('Failed to remove address.'); }
    };

    const startEditAddr = (idx) => {
        setAddrForm({ ...addresses[idx] });
        setEditingAddr({ idx });
        setAddingAddr(false);
    };

    if (loading) return null;

    const CurrencySymbol = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <Link to={`/store/${slug}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
                    <ArrowLeft size={16} /> Store
                </Link>
                <span className="text-gray-300">|</span>
                <span className="text-sm font-medium text-gray-700">My Account</span>
                <div className="ml-auto">
                    <button onClick={() => { logout(); navigate(`/store/${slug}`); }}
                        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
                        <LogOut size={14} /> Logout
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <aside className="md:w-56 shrink-0">
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-50">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Signed in as</p>
                            <p className="font-semibold text-gray-900 truncate">{customer?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{customer?.email || customer?.phone}</p>
                        </div>
                        <nav className="p-2">
                            {tabs.map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                    style={activeTab === t.id ? { background: themeColor } : {}}>
                                    <t.icon size={16} />
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 min-w-0">

                    {/* ── ORDERS ── */}
                    {activeTab === 'orders' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-gray-900">My Orders</h2>
                            {ordersLoading ? (
                                <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
                            ) : orders.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                                    <ShoppingBag size={40} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-gray-500">You haven't placed any orders yet.</p>
                                    <Link to={`/store/${slug}`} className="mt-3 inline-block text-sm font-medium hover:underline" style={{ color: themeColor }}>
                                        Start shopping →
                                    </Link>
                                </div>
                            ) : orders.map(order => (
                                <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{order.orderNumber}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    {/* Items */}
                                    <div className="space-y-2 mb-3">
                                        {(order.items || []).slice(0, 2).map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm">
                                                {item.imageUrls?.[0] ? (
                                                    <img src={item.imageUrls[0]} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                        <Package size={14} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 truncate">{item.name}</p>
                                                    <p className="text-xs text-gray-400">Qty: {item.qty || item.quantity}</p>
                                                </div>
                                                <p className="font-semibold text-gray-900 shrink-0">
                                                    {CurrencySymbol[order.currency] || ''}{parseFloat(item.price).toFixed(2)}
                                                </p>
                                            </div>
                                        ))}
                                        {order.items?.length > 2 && (
                                            <p className="text-xs text-gray-400">+{order.items.length - 2} more items</p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                                        <p className="text-sm font-bold text-gray-900">
                                            Total: {CurrencySymbol[order.currency] || ''}{parseFloat(order.total || order.subtotal).toFixed(2)}
                                        </p>
                                        {order.trackingUrl && (
                                            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                                                className="text-xs font-medium hover:underline flex items-center gap-1" style={{ color: themeColor }}>
                                                Track Order <ChevronRight size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── ADDRESSES ── */}
                    {activeTab === 'addresses' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Saved Addresses</h2>
                                {!addingAddr && editingAddr === null && (
                                    <button onClick={() => { setAddingAddr(true); setAddrForm({ label: 'Home', name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false }); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white font-medium"
                                        style={{ background: themeColor }}>
                                        <Plus size={14} /> Add Address
                                    </button>
                                )}
                            </div>

                            {/* Add / Edit form */}
                            {(addingAddr || editingAddr !== null) && (
                                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                                    <h3 className="font-semibold text-gray-800">{editingAddr !== null ? 'Edit Address' : 'New Address'}</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { key: 'label', label: 'Label', placeholder: 'Home / Work / Other' },
                                            { key: 'name', label: 'Full Name', placeholder: 'John Doe' },
                                            { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                                            { key: 'address', label: 'Address', placeholder: 'Street, Building', cols: 2 },
                                            { key: 'city', label: 'City', placeholder: 'Mumbai' },
                                            { key: 'state', label: 'State', placeholder: 'Maharashtra' },
                                            { key: 'pincode', label: 'Pincode / ZIP', placeholder: '400001' },
                                        ].map(f => (
                                            <div key={f.key} className={f.cols === 2 ? 'col-span-2' : ''}>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                                                <input value={addrForm[f.key] || ''} onChange={e => setAddrForm(a => ({ ...a, [f.key]: e.target.value }))}
                                                    placeholder={f.placeholder}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                                            </div>
                                        ))}
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm(a => ({ ...a, isDefault: e.target.checked }))} />
                                        Set as default address
                                    </label>
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveAddress}
                                            className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-1.5" style={{ background: themeColor }}>
                                            <Check size={14} /> Save
                                        </button>
                                        <button onClick={() => { setAddingAddr(false); setEditingAddr(null); }}
                                            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 flex items-center gap-1.5">
                                            <X size={14} /> Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Address list */}
                            {addresses.length === 0 && !addingAddr && (
                                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                                    <MapPin size={36} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-gray-500 text-sm">No saved addresses yet.</p>
                                </div>
                            )}
                            {addresses.map((addr, idx) => (
                                <div key={idx} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{addr.label}</span>
                                            {addr.isDefault && <span className="text-xs font-semibold text-green-600">✓ Default</span>}
                                        </div>
                                        <p className="text-sm font-medium text-gray-800">{addr.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{addr.address}, {addr.city}, {addr.state} {addr.pincode}</p>
                                        {addr.phone && <p className="text-xs text-gray-500">{addr.phone}</p>}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => startEditAddr(idx)} className="p-1.5 text-gray-400 hover:text-gray-700">
                                            <Edit3 size={15} />
                                        </button>
                                        <button onClick={() => handleDeleteAddress(idx)} className="p-1.5 text-gray-400 hover:text-red-500">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── PROFILE ── */}
                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                            <h2 className="text-lg font-bold text-gray-900">Profile</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input value={customer?.email || ''} readOnly
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                                <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                                <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                            </div>
                            <button onClick={handleSaveProfile} disabled={savingProfile}
                                className="px-5 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
                                style={{ background: themeColor }}>
                                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : null}
                                Save Changes
                            </button>
                        </div>
                    )}

                    {/* ── SECURITY ── */}
                    {activeTab === 'security' && (
                        <div className="bg-white rounded-xl border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Change Password</h2>
                            {!customer?.email ? (
                                <p className="text-sm text-gray-500">You're using WhatsApp OTP login. Password management is not available.</p>
                            ) : (
                                <form onSubmit={handleChangePwd} className="space-y-4">
                                    {[
                                        { key: 'currentPassword', label: 'Current Password', placeholder: '••••••••' },
                                        { key: 'newPassword', label: 'New Password', placeholder: 'Min. 6 characters' },
                                        { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                            <input type="password" value={pwdForm[f.key]}
                                                onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                placeholder={f.placeholder} required
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                                        </div>
                                    ))}
                                    <button type="submit" disabled={savingPwd}
                                        className="px-5 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
                                        style={{ background: themeColor }}>
                                        {savingPwd ? <Loader2 size={14} className="animate-spin" /> : null}
                                        Update Password
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

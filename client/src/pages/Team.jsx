import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, UserPlus, Shield, MoreVertical, Trash2, Edit3, Link as LinkIcon,
    AlertCircle, Copy, Check, Info, BarChart2, X, MessageSquare, FileText,
    PieChart, Activity, ShieldCheck, Mail, Zap, Smartphone, Globe, Lock, CreditCard, Box, Settings, CheckCircle2,
    Sparkles, Plus, Minus, Clock, ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import TopHeader from '../components/TopHeader';
import { usePayment } from '../hooks/usePayment';

// Modern Skeleton Loader matching the Team page layout exactly
function TeamSkeleton() {
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-10 sm:pb-32 max-w-[1400px] max-w-full w-full mx-auto hide-scrollbar space-y-6 sm:space-y-10 animate-pulse">
                {/* Compact Executive Metrics Dashboard Header Skeleton */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 dark:from-black dark:via-surface-dark dark:to-indigo-950/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden text-white border border-slate-700/80 dark:border-white/10">
                    <div className="relative z-10 flex flex-col lg:flex-row gap-5 sm:gap-6 justify-between items-start lg:items-center">
                        {/* Copy & Titles Skeleton */}
                        <div className="w-full max-w-xl space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-5 w-28 rounded-full bg-white/15" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                <div className="h-4 w-32 bg-white/10 rounded" />
                            </div>
                            <div className="h-8 sm:h-9 w-52 sm:w-64 bg-white/20 rounded-xl" />
                            <div className="space-y-1.5 pt-1">
                                <div className="h-3.5 w-full sm:w-[420px] bg-white/10 rounded" />
                                <div className="h-3.5 w-3/4 sm:w-[320px] bg-white/10 rounded" />
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-1">
                                <div className="h-10 w-36 bg-white/20 rounded-xl" />
                                <div className="h-10 w-36 bg-white/10 rounded-xl" />
                            </div>
                        </div>

                        {/* Compact Capacity Widget Skeleton */}
                        <div className="w-full lg:w-[350px] shrink-0">
                            <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-3 w-28 bg-white/15 rounded" />
                                        <div className="h-7 w-24 bg-white/20 rounded-lg" />
                                    </div>
                                    <div className="h-7 w-20 bg-white/15 rounded-lg" />
                                </div>
                                <div className="h-2 w-full bg-white/15 rounded-full" />
                                <div className="flex items-center justify-between pt-1">
                                    <div className="h-3.5 w-24 bg-white/10 rounded" />
                                    <div className="h-3.5 w-14 bg-white/10 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Members List Header Skeleton */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 sm:px-4">
                        <div className="space-y-2">
                            <div className="h-7 w-44 bg-slate-200 dark:bg-white/10 rounded-lg" />
                            <div className="h-4 w-64 bg-slate-200 dark:bg-white/10 rounded" />
                        </div>
                        <div className="h-9 w-36 bg-slate-200 dark:bg-white/10 rounded-xl" />
                    </div>

                    {/* Member Cards Skeleton */}
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-sm"
                            >
                                <div className="flex gap-4 sm:gap-5 items-center w-full md:w-auto">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-200 dark:bg-white/10 shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 w-36 sm:w-44 bg-slate-200 dark:bg-white/10 rounded-md" />
                                        <div className="h-4 w-48 sm:w-56 bg-slate-200 dark:bg-white/10 rounded-md" />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                                    <div className="h-7 sm:h-8 w-20 sm:w-24 bg-slate-200 dark:bg-white/10 rounded-lg sm:rounded-xl" />
                                    <div className="h-7 sm:h-8 w-28 sm:w-32 bg-slate-200 dark:bg-white/10 rounded-lg sm:rounded-xl" />
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                    <div className="h-9 w-20 bg-slate-200 dark:bg-white/10 rounded-xl" />
                                    <div className="h-9 w-9 bg-slate-200 dark:bg-white/10 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Team() {
    const { user, fetchUser } = useAuth();
    const { showToast, showModal } = useUI();
    const navigate = useNavigate();
    const { initiatePayment } = usePayment();
    const [team, setTeam] = useState([]);
    const [memberLimit, setMemberLimit] = useState(0);
    const [planLimit, setPlanLimit] = useState(0);
    const [topupSeats, setTopupSeats] = useState(0);
    const [topupExpiry, setTopupExpiry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    // State for Buying More Team Seats
    const [isBuySeatsModalOpen, setIsBuySeatsModalOpen] = useState(false);
    const [seatPacks, setSeatPacks] = useState([]);
    const [loadingSeatPacks, setLoadingSeatPacks] = useState(false);
    const [selectedPack, setSelectedPack] = useState(null);
    const [purchaseQuantity, setPurchaseQuantity] = useState(1);
    const [processingPurchaseId, setProcessingPurchaseId] = useState(null);

    // State for View Management
    const [currentView, setCurrentView] = useState('list'); // 'list' | 'invite' | 'edit'

    // Form State (New member or editing)
    const [formRole, setFormRole] = useState('custom');
    const [formPermissions, setFormPermissions] = useState([]);
    const [formInboxVisibility, setFormInboxVisibility] = useState('see_all');
    const [formPhonePrivacy, setFormPhonePrivacy] = useState('visible');
    const [formCanDeleteChats, setFormCanDeleteChats] = useState(false);

    // Limit state
    const [editingMember, setEditingMember] = useState(null);

    // Available modular permissions (Grouped for UI)
    const permissionCategories = [
        {
            title: 'Core Features',
            options: [
                { id: 'menu_dashboard', label: 'Dashboard' },
                { id: 'menu_contacts', label: 'Contacts' },
                { id: 'menu_reports', label: 'Reports' },
                { id: 'menu_support', label: 'Support' },
                { id: 'menu_settings', label: 'Settings' },
                { id: 'menu_referrals', label: 'Refer & Earn' },
                { id: 'menu_integrations', label: 'Integrations & API' }
            ]
        },
        {
            title: 'WhatsApp Operations',
            options: [
                { id: 'menu_whatsapp_inbox', label: 'Inbox' },
                { id: 'menu_whatsapp_settings', label: 'Settings' },
                { id: 'menu_templates', label: 'Templates' },
                { id: 'menu_send_message', label: 'Send Message' },
                { id: 'menu_campaigns', label: 'Campaigns' }
            ]
        },
        {
            title: 'Growth & Marketing',
            options: [
                { id: 'menu_ctwa', label: 'Click To WhatsApp Ads' },
                { id: 'menu_meta_ads', label: 'Meta Ads Manager' }
            ]
        },
        {
            title: 'Commerce & Networking',
            options: [
                { id: 'menu_vcard', label: 'Digital veCard' },
                { id: 'menu_wastore', label: 'Online Store' },
                { id: 'menu_addons', label: 'Add-ons Market' }
            ]
        },
        {
            title: 'Automation',
            options: [
                { id: 'menu_flowbot', label: 'FlowBot Builder' }
            ]
        }
    ];

    const isSubUser = !!user?.parentUserId;

    // liveSubUser tracks the server-confirmed sub-user status (handles stale localStorage)
    const [liveSubUser, setLiveSubUser] = useState(null);
    const [liveTeamRole, setLiveTeamRole] = useState(null);

    useEffect(() => {
        const checkUserStatus = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                    headers: {}
                });
                const liveUser = res.data;
                if (liveUser.parentUserId) {
                    setLiveSubUser(true);
                    setLiveTeamRole(liveUser.teamRole);
                    setLoading(false);
                } else {
                    setLiveSubUser(false);
                    fetchTeam();
                }
            } catch (err) {
                setLiveSubUser(isSubUser);
                if (!isSubUser) fetchTeam();
                else setLoading(false);
            }
        };

        checkUserStatus();
        fetchSeatPacks();

        const socket = io(`${import.meta.env.VITE_API_URL || ''}`, {
            transports: ['websocket'],
            autoConnect: true
        });

        if (user) {
            socket.emit('user_connected', {
                userId: user.id,
                parentId: user.parentUserId
            });
        }

        socket.on('user_status_change', (data) => {
            setTeam(prevTeam =>
                prevTeam.map(member =>
                    member.id === data.userId ? { ...member, isOnline: data.isOnline } : member
                )
            );
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const fetchTeam = async () => {
        if (isSubUser) {
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/team`, {
                headers: {}
            });
            setTeam(res.data.members || []);
            setMemberLimit(res.data.limit || 0);
            setPlanLimit(res.data.planLimit || 0);
            setTopupSeats(res.data.topupSeats || 0);
            setTopupExpiry(res.data.topupExpiry || null);
        } catch (err) {
            console.error('Failed to fetch team:', err);
            showToast({ type: 'error', message: 'Failed to load team data' });
        } finally {
            setLoading(false);
        }
    };

    const fetchSeatPacks = async () => {
        setLoadingSeatPacks(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/store`, { withCredentials: true });
            const items = Array.isArray(res.data) ? res.data : [];
            const teamItems = items.filter(i => 
                (i.itemType === 'team_members' || 
                 (i.name && /team|seat|member/i.test(i.name) && !['messages', 'contacts', 'templates'].includes(i.itemType))
                ) && i.isActive !== false
            );
            setSeatPacks(teamItems);
            setSelectedPack(prev => (prev && teamItems.some(p => p.id === prev.id)) ? prev : (teamItems[0] || null));
        } catch (err) {
            console.error('Failed to load seat packs:', err);
        } finally {
            setLoadingSeatPacks(false);
        }
    };

    const handleOpenBuySeatsModal = () => {
        fetchSeatPacks();
        setIsBuySeatsModalOpen(true);
    };

    const handlePurchaseSeatPack = async (pack, qty = 1) => {
        if (!pack || processingPurchaseId) return;
        setProcessingPurchaseId(pack.id);

        const payload = {
            itemId: pack.id,
            quantity: qty,
            successUrl: `${window.location.origin}/team`,
            cancelUrl: window.location.href,
        };

        await initiatePayment({
            createOrderUrl: `${import.meta.env.VITE_API_URL}/api/billing/create-order`,
            verifyUrl: `${import.meta.env.VITE_API_URL}/api/billing/verify-payment`,
            payload: payload,
            onSuccess: async (data) => {
                showToast({
                    type: 'success',
                    title: 'Seats Purchased!',
                    message: data.message || `Added ${(pack.amount || 1) * qty} extra seat(s) to your workspace!`
                });
                if (fetchUser) await fetchUser();
                await fetchTeam();
                setIsBuySeatsModalOpen(false);
                setProcessingPurchaseId(null);
            },
            onFailure: () => {
                setProcessingPurchaseId(null);
            }
        });
    };

    const handleOpenInvite = () => {
        setFormRole('custom');
        setFormPermissions(['menu_dashboard', 'menu_whatsapp_inbox', 'menu_campaigns', 'menu_contacts', 'menu_reports']);
        setFormInboxVisibility('see_all');
        setFormPhonePrivacy('visible');
        setFormCanDeleteChats(false);
        setInviteLink('');
        setCurrentView('invite');
    };

    const handleOpenEdit = (member) => {
        setEditingMember(member);

        // Map legacy roles to standard roles
        let role = member.teamRole || 'custom';
        if (role === 'editor' || role === 'viewer') role = 'custom';
        setFormRole(role);

        setFormPermissions(member.teamPermissions || []);
        setFormInboxVisibility(member.teamPolicy?.inboxVisibility || 'see_all');
        setFormPhonePrivacy(member.teamPolicy?.phonePrivacy || 'visible');
        setFormCanDeleteChats(!!member.teamPolicy?.canDeleteChats);
        setCurrentView('edit');
    };

    const handleCloseForm = () => {
        setCurrentView('list');
        setEditingMember(null);
        setInviteLink('');
    };

    const handleGenerateInvite = async () => {
        setGenerating(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/team/invite`, {
                role: formRole,
                permissions: formPermissions,
                teamPolicy: {
                    inboxVisibility: formInboxVisibility,
                    phonePrivacy: formPhonePrivacy,
                    canDeleteChats: formCanDeleteChats
                }
            }, {
                headers: {}
            });
            setInviteLink(res.data.inviteLink);
            showToast({ type: 'success', title: 'Invite Generated', message: 'You can now copy the link.' });
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to generate invite';
            showModal({ type: 'error', title: 'Limit Reached', message: msg, confirmText: 'Close' });
        } finally {
            setGenerating(false);
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/team/${editingMember.id}/permissions`, {
                role: formRole,
                permissions: formPermissions,
                teamPolicy: {
                    inboxVisibility: formInboxVisibility,
                    phonePrivacy: formPhonePrivacy,
                    canDeleteChats: formCanDeleteChats
                }
            }, {
                headers: {}
            });
            showToast({ type: 'success', message: 'Team member updated successfully.' });
            handleCloseForm();
            fetchTeam();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', message: 'Failed to update team member.' });
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast({ type: 'info', message: 'Copied to clipboard' });
    };

    const handleViewStats = (member) => {
        navigate(`/team/${member.id}/analytics`);
    };

    const removeMember = async (memberId) => {
        showModal({
            type: 'warning',
            title: 'Remove Team Member',
            message: 'Are you sure you want to remove this member? They will lose access to your workspace immediately.',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL}/api/team/${memberId}`, {
                        headers: {}
                    });
                    showToast({ type: 'success', message: 'Member removed successfully.' });
                    fetchTeam();
                } catch (err) {
                    showToast({ type: 'error', message: 'Failed to remove member.' });
                }
            }
        });
    };

    if (loading || liveSubUser === null) return <TeamSkeleton />;

    if (liveSubUser) {
        const roleColor = liveTeamRole === 'admin' ? 'purple' : liveTeamRole === 'editor' ? 'green' : 'blue';
        return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
                <TopHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 max-w-5xl mx-auto space-y-6 w-full custom-scrollbar">
                    <div className={`bg-${roleColor}-50 dark:bg-${roleColor}-900/20 border border-${roleColor}-200 dark:border-${roleColor}-800 p-8 rounded-2xl flex items-center gap-6 shadow-sm`}>
                        <Shield className={`w-12 h-12 text-${roleColor}-500 shrink-0`} />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workspace Member</h2>
                            <p className="text-slate-600 dark:text-slate-300 mt-2">
                                You are a member of this workspace. Your role is: <strong className={`uppercase px-2 py-0.5 rounded bg-${roleColor}-100 dark:bg-${roleColor}-900/30 text-${roleColor}-700 dark:text-${roleColor}-300`}>{liveTeamRole || 'Member'}</strong>
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">
                                Only the workspace owner can manage team members and invite new people.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Reuseable Policy Form Component for Invite/Edit
    const PolicyFormContent = ({ title, isEdit }) => (
        <div className="space-y-6 animate-in slide-in-from-bottom-6 fade-in duration-500 max-w-6xl mx-auto">
            {/* Header Modal-like */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                    <button onClick={handleCloseForm} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-white/10 group">
                        <X className="w-5 h-5 text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            {title}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure advanced permissions, roles, and privacy bounds.</p>
                    </div>
                </div>
                {!isEdit && (
                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-bold border border-blue-200 dark:border-blue-500/30">
                        <Info className="w-4 h-4" /> Changes take effect immediately upon join.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                {/* Left Column: Role & Modular Permissions */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Role Selector */}
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-4 md:p-8 shadow-xl shadow-slate-200/20 dark:shadow-black/40">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-indigo-500" /> Administrative Role
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { id: 'admin', title: 'Admin', desc: 'Full access to all features except billing, team, account deletion.', icon: <Zap className="w-5 h-5" /> },
                                { id: 'custom', title: 'Custom Access', desc: 'Granular control over specific menus and tools.', icon: <Settings className="w-5 h-5" /> }
                            ].map(role => (
                                <div
                                    key={role.id}
                                    onClick={() => setFormRole(role.id)}
                                    className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${formRole === role.id
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500 shadow-md shadow-indigo-500/20 transform scale-[1.02]'
                                        : 'border-slate-200 bg-white dark:bg-slate-900/50 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        } cursor-pointer`}
                                >
                                    <div className={`flex items-center gap-3 mb-2 ${formRole === role.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {role.icon}
                                        <span className="font-bold">{role.title}</span>
                                    </div>
                                    <p className={`text-xs ${formRole === role.id ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}>
                                        {role.desc}
                                    </p>
                                    {formRole === role.id && <div className="absolute top-4 right-4 w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)] max-w-full"></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Permissions Grid */}
                    <div className={`transition-all duration-500 ${formRole === 'admin' ? 'opacity-50 pointer-events-none filter grayscale' : 'opacity-100'}`}>
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-4 md:p-8 shadow-xl shadow-slate-200/20 dark:shadow-black/40">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                                <Activity className="w-6 h-6 text-emerald-500" /> Module Access
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Select specific compartments this member can access within the dashboard.</p>

                            <div className="space-y-6">
                                {permissionCategories.map((category, idx) => (
                                    <div key={idx}>
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            {category.title}
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {category.options.map(opt => (
                                                <label key={opt.id} className="flex items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer group">
                                                    <div className="relative flex items-center justify-center mr-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={formPermissions.includes(opt.id) || formRole === 'admin'}
                                                            onChange={(e) => {
                                                                if (formRole === 'admin') return;
                                                                if (e.target.checked) setFormPermissions([...formPermissions, opt.id]);
                                                                else setFormPermissions(formPermissions.filter(p => p !== opt.id));
                                                            }}
                                                            className="w-5 h-5 text-indigo-600 rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                                        />
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 select-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {opt.label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: WhatsApp Policies */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-4 md:p-8 shadow-xl shadow-slate-200/20 dark:shadow-black/40 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-orange-500" /> Inbox Policy bounds
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Dictate what conversations and customer details this user is exposed to.</p>

                        <div className="space-y-8">
                            {/* Visibility Stack */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Conversation Visibility</label>
                                <div className="space-y-3">
                                    {[
                                        { id: 'see_all', title: 'Global Omniscience', desc: 'Can view and reply to any inbox conversation across the workspace.' },
                                        { id: 'see_all_reply_assigned', title: 'Observe & Lock', desc: 'Can view everything, but only reply to explicitly assigned chats.' },
                                        { id: 'see_assigned', title: 'Isolated Tunnel', desc: 'Strictly sees and interacts only with assigned conversations.' }
                                    ].map(opt => (
                                        <div
                                            key={opt.id}
                                            onClick={() => setFormInboxVisibility(opt.id)}
                                            className={`p-4 rounded-2xl cursor-pointer border transition-all duration-300 ${formInboxVisibility === opt.id
                                                ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
                                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                                                } cursor-pointer`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm font-bold ${formInboxVisibility === opt.id ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.title}</span>
                                                {formInboxVisibility === opt.id && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                                            </div>
                                            <p className={`text-xs ${formInboxVisibility === opt.id ? 'text-orange-700/70 dark:text-orange-300/70' : 'text-slate-500 dark:text-slate-400'}`}>{opt.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Privacy Controls */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Privacy - Customer Phone Number</label>
                                <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-2 flex">
                                    {[
                                        { id: 'visible', label: 'Visible' },
                                        { id: 'blurred', label: 'Blurred' },
                                        { id: 'masked', label: 'Masked' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFormPhonePrivacy(opt.id)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${formPhonePrivacy === opt.id
                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 flex flex-col items-center justify-center gap-1 shadow-inner">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Live Preview </span>
                                    <div className={`font-mono text-lg font-medium tracking-wider text-slate-800 dark:text-slate-200 transition-all duration-300 ${formPhonePrivacy === 'blurred' ? 'blur-sm select-none opacity-80' : ''}`}>
                                        {formPhonePrivacy === 'visible' || formPhonePrivacy === 'blurred' ? '+1 (555) 123-4567' : '+1 (555) ***-**67'}
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5 px-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> Affects display of raw phone numbers.
                                </p>
                            </div>

                            {/* Deletion Control */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Conversation Management</label>
                                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    <div>
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Allow Conversation Deletion</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Allows the user to permanently delete chats and messages.</div>
                                    </div>
                                    <div className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none shrink-0" style={{ backgroundColor: formCanDeleteChats ? '#10b981' : '#cbd5e1' }}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formCanDeleteChats}
                                            onChange={(e) => setFormCanDeleteChats(e.target.checked)}
                                        />
                                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${formCanDeleteChats ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar Footer */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-slate-200 dark:border-white/10 mt-8">
                {isEdit ? (
                    <>
                        <button
                            onClick={handleUpdateMember}
                            className="w-full sm:w-auto px-4 md:px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/25 transition-all text-lg"
                        >
                            Commit Changes
                        </button>
                        <button
                            onClick={handleCloseForm}
                            className="w-full sm:w-auto px-4 md:px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all"
                        >
                            Discard
                        </button>
                    </>
                ) : (
                    <div className="w-full">
                        {!inviteLink ? (
                            <button
                                onClick={handleGenerateInvite}
                                disabled={generating}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                {generating ? <Activity className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6 fill-white/20" /> Generate Magic Invite Link</>}
                            </button>
                        ) : (
                            <div className="p-4 md:p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-in zoom-in-95 duration-300 shadow-inner space-y-4">
                                <p className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white dark:text-slate-900" /> Link Ready to Dispatch (Valid 24h)
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        readOnly
                                        value={inviteLink}
                                        className="bg-white dark:bg-black/40 border border-emerald-500/20 text-slate-700 dark:text-slate-300 font-mono text-sm px-4 py-3 rounded-xl flex-1 outline-none truncate"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className="px-4 md:px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />} {copied ? 'Copied!' : 'Copy to Clipboard'}
                                    </button>
                                </div>
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-200 mt-2">
                                    <h4 className="font-bold mb-2 flex items-center gap-1.5"><Info className="w-4 h-4" /> Quick Guide</h4>
                                    <ul className="list-disc list-inside space-y-1.5 opacity-90 text-xs leading-relaxed">
                                        <li>Share this link securely with your colleague via email or a direct message.</li>
                                        <li>The link contains a cryptographic token that strictly expires <strong>24 hours</strong> from creation.</li>
                                        <li>Once they click the link, they will be prompted to create their account and will automatically be placed into your workspace with the permissions you configured above.</li>
                                        <li>If the link expires before they use it, you must discard this and generate a new one.</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const occupiedSlots = team.filter(m => m.id !== user.id).length;
    const availableSlots = memberLimit > 0 ? Math.max(memberLimit - occupiedSlots, 0) : '∞';
    const limitPercentage = memberLimit > 0 ? Math.min((occupiedSlots / memberLimit) * 100, 100) : (occupiedSlots > 0 ? 10 : 0);
    const isLimitReached = memberLimit > 0 && occupiedSlots >= memberLimit;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-10 sm:pb-32 max-w-[1400px] max-w-full w-full mx-auto hide-scrollbar">

                {currentView === 'invite' && <PolicyFormContent title="Deploy New Member" isEdit={false} />}
                {currentView === 'edit' && <PolicyFormContent title={`Configuring ${editingMember?.name}`} isEdit={true} />}

                {currentView === 'list' && (
                        <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Compact Executive Metrics Dashboard Header */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 dark:from-black dark:via-surface-dark dark:to-indigo-950/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden text-white border border-slate-700/80 dark:border-white/10">
                            {/* Subtle background glow */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col lg:flex-row gap-5 sm:gap-6 justify-between items-start lg:items-center">

                                {/* Copy & Titles */}
                                <div className="max-w-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                            Workspace Hub
                                        </span>
                                        <span className="text-white/40 text-xs">•</span>
                                        <span className="text-white/60 text-xs font-medium">Team Management</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                                        Team Assembly
                                    </h1>
                                    <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed mt-1 max-w-lg">
                                        Scale your operations. Govern custom roles, allocate inbox bounds, and monitor member analytics from a single command center.
                                    </p>

                                    {/* Action buttons */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                                        <button
                                            onClick={handleOpenInvite}
                                            disabled={isLimitReached}
                                            className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm whitespace-nowrap shadow-sm ${
                                                isLimitReached
                                                    ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
                                                    : 'bg-white text-slate-900 hover:bg-slate-100 hover:scale-[1.01] active:scale-[0.98]'
                                            }`}
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            <span>{isLimitReached ? 'Capacity Full' : 'Invite Colleague'}</span>
                                        </button>

                                        {/* Direct "Buy More Seats" Button — Always Available */}
                                        <button
                                            onClick={handleOpenBuySeatsModal}
                                            className="px-4 sm:px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm whitespace-nowrap bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-500/25 active:scale-[0.98]"
                                        >
                                            <Sparkles className="w-4 h-4 text-violet-200" />
                                            <span>Buy More Seats</span>
                                        </button>

                                        {isLimitReached && (
                                            <span className="text-xs text-red-400 font-semibold flex items-center gap-1.5 ml-1">
                                                <AlertCircle className="w-3.5 h-3.5" /> All seats filled
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Compact Capacity Widget */}
                                <div className="w-full lg:w-[350px] shrink-0">
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-3 relative z-10">
                                            <div>
                                                <div className="text-white/60 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 mb-0.5">
                                                    <Box className="w-3.5 h-3.5 text-white/40" /> Workspace Capacity
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{occupiedSlots}</span>
                                                    <span className="text-sm sm:text-base font-bold text-white/40">/ {memberLimit > 0 ? memberLimit : '∞'} seats</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border backdrop-blur-md flex items-center gap-1.5 ${
                                                    isLimitReached 
                                                        ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                }`}>
                                                    {isLimitReached ? <AlertCircle className="w-3.5 h-3.5" /> : <PieChart className="w-3.5 h-3.5" />}
                                                    {availableSlots} Free
                                                </span>
                                                <button
                                                    onClick={handleOpenBuySeatsModal}
                                                    className="text-[11px] text-violet-300 hover:text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" /> Top up seats
                                                </button>
                                            </div>
                                        </div>

                                        {/* Slim Progress Track */}
                                        <div className="relative z-10 w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/10">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    isLimitReached ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                                }`}
                                                style={{ width: `${limitPercentage}%` }}
                                            />
                                        </div>

                                        {/* Breakdown chips */}
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-[10px] text-white/60 relative z-10">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {planLimit > 0 && (
                                                    <span className="bg-white/10 px-2 py-0.5 rounded text-white/70">
                                                        {planLimit} plan
                                                    </span>
                                                )}
                                                {topupSeats > 0 && (
                                                    <span className="text-violet-300 bg-violet-500/20 border border-violet-400/30 px-2 py-0.5 rounded font-medium">
                                                        +{topupSeats} topup{topupExpiry && ` (exp ${new Date(topupExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-semibold text-white/80">{limitPercentage.toFixed(0)}% used</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Premium List Design */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 sm:px-4 mb-2">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                                        <Users className="w-6 h-6 text-indigo-500" />
                                        Team Members
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                                        Manage permissions, view analytics, and control access.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl shadow-sm w-full sm:w-auto justify-center sm:justify-start shrink-0">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                        {team.length} Active Member{team.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 animate-pulse">
                                            <div className="flex gap-4 sm:gap-5 items-center w-full md:w-auto">
                                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-200 dark:bg-slate-700 shrink-0"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 w-full md:w-auto mt-2 sm:mt-0">
                                                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-20"></div>
                                                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-20"></div>
                                            </div>
                                            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-32 md:w-40 mt-2 sm:mt-0"></div>
                                        </div>
                                    ))
                                ) : team.map(member => (
                                    <div key={member.id} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:border-indigo-500/30 transition-all duration-300 group">

                                        {/* Identity Block */}
                                        <div className="flex gap-4 sm:gap-5 items-center w-full md:w-auto">
                                            <div className="relative shrink-0">
                                                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl shadow-inner
                                                ${member.id === user.id
                                                        ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none'
                                                        : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                                                >
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[3px] sm:border-4 border-white dark:border-surface-dark transition-colors duration-300
                                                ${member.isOnline ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-xl flex flex-wrap items-center gap-2">
                                                    <span className="truncate max-w-[150px] sm:max-w-none">{member.name}</span>
                                                    {member.id === user.id && <span className="text-[9px] sm:text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 sm:px-2.5 rounded-full uppercase tracking-widest font-black shrink-0">Owner</span>}
                                                </h3>
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">{member.email}</p>
                                            </div>
                                        </div>

                                        {/* Badges Container */}
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0 p-3 sm:p-4 md:p-0 bg-slate-50 md:bg-transparent dark:bg-slate-900/40 md:dark:bg-transparent rounded-xl sm:rounded-2xl md:rounded-none">

                                            {/* Status Badges */}
                                            <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2
                                            ${member.teamRole === 'owner' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' :
                                                    member.teamRole === 'admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20' :
                                                        'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
                                            >
                                                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                {member.teamRole}
                                            </span>

                                            {member.teamPolicy && (
                                                <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" title="Inbox Visibility">
                                                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                                    <span className="truncate">
                                                        {member.teamPolicy.inboxVisibility === 'see_all' ? 'All Chats' :
                                                            member.teamPolicy.inboxVisibility === 'see_all_reply_assigned' ? 'View/Lock' : 'Assigned Only'}
                                                        {member.teamPolicy.phonePrivacy === 'masked' ? ' (***)' : member.teamPolicy.phonePrivacy === 'blurred' ? ' (Blur)' : ''}
                                                    </span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {member.id !== user.id && (
                                            <div className="flex w-full md:w-auto justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 md:-translate-x-4 md:group-hover:translate-x-0 mt-2 md:mt-0">
                                                <button
                                                    onClick={() => handleViewStats(member)}
                                                    className="flex-1 md:flex-none p-2 sm:p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg sm:rounded-xl transition-all font-bold flex items-center justify-center gap-2 text-xs sm:text-sm"
                                                    title="View Member Analytics"
                                                >
                                                    <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    <span className="md:hidden">Stats</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(member)}
                                                    className="flex-1 md:flex-none p-2 sm:p-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-lg sm:rounded-xl transition-all font-bold flex items-center justify-center gap-2 text-xs sm:text-sm"
                                                    title="Config"
                                                >
                                                    <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    <span className="md:hidden">Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => removeMember(member.id)}
                                                    className="flex-1 md:flex-none p-2 sm:p-3 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-lg sm:rounded-xl transition-all font-bold flex items-center justify-center gap-2 text-xs sm:text-sm"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    <span className="md:hidden">Remove</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Buy More Team Seats Modal */}
            {isBuySeatsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-white/10 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                        Add Team Member Seats
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Current capacity: <strong className="text-slate-700 dark:text-slate-200">{memberLimit} seats</strong> ({occupiedSlots} in use)
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBuySeatsModalOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
                            {loadingSeatPacks ? (
                                <div className="space-y-3 animate-pulse py-1">
                                    <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded" />
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 shrink-0" />
                                                <div className="space-y-1.5">
                                                    <div className="h-4 w-28 sm:w-36 bg-slate-200 dark:bg-white/10 rounded" />
                                                    <div className="h-3 w-36 sm:w-48 bg-slate-200 dark:bg-white/10 rounded" />
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-right shrink-0">
                                                <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded ml-auto" />
                                                <div className="h-2.5 w-10 bg-slate-200 dark:bg-white/10 rounded ml-auto" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : seatPacks.length === 0 ? (
                                <div className="py-10 text-center px-4 space-y-4">
                                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center">
                                        <Box className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-slate-900 dark:text-white">No Seat Top-ups Configured Yet</h4>
                                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                            No active team member top-up packs are available right now in the store. You can check the main store or upgrade your plan.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center gap-3 pt-2">
                                        <button
                                            onClick={() => { setIsBuySeatsModalOpen(false); navigate('/store'); }}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                                        >
                                            Visit Store
                                        </button>
                                        <button
                                            onClick={() => { setIsBuySeatsModalOpen(false); navigate('/app/billing'); }}
                                            className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                                        >
                                            Upgrade Plan
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                                            Select Seat Pack
                                        </label>
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {seatPacks.map(pack => {
                                                const isSelected = selectedPack?.id === pack.id;
                                                const validityLabel = pack.validityMonths === 1 ? '1 Month' : pack.validityMonths === 3 ? '3 Months' : pack.validityMonths === 6 ? '6 Months' : '1 Year';
                                                return (
                                                    <div
                                                        key={pack.id}
                                                        onClick={() => setSelectedPack(pack)}
                                                        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                            isSelected
                                                                ? 'border-violet-600 bg-violet-50/60 dark:bg-violet-900/20 shadow-md shadow-violet-500/10'
                                                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-slate-900/50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                                isSelected
                                                                    ? 'bg-violet-600 text-white'
                                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'
                                                            }`}>
                                                                <Users className="w-5 h-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                                        {pack.name}
                                                                    </h4>
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 shrink-0">
                                                                        +{pack.amount} {pack.amount === 1 ? 'Seat' : 'Seats'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                    <span>Valid for {validityLabel} from purchase</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-right shrink-0">
                                                            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                                                {pack.currency === 'USD' ? '$' : '₹'}{pack.price}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-medium">per unit</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Quantity selection */}
                                    {selectedPack && (
                                        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Quantity</span>
                                                <span className="text-[11px] text-slate-500">
                                                    Adding {(selectedPack.amount || 1) * purchaseQuantity} seat{((selectedPack.amount || 1) * purchaseQuantity) !== 1 ? 's' : ''} to workspace
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-1 shadow-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                                                    disabled={purchaseQuantity <= 1}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-8 text-center font-bold text-sm text-slate-900 dark:text-white select-none">
                                                    {purchaseQuantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setPurchaseQuantity(purchaseQuantity + 1)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Price & Summary Box */}
                                    {selectedPack && (
                                        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-purple-600/10 border border-violet-500/20 space-y-2">
                                            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                                <span>New Workspace Limit:</span>
                                                <strong className="text-slate-900 dark:text-white">
                                                    {memberLimit} ➔ {memberLimit + ((selectedPack.amount || 1) * purchaseQuantity)} seats
                                                </strong>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                                <span>Seat Validity:</span>
                                                <strong className="text-violet-600 dark:text-violet-400">
                                                    {selectedPack.validityMonths === 1 ? '1 Month' : selectedPack.validityMonths === 3 ? '3 Months' : selectedPack.validityMonths === 6 ? '6 Months' : '1 Year'}
                                                </strong>
                                            </div>
                                            <div className="pt-2 border-t border-violet-500/20 flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">Total Amount:</span>
                                                <span className="text-xl font-black text-violet-600 dark:text-violet-400">
                                                    {selectedPack.currency === 'USD' ? '$' : '₹'}
                                                    {(parseFloat(selectedPack.price || 0) * purchaseQuantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        {seatPacks.length > 0 && selectedPack && (
                            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.02]">
                                <button
                                    onClick={() => { setIsBuySeatsModalOpen(false); navigate('/store'); }}
                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                >
                                    Browse all top-ups ↗
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsBuySeatsModalOpen(false)}
                                        className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handlePurchaseSeatPack(selectedPack, purchaseQuantity)}
                                        disabled={!!processingPurchaseId}
                                        className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                                    >
                                        {processingPurchaseId ? (
                                            <><Activity className="w-4 h-4 animate-spin" /> Processing...</>
                                        ) : (
                                            <><CreditCard className="w-4 h-4" /> Pay & Activate Seats</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, UserPlus, Shield, MoreVertical, Trash2, Edit3, Link as LinkIcon,
    AlertCircle, Copy, Check, Info, BarChart2, X, MessageSquare, FileText,
    PieChart, Activity, ShieldCheck, Mail, Zap, Smartphone, Globe, Lock, CreditCard, Box, Settings, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import TopHeader from '../components/TopHeader';

export default function Team() {
    const { user } = useAuth();
    const { showToast, showModal } = useUI();
    const navigate = useNavigate();
    const [team, setTeam] = useState([]);
    const [memberLimit, setMemberLimit] = useState(0);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    // State for View Management
    const [currentView, setCurrentView] = useState('list'); // 'list' | 'invite' | 'edit'

    // Form state (Shared for Invite & Edit)
    const [formRole, setFormRole] = useState('custom');
    const [formPermissions, setFormPermissions] = useState(['menu_dashboard', 'menu_whatsapp_inbox', 'menu_campaigns', 'menu_contacts', 'menu_reports']);
    const [formInboxVisibility, setFormInboxVisibility] = useState('see_all');
    const [formPhonePrivacy, setFormPhonePrivacy] = useState('visible');

    // Edit specific state
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
                { id: 'menu_settings', label: 'Settings' }
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
            title: 'E-Commerce',
            options: [
                { id: 'menu_addons', label: 'Add-ons Market' }
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
                    headers: { }
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

        const socket = io(`${import.meta.env.VITE_API_URL}`, {
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
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/team`, {
                headers: { }
            });
            setTeam(res.data.members || []);
            setMemberLimit(res.data.limit || 0);
        } catch (err) {
            console.error('Failed to fetch team:', err);
            showToast({ type: 'error', message: 'Failed to load team data' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenInvite = () => {
        setFormRole('custom');
        setFormPermissions(['menu_dashboard', 'menu_whatsapp_inbox', 'menu_campaigns', 'menu_contacts', 'menu_reports']);
        setFormInboxVisibility('see_all');
        setFormPhonePrivacy('visible');
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
                    phonePrivacy: formPhonePrivacy
                }
            }, {
                headers: { }
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
                    phonePrivacy: formPhonePrivacy
                }
            }, {
                headers: { }
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
                        headers: { }
                    });
                    showToast({ type: 'success', message: 'Member removed successfully.' });
                    fetchTeam();
                } catch (err) {
                    showToast({ type: 'error', message: 'Failed to remove member.' });
                }
            }
        });
    };

    if (loading || liveSubUser === null) return <div className="p-8 text-slate-500">Loading team...</div>;

    if (liveSubUser) {
        const roleColor = liveTeamRole === 'admin' ? 'purple' : liveTeamRole === 'editor' ? 'green' : 'blue';
        return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
                <TopHeader />
                <div className="flex-1 overflow-y-auto p-8 pb-32 max-w-5xl mx-auto space-y-6 w-full custom-scrollbar">
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
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/20 dark:shadow-black/40">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-indigo-500" /> Administrative Role
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { id: 'admin', title: 'Admin', desc: 'Full unfettered access to all features except billing.', icon: <Zap className="w-5 h-5" /> },
                                { id: 'custom', title: 'Custom Access', desc: 'Granular control over specific menus and tools.', icon: <Settings className="w-5 h-5" /> }
                            ].map(role => (
                                <div
                                    key={role.id}
                                    onClick={() => setFormRole(role.id)}
                                    className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${formRole === role.id
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500 shadow-md shadow-indigo-500/20 transform scale-[1.02]'
                                        : 'border-slate-200 bg-white dark:bg-slate-900/50 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                >
                                    <div className={`flex items-center gap-3 mb-2 ${formRole === role.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {role.icon}
                                        <span className="font-bold">{role.title}</span>
                                    </div>
                                    <p className={`text-xs ${formRole === role.id ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}>
                                        {role.desc}
                                    </p>
                                    {formRole === role.id && <div className="absolute top-4 right-4 w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Permissions Grid */}
                    <div className={`transition-all duration-500 ${formRole === 'admin' ? 'opacity-50 pointer-events-none filter grayscale' : 'opacity-100'}`}>
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/20 dark:shadow-black/40">
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
                    <div className="bg-slate-900 dark:bg-black border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-orange-400" /> Inbox Policy bounds
                        </h3>
                        <p className="text-sm text-slate-400 mb-8">Dictate what conversations and customer details this user is exposed to.</p>

                        <div className="space-y-8">
                            {/* Visibility Stack */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Conversation Visibility</label>
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
                                                ? 'bg-orange-500/20 border-orange-500/50'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm font-bold ${formInboxVisibility === opt.id ? 'text-orange-400' : 'text-slate-200'}`}>{opt.title}</span>
                                                {formInboxVisibility === opt.id && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                                            </div>
                                            <p className="text-xs text-slate-400">{opt.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Privacy Controls */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Privacy - Customer Phone Number</label>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex">
                                    {[
                                        { id: 'visible', label: 'Visible' },
                                        { id: 'blurred', label: 'Blurred' },
                                        { id: 'masked', label: 'Masked' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFormPhonePrivacy(opt.id)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${formPhonePrivacy === opt.id
                                                ? 'bg-white text-slate-900 shadow-md'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5 px-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> Affects display of raw phone numbers.
                                </p>
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
                            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/25 transition-all text-lg"
                        >
                            Commit Changes
                        </button>
                        <button
                            onClick={handleCloseForm}
                            className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all"
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
                            <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-in zoom-in-95 duration-300 shadow-inner">
                                <p className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold mb-4">
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
                                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />} {copied ? 'Copied!' : 'Copy to Clipboard'}
                                    </button>
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32 max-w-[1400px] w-full mx-auto custom-scrollbar">

            {currentView === 'invite' && <PolicyFormContent title="Deploy New Member" isEdit={false} />}
            {currentView === 'edit' && <PolicyFormContent title={`Configuring ${editingMember?.name}`} isEdit={true} />}

            {currentView === 'list' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

                    {/* Advanced Metrics Dashboard Header */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 dark:from-black dark:via-surface-dark dark:to-indigo-950/20 rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white border border-slate-700 dark:border-white/5">
                        {/* Abstract Background Elements */}
                        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col xl:flex-row gap-10 justify-between items-start xl:items-center">

                            {/* Copy & Titles */}
                            <div className="max-w-xl">
                                <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-black uppercase tracking-widest text-indigo-300 mb-6 inline-block">
                                    Workspace Hub
                                </span>
                                <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight leading-tight">
                                    Team Assembly
                                </h1>
                                <p className="text-slate-300 text-lg sm:text-xl font-medium leading-relaxed">
                                    Scale your operations. Govern custom roles, allocate inbox bounds, and monitor member analytics from a single command center.
                                </p>

                                <button
                                    onClick={handleOpenInvite}
                                    disabled={isLimitReached}
                                    className={`mt-8 px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 whitespace-nowrap ${isLimitReached
                                        ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
                                        : 'bg-white text-slate-900 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/10'
                                        }`}
                                >
                                    <UserPlus className="w-5 h-5" />
                                    {isLimitReached ? 'Capacity Reached' : 'Invite New Colleague'}
                                </button>
                                {isLimitReached && (
                                    <p className="mt-3 text-sm text-red-400 font-semibold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Please upgrade your plan to unlock more seats.
                                    </p>
                                )}
                            </div>

                            {/* Metrics Glass Cards */}
                            <div className="w-full xl:w-auto grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                                {/* Total Capacity */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center mb-3">
                                        <Box className="w-6 h-6" />
                                    </div>
                                    <div className="text-3xl font-black text-white">{memberLimit > 0 ? memberLimit : '∞'}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Seats</div>
                                </div>

                                {/* Active */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
                                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-3 relative z-10">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div className="text-3xl font-black text-white relative z-10">{occupiedSlots}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Joined</div>
                                </div>

                                {/* Available */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mb-3">
                                        <PieChart className="w-6 h-6" />
                                    </div>
                                    <div className="text-3xl font-black text-white">{availableSlots}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Available</div>
                                </div>

                                {/* Unified Progress Bar Spanning across cards */}
                                <div className="col-span-1 sm:col-span-3 mt-2">
                                    <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden flex border border-white/5">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${isLimitReached ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'}`}
                                            style={{ width: `${limitPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Premium List Design */}
                    <div className="space-y-4">
                        <div className="px-6 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Active Personnel Roster
                            </h2>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {team.length} Total Users
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {team.map(member => (
                                <div key={member.id} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:border-indigo-500/30 transition-all duration-300 group">

                                    {/* Identity Block */}
                                    <div className="flex gap-5 items-center w-full md:w-auto">
                                        <div className="relative shrink-0">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner
                                                ${member.id === user.id
                                                    ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none'
                                                    : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                                            >
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-surface-dark transition-colors duration-300
                                                ${member.isOnline ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xl flex items-center gap-2">
                                                {member.name}
                                                {member.id === user.id && <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-black">Owner</span>}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">{member.email}</p>
                                        </div>
                                    </div>

                                    {/* Badges Container */}
                                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-2 md:mt-0 p-4 md:p-0 bg-slate-50 md:bg-transparent dark:bg-slate-900/40 md:dark:bg-transparent rounded-2xl md:rounded-none">

                                        {/* Status Badges */}
                                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2
                                            ${member.teamRole === 'owner' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' :
                                                member.teamRole === 'admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20' :
                                                    'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
                                        >
                                            <Shield className="w-4 h-4" />
                                            {member.teamRole}
                                        </span>

                                        {member.teamPolicy && (
                                            <span className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" title="Inbox Visibility">
                                                <MessageSquare className="w-4 h-4" />
                                                {member.teamPolicy.inboxVisibility === 'see_all' ? 'All Chats' :
                                                    member.teamPolicy.inboxVisibility === 'see_all_reply_assigned' ? 'View/Lock' : 'Assigned Only'}

                                                {member.teamPolicy.phonePrivacy === 'masked' ? ' (***)' : member.teamPolicy.phonePrivacy === 'blurred' ? ' (Blur)' : ''}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {member.id !== user.id && (
                                        <div className="flex w-full md:w-auto justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 md:-translate-x-4 md:group-hover:translate-x-0">
                                            <button
                                                onClick={() => handleViewStats(member)}
                                                className="flex-1 md:flex-none p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-xl transition-all font-bold flex items-center justify-center gap-2 text-sm"
                                                title="View Member Analytics"
                                            >
                                                <BarChart2 className="w-5 h-5" />
                                                <span className="md:hidden">Stats</span>
                                            </button>
                                            <button
                                                onClick={() => handleOpenEdit(member)}
                                                className="flex-1 md:flex-none p-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl transition-all font-bold flex items-center justify-center gap-2 text-sm"
                                                title="Config"
                                            >
                                                <Edit3 className="w-5 h-5" />
                                                <span className="md:hidden">Edit</span>
                                            </button>
                                            <button
                                                onClick={() => removeMember(member.id)}
                                                className="flex-1 md:flex-none p-3 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-xl transition-all font-bold flex items-center justify-center gap-2 text-sm"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-5 h-5" />
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
        </div>
    );
}

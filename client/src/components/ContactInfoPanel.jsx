import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { X, User, Phone, Tag, FileText, Trash2, MessageSquare, Clock, Tags, Users, ChevronDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import ManageLabelsModal from './ManageLabelsModal';

const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

export default function ContactInfoPanel({ conversation, onClose, onUpdate, teamPolicy, isSubMember }) {
    const panelRef = useRef(null);
    const [notes, setNotes] = useState(conversation?.notes || '');
    const [labels, setLabels] = useState(conversation?.labels || []);
    const [savingNotes, setSavingNotes] = useState(false);
    const [messageCount, setMessageCount] = useState(0);

    const [availableLabels, setAvailableLabels] = useState([]);
    const [showLabelsModal, setShowLabelsModal] = useState(false);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const [groupSearch, setGroupSearch] = useState('');

    const [contact, setContact] = useState(null);
    const [contactGroups, setContactGroups] = useState([]);
    const [availableGroups, setAvailableGroups] = useState([]);

    const fetchLabels = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/labels`);
            setAvailableLabels(res.data);
        } catch (err) {
            console.error('Failed to load labels', err);
        }
    }, []);

    const fetchGroups = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/groups`);
            // The API returns an array of Group objects { id, name, description, ... }
            setAvailableGroups(res.data);
        } catch (err) {
            console.error('Failed to load groups', err);
        }
    }, []);

    useEffect(() => {
        fetchLabels();
        fetchGroups();
    }, [fetchLabels, fetchGroups]);

    // Re-fetch labels when ManageLabelsModal is closed to ensure we have the latest list
    useEffect(() => {
        if (!showLabelsModal) {
            fetchLabels();
        }
    }, [showLabelsModal, fetchLabels]);

    useEffect(() => {
        if (!conversation) return;
        setNotes(conversation.notes || '');
        setLabels(conversation.labels || []);

        // Fetch contact details for groups
        if (conversation.id) {
            setContact(null);
            setContactGroups([]);
            axios.get(`${API_BASE}/api/whatsapp/chat/conversations/${conversation.id}/contact`).then(res => {
                setContact(res.data);
                setContactGroups(res.data.tags || []);
            }).catch(() => { });
        }

        // Fetch message count
        axios.get(`${API_BASE}/api/whatsapp/chat/conversations/${conversation.id}/messages`).then(res => setMessageCount(res.data.length)).catch(() => { });
    }, [conversation?.id, conversation?.phoneNumber]);

    // Listen for upstream changes from WhatsAppInbox header (optimistic sync)
    useEffect(() => {
        if (conversation?.headerGroups !== undefined) {
            setContactGroups(conversation.headerGroups);
        }
    }, [conversation?.headerGroups]);

    // Handle Click Outside and ESC key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !showLabelsModal) {
                onClose();
            }
        };

        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target) && !showLabelsModal) {
                // Prevent closing if clicking on a toast or another modal overlay
                if (!e.target.closest('.fixed.inset-0.z-\\[200\\]') && !e.target.closest('.fixed.z-50')) {
                    onClose();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        // Use capture phase to ensure we catch it before other things stop propagation
        document.addEventListener('mousedown', handleClickOutside, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [onClose, showLabelsModal]);

    const saveNotes = async () => {
        setSavingNotes(true);
        try {
            await axios.patch(`${API_BASE}/api/whatsapp/chat/conversations/${conversation.id}/notes`, { notes });
            onUpdate?.({ ...conversation, notes });
        } finally {
            setSavingNotes(false);
        }
    };

    const toggleLabel = async (labelOption) => {
        const exists = labels.find(l => l.id === labelOption.id);
        const newLabels = exists 
            ? labels.filter(l => l.id !== labelOption.id) 
            : [...labels, { id: labelOption.id, name: labelOption.name, color: labelOption.color }];
        setLabels(newLabels);
        await axios.patch(`${API_BASE}/api/whatsapp/chat/conversations/${conversation.id}/labels`, { labels: newLabels });
        // Also sync label to the contact record so Contacts page reflects it
        if (contact?.id) {
            try {
                await axios.put(`${API_BASE}/api/contacts/${contact.id}`, { labels: newLabels });
            } catch (err) {
                console.error('Failed to sync label to contact:', err);
            }
        }
        onUpdate?.({ ...conversation, labels: newLabels });
    };

    const toggleGroup = async (groupName) => {
        if (!groupName || !groupName.trim()) return;
        const gName = groupName.trim();

        const exists = contactGroups.includes(gName);
        const newGroups = exists ? contactGroups.filter(g => g !== gName) : [...contactGroups, gName];
        setContactGroups(newGroups);

        let targetId = contact?.id;
        try {
            const res = await axios.post(`${API_BASE}/api/whatsapp/chat/conversations/${conversation.id}/contact/groups`, {
                tags: newGroups
            });
            
            setContact(res.data);
            targetId = res.data.id;
        } catch (err) {
            console.error('Failed to update groups:', err);
        }

        // Notify parent to update header
        onUpdate?.({ ...conversation, headerGroups: newGroups });
    };

    if (!conversation) return null;

    const renderName = (name, phone) => {
        const isActuallyPhone = !name || name === phone || /^\d+$/.test(name.replace(/\D/g, ''));
        if (isActuallyPhone && isSubMember) {
            if (teamPolicy?.phonePrivacy === 'blurred') return <span className="blur-sm select-none">{phone || name}</span>;
            if (teamPolicy?.phonePrivacy === 'masked') return `****${(phone || name)?.slice(-4)}`;
        }
        return name || phone;
    };

    const initials = conversation.contactName && !/^\d+$/.test(conversation.contactName.replace(/\D/g, ''))
        ? conversation.contactName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : conversation.phoneNumber?.slice(-2);

    return (
        <div ref={panelRef} className="w-full md:w-80 absolute right-0 inset-y-0 md:relative max-w-full bg-white dark:bg-[#111b21] border-l border-slate-200 dark:border-white/5 flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-300 z-50 md:z-30 shadow-2xl md:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-[#202c33] border-b border-slate-200 dark:border-white/10 shrink-0">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Contact Info</span>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center py-8 bg-white dark:bg-[#111b21] border-b border-slate-100 dark:border-white/5 shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
                    {initials}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {renderName(conversation.contactName, conversation.phoneNumber)}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span className={isSubMember && teamPolicy?.phonePrivacy === 'blurred' ? 'blur-sm select-none' : ''}>
                        {isSubMember && teamPolicy?.phonePrivacy === 'masked'
                            ? `****${conversation.phoneNumber?.slice(-4) || ''}`
                            : `+${conversation.phoneNumber}`
                        }
                    </span>
                </p>
            </div>

            <div className="flex-1 space-y-0">
                {/* Stats */}
                <div className="p-4 border-b border-slate-100 dark:border-white/5">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" /> Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{messageCount}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Messages</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {conversation.lastInboundMessageAt
                                    ? format(new Date(conversation.lastInboundMessageAt), 'dd MMM')
                                    : 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last Reply</div>
                        </div>
                    </div>

                    {/* 24h window indicator */}
                    <div className="mt-3">
                        {conversation.lastInboundMessageAt &&
                            (Date.now() - new Date(conversation.lastInboundMessageAt).getTime()) / (1000 * 60 * 60) < 24 ? (
                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                24h window open
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                                <Clock className="w-3 h-3" />
                                24h window closed
                            </div>
                        )}
                    </div>
                </div>

                {/* Labels */}
                <div className="p-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" /> Tags
                        </h3>
                        <button
                            onClick={() => setShowLabelsModal(true)}
                            className="text-primary hover:text-blue-600 dark:hover:text-blue-400 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                            <Tags className="w-3.5 h-3.5" /> Manage
                        </button>
                    </div>

                    {/* Selected Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {labels.map(l => (
                            <span key={l.id} className="px-2 py-1.5 rounded-md text-[11px] font-semibold text-white flex items-center gap-1.5 shadow-sm group" style={{ backgroundColor: l.color }}>
                                <Tag className="w-3 h-3 text-white/90" />
                                {l.name}
                                <button onClick={() => toggleLabel(l)} className="hover:bg-black/20 rounded-full p-0.5 ml-1 opacity-80 hover:opacity-100 transition-colors flex items-center justify-center">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {labels.length === 0 && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 italic">No tags assigned.</span>
                        )}
                    </div>

                    {/* Add Tag Selection */}
                    <div className="relative" tabIndex={0} onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setShowTagDropdown(false);
                            setTagSearch('');
                        }
                    }}>
                        <div className="relative flex items-center w-full">
                            <input
                                type="text"
                                placeholder="+ Add Tag..."
                                value={tagSearch}
                                onChange={(e) => {
                                    setTagSearch(e.target.value);
                                    setShowTagDropdown(true);
                                }}
                                onFocus={() => setShowTagDropdown(true)}
                                className="w-full text-xs bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium cursor-text shadow-sm hover:border-slate-300 dark:hover:border-white/20"
                            />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                        </div>

                        {showTagDropdown && (
                            <div className="absolute top-full left-0 right-0 pt-1.5 z-50">
                                <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-200 max-h-48 overflow-y-auto shadow-black/5 dark:shadow-black/40">
                                    {availableLabels.filter(l => l.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No tags found</div>
                                    ) : (
                                        availableLabels.filter(l => l.name.toLowerCase().includes(tagSearch.toLowerCase())).map((opt) => {
                                            const isSelected = labels.find(l => l.id === opt.id);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleLabel(opt);
                                                        setTagSearch('');
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between"
                                                >
                                                    <span className={isSelected ? 'font-semibold' : ''} style={isSelected ? { color: opt.color } : {}}>
                                                        {opt.name}
                                                    </span>
                                                    {isSelected && <Check className="w-4 h-4" style={{ color: opt.color }} />}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Groups */}
                <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Groups
                    </h3>

                    {/* Selected Groups */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {contactGroups.map(grp => (
                            <span key={grp} className="px-2 py-1.5 rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5 shadow-sm group">
                                <Users className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                {grp}
                                <button onClick={() => toggleGroup(grp)} className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full p-0.5 ml-1 opacity-60 hover:opacity-100 transition-colors flex items-center justify-center">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {contactGroups.length === 0 && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 italic">No groups assigned.</span>
                        )}
                    </div>

                    {/* Add Group Selection */}
                    <div className="relative" tabIndex={0} onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setShowGroupDropdown(false);
                            setGroupSearch('');
                        }
                    }}>
                        <div className="relative flex items-center w-full">
                            <input
                                type="text"
                                placeholder="+ Add to group..."
                                value={groupSearch}
                                onChange={(e) => {
                                    setGroupSearch(e.target.value);
                                    setShowGroupDropdown(true);
                                }}
                                onFocus={() => setShowGroupDropdown(true)}
                                className="w-full text-xs bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium cursor-text shadow-sm hover:border-slate-300 dark:hover:border-white/20"
                            />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                        </div>

                        {showGroupDropdown && (
                            <div className="absolute top-full left-0 right-0 pt-1.5 z-50">
                                <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-200 max-h-48 overflow-y-auto shadow-black/5 dark:shadow-black/40">
                                    {availableGroups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No groups found</div>
                                    ) : (
                                        availableGroups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())).map((g) => {
                                            const isSelected = contactGroups.includes(g.name);
                                            return (
                                                <button
                                                    key={g.id}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleGroup(g.name);
                                                        setGroupSearch('');
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between"
                                                >
                                                    <span className={isSelected ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}>
                                                        {g.name}
                                                    </span>
                                                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" /> Internal Notes
                        </h3>
                        {savingNotes && <span className="text-[10px] text-primary italic">(Saving...)</span>}
                    </div>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        onBlur={saveNotes}
                        placeholder="Add notes about this contact..."
                        rows={4}
                        className="w-full text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-1">Auto-saves when you click away</p>
                </div>
            </div>

            {/* Manage Labels Modal */}
            {showLabelsModal && (
                <ManageLabelsModal onClose={() => setShowLabelsModal(false)} />
            )}
        </div>
    );
}

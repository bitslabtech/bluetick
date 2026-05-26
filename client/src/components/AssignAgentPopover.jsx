import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UserCheck, X, Search, Check, UserX } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const AssignAgentPopover = ({ conversation, onAssign, onClose }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const popoverRef = useRef(null);

    useEffect(() => {
        fetchMembers();
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    const fetchMembers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/team/for-assign`);
            setMembers(res.data);
        } catch (err) {
            console.error('Failed to fetch members:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (memberId) => {
        setAssigning(true);
        try {
            // If clicking the already-assigned member, unassign
            const isUnassign = conversation.assignedTo === memberId;
            await axios.put(
                `${API_BASE}/api/whatsapp/chat/conversations/${conversation.id}/assign`,
                { assignedToId: isUnassign ? null : memberId }
            );
            onAssign(
                isUnassign ? null : memberId,
                isUnassign ? null : members.find(m => m.id === memberId)?.name
            );
            onClose();
        } catch (err) {
            console.error('Failed to assign conversation:', err);
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async () => {
        setAssigning(true);
        try {
            await axios.put(
                `${API_BASE}/api/whatsapp/chat/conversations/${conversation.id}/assign`,
                { assignedToId: null }
            );
            onAssign(null, null);
            onClose();
        } catch (err) {
            console.error('Failed to unassign:', err);
        } finally {
            setAssigning(false);
        }
    };

    const filtered = members.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
    );

    const getRoleColor = (role) => {
        if (role === 'admin') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
        if (role === 'editor') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        if (role === 'owner') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    };

    return (
        <div
            ref={popoverRef}
            className="absolute top-full right-0 mt-2 z-50 w-72 bg-white dark:bg-[#1a2028] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-bold text-slate-800 dark:text-white">Assign Agent</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search agents..."
                        autoFocus
                        className="bg-transparent text-sm outline-none text-slate-900 dark:text-white placeholder-slate-400 w-full"
                    />
                </div>
            </div>

            {/* Member List */}
            <div className="max-h-64 overflow-y-auto py-1">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
                                <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-1/3" />
                            </div>
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">No agents found</p>
                ) : (
                    filtered.map(member => {
                        const isAssigned = conversation.assignedTo === member.id;
                        const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        return (
                            <button
                                key={member.id}
                                onClick={() => handleAssign(member.id)}
                                disabled={assigning}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left
                                    ${isAssigned
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                        {initials}
                                    </div>
                                    {/* Online dot */}
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1a2028] ${member.isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isAssigned ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {member.name}
                                        {member.id === (user?.id) && ' (you)'}
                                    </p>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${getRoleColor(member.teamRole)}`}>
                                        {member.teamRole}
                                    </span>
                                </div>

                                {/* Assigned check */}
                                {isAssigned && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                            </button>
                        );
                    })
                )}
            </div>

            {/* Unassign footer */}
            {conversation.assignedTo && (
                <div className="border-t border-slate-100 dark:border-white/5 px-3 py-2">
                    <button
                        onClick={handleUnassign}
                        disabled={assigning}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                        <UserX className="w-3.5 h-3.5" />
                        Remove Assignment
                    </button>
                </div>
            )}
        </div>
    );
};

export default AssignAgentPopover;

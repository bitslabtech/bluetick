import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Mail, MessageSquare, CheckCircle, Clock, Trash2, Search, ArrowLeft, Reply, Phone, Calendar, User, MailOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const AdminMessages = () => {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'unread', 'read'

    const fetchMessages = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/contact`);
            setMessages(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
            setLoading(false);
            showToast({ type: 'error', title: 'Error', message: 'Failed to load messages' });
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleToggleRead = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'read' ? 'unread' : 'read';
            await axios.put(`${import.meta.env.VITE_API_URL}/api/contact/${id}`, { status: newStatus });
            setMessages(messages.map(m => m.id === id ? { ...m, status: newStatus } : m));
            if(newStatus === 'read') {
                // optional success toast for explicit marking
            }
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to update message status' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/contact/${id}`);
            setMessages(messages.filter(m => m.id !== id));
            if (selectedMessageId === id) setSelectedMessageId(null);
            showToast({ type: 'success', title: 'Deleted', message: 'Message removed permanently.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to delete message' });
        }
    };

    const filteredMessages = useMemo(() => {
        return messages.filter(msg => {
            const matchesSearch = (msg.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (msg.email || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterStatus === 'all' ? true : msg.status === filterStatus;
            return matchesSearch && matchesFilter;
        });
    }, [messages, searchQuery, filterStatus]);

    const selectedMessage = useMemo(() => {
        return messages.find(m => m.id === selectedMessageId) || null;
    }, [messages, selectedMessageId]);

    // Handle marking as read automatically when opened if it's unread
    useEffect(() => {
        if (selectedMessage && selectedMessage.status === 'unread') {
            handleToggleRead(selectedMessage.id, 'unread');
        }
    }, [selectedMessageId]);

    if (loading) {
        return (
            <div className="-m-4 md:-m-6 -mb-7 sm:-mb-20 h-[calc(100vh-60px)] md:h-screen flex flex-col bg-slate-50 dark:bg-background-dark font-display">
                <AdminHeader><ThemeToggle /></AdminHeader>
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-spin text-indigo-500"><MessageSquare className="w-8 h-8" /></div>
                </main>
            </div>
        );
    }

    return (
        <div className="-m-4 md:-m-6 -mb-7 sm:-mb-20 h-[calc(100vh-60px)] md:h-[calc(100vh-0px)] flex flex-col bg-slate-50 dark:bg-background-dark font-display overflow-hidden relative z-10">
            <AdminHeader><ThemeToggle /></AdminHeader>
            
            <div className="flex-1 flex overflow-hidden">
                    {/* Left Pane: Message List */}
                    <div className={`w-full md:w-1/3 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark transition-all duration-300 ${selectedMessageId ? 'hidden md:flex' : 'flex'}`}>
                        {/* Header & Filters */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 space-y-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    Support Inquiries
                                    {messages.filter(m => m.status === 'unread').length > 0 && (
                                        <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {messages.filter(m => m.status === 'unread').length} New
                                        </span>
                                    )}
                                </h1>
                            </div>
                            
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search messages..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-shadow"
                                />
                            </div>

                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg shrink-0 overflow-x-auto hide-scrollbar">
                                {['all', 'unread', 'read'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${filterStatus === status ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-3 space-y-3">
                            {filteredMessages.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center h-full opacity-50">
                                    <MessageSquare className="w-12 h-12 text-slate-400 mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No inquiries found.</p>
                                </div>
                            ) : (
                                filteredMessages.map(msg => (
                                    <div 
                                        key={msg.id}
                                        onClick={() => setSelectedMessageId(msg.id)}
                                        className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedMessageId === msg.id ? 'bg-white dark:bg-surface-dark border-indigo-500 shadow-md shadow-indigo-500/10 scale-[1.02]' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/50 hover:shadow-sm'}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${msg.status === 'unread' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                                    {msg.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className={`text-sm truncate pr-2 ${msg.status === 'unread' ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                                                        {msg.name}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            {msg.status === 'unread' && (
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 animate-pulse" />
                                            )}
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                                {msg.message}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Reading View */}
                    <div className={`flex-1 flex-col bg-slate-50/50 dark:bg-[#0f111a] ${!selectedMessageId ? 'hidden md:flex' : 'flex'}`}>
                        {selectedMessage ? (
                            <div className="flex-1 flex flex-col h-full">
                                {/* Reading Toolbar */}
                                <div className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => setSelectedMessageId(null)}
                                            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleToggleRead(selectedMessage.id, selectedMessage.status)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors tooltip-trigger relative"
                                                title={selectedMessage.status === 'unread' ? 'Mark as resolved' : 'Mark as unresolved'}
                                            >
                                                {selectedMessage.status === 'unread' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(selectedMessage.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                                                title="Delete inquiry"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <a 
                                        href={`https://wa.me/${(selectedMessage.countryCode || '').replace(/\D/g, '')}${(selectedMessage.phone || '').replace(/\D/g, '')}?text=Hi ${selectedMessage.name.split(' ')[0]}, regarding your inquiry...`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-green-500/20"
                                    >
                                        <MessageSquare className="w-4 h-4" /> Reply via WhatsApp
                                    </a>
                                </div>

                                {/* Reading Content */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 relative">
                                    {/* Decorative background for the contact card */}
                                    <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-900/10 pointer-events-none" />
                                    
                                    <div className="max-w-4xl mx-auto relative">
                                        
                                        {/* Contact Profile Header */}
                                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/20 dark:shadow-none mb-8">
                                            <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                                                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-4xl shadow-xl shadow-indigo-500/30 shrink-0 border-4 border-white dark:border-surface-dark ring-1 ring-slate-100 dark:ring-slate-800">
                                                    {selectedMessage.name.charAt(0).toUpperCase()}
                                                </div>
                                                
                                                <div className="flex-1 space-y-3">
                                                    <div>
                                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                            {selectedMessage.name}
                                                        </h2>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <a href={`mailto:${selectedMessage.email}`} className="text-slate-500 dark:text-slate-400 font-medium hover:text-indigo-500 flex items-center gap-1.5 transition-colors">
                                                                <Mail className="w-4 h-4" /> {selectedMessage.email}
                                                            </a>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                                                            <a href={`https://wa.me/${(selectedMessage.countryCode || '').replace(/\D/g, '')}${(selectedMessage.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 font-medium hover:text-green-500 flex items-center gap-1.5 transition-colors">
                                                                <Phone className="w-4 h-4" /> {selectedMessage.countryCode} {selectedMessage.phone}
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="shrink-0 flex flex-col sm:items-end gap-2 text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl w-full sm:w-auto">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Submitted On</span>
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-indigo-500" />
                                                        {new Date(selectedMessage.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Message Body */}
                                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
                                            {/* Quote icon decoration */}
                                            <MessageSquare className="absolute -top-6 -right-6 w-32 h-32 text-slate-50 dark:text-slate-800/50 -rotate-12 pointer-events-none" />
                                            
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                                <User className="w-4 h-4" /> Inquiry Message
                                            </h3>
                                            
                                            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium text-[16px] relative z-10">
                                                {selectedMessage.message}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8 sm:hidden">
                                            <a 
                                                href={`https://wa.me/${(selectedMessage.countryCode || '').replace(/\D/g, '')}${(selectedMessage.phone || '').replace(/\D/g, '')}?text=Hi ${selectedMessage.name.split(' ')[0]}, regarding your inquiry...`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex justify-center items-center gap-2 w-full px-5 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all shadow-md shadow-green-500/20"
                                            >
                                                <MessageSquare className="w-5 h-5" /> Reply via WhatsApp
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                    <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">Select an Inquiry</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-sm text-lg">Click on any contact card to view their full message and reply directly on WhatsApp.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
    );
};

export default AdminMessages;

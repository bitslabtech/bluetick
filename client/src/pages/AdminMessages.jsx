import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, MessageSquare, CheckCircle, Clock, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import Sidebar from '../components/Sidebar';

const AdminMessages = () => {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/contact', {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
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
            await axios.put(`http://127.0.0.1:5000/api/contact/${id}`, { status: newStatus }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setMessages(messages.map(m => m.id === id ? { ...m, status: newStatus } : m));
            showToast({ type: 'success', title: 'Updated', message: `Message marked as ${newStatus}` });
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to update message status' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-slate-50 dark:bg-background-dark font-display">
                <Sidebar />
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <AdminHeader><ThemeToggle /></AdminHeader>
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                        <div className="animate-spin text-indigo-500"><MessageSquare className="w-8 h-8" /></div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <AdminHeader><ThemeToggle /></AdminHeader>
            <main className="w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-32">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Contact Messages</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Inquiries submitted from the public face Contact Us page.</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold text-sm">
                        Total: {messages.length}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {messages.length === 0 ? (
                        <div className="text-center bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-12">
                            <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No messages yet</h3>
                            <p className="text-slate-500">When someone fills out the contact form, it will appear here.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`p-6 bg-white dark:bg-surface-dark border rounded-2xl transition-all ${msg.status === 'unread' ? 'border-indigo-300 dark:border-indigo-500/50 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'}`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${msg.status === 'unread' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                                {msg.name}
                                                {msg.status === 'unread' && <span className="bg-indigo-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full">New</span>}
                                            </h4>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                {msg.email} • {msg.countryCode} {msg.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(msg.createdAt).toLocaleString()}
                                        </div>
                                        <button 
                                            onClick={() => handleToggleRead(msg.id, msg.status)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${msg.status === 'unread' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            {msg.status === 'unread' ? 'Mark as Read' : 'Unread'}
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {msg.message}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminMessages;

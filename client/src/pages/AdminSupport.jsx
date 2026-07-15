import { useState, useEffect } from 'react';
import TrialBanner from '../components/TrialBanner';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Bell, LifeBuoy, Ticket, Book, Map, Plus, Trash2, Send, CheckCircle2, MoreHorizontal, MessageSquare, CornerDownRight, ThumbsUp as ThumbsUpIcon, Filter, X, ExternalLink, Calendar, Clock, AlertCircle, User, Search } from 'lucide-react';

import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const MotionDiv = motion.div;

// Custom Confetti Particle
const ConfettiParticle = ({ index }) => {
    const angle = (index / 12) * Math.PI * 2;
    const pseudoRandom = ((index * 7) % 10) / 10;
    const velocity = 30 + pseudoRandom * 30;
    const x = Math.cos(angle) * velocity;
    const y = Math.sin(angle) * velocity;
    const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-400', 'bg-pink-500'];
    const color = colors[index % colors.length];

    return (
        <motion.div
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
                x,
                y: y - 20, // slightly upward
                scale: [0, 1, 0],
                opacity: [1, 1, 0]
            }}
            transition={{ duration: 0.6 + pseudoRandom * 0.3, ease: "easeOut" }}
            className={`absolute w-1.5 h-1.5 rounded-full ${color} pointer-events-none z-50`}
        />
    );
};

const ConfettiExplosion = ({ trigger }) => {
    if (!trigger) return null;
    return (
        <div className="absolute top-1/2 left-1/2 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
            {[...Array(12)].map((_, i) => <ConfettiParticle key={i} index={i} />)}
        </div>
    );
};

const AdminSupport = () => {
    const { showModal, showToast } = useUI();
    const [activeTab, setActiveTab] = useState('tickets'); // tickets | kb | roadmap
    const [tickets, setTickets] = useState([]);
    const [kbArticles, setKbArticles] = useState([]);
    const [roadmap, setRoadmap] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const fetchData = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            if (activeTab === 'tickets') {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/tickets`);
                setTickets(res.data);
            } else if (activeTab === 'kb') {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/kb`);
                setKbArticles(res.data);
            } else if (activeTab === 'roadmap') {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/roadmap`);
                setRoadmap(res.data);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-hidden">
            {/* Top Bar */}
            {/* Top Bar */}
            <AdminHeader>
                <TrialBanner />
                    <ThemeToggle />
            </AdminHeader>

            <main className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8 max-w-[1920px] max-w-full mx-auto w-full flex flex-col relative">

                {/* Modern Header: Title & Tabs Inline */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 shrink-0">
                    {/* Title Section */}
                    <div className="text-left w-full md:w-auto">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Support Management
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage tickets, knowledge base, and roadmap</p>
                    </div>

                    {/* Tabs - Glassmorphism Pills */}
                    <div className="flex items-center bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 p-1.5 rounded-2xl shadow-sm overflow-x-auto w-full md:w-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('tickets')}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'tickets' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                            <Ticket className="w-4 h-4" /> Tickets
                        </button>
                        <button
                            onClick={() => setActiveTab('kb')}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'kb' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                            <Book className="w-4 h-4" /> Knowledge Base
                        </button>
                        <button
                            onClick={() => setActiveTab('roadmap')}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'roadmap' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                            <Map className="w-4 h-4" /> Roadmap
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div key={activeTab} className="flex-1 overflow-hidden h-full animate-in fade-in zoom-in-95 duration-300">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'tickets' && <TicketManager tickets={tickets} refresh={fetchData} showToast={showToast} showModal={showModal} />}
                            {activeTab === 'kb' && <KBManager articles={kbArticles} refresh={fetchData} showToast={showToast} showModal={showModal} />}
                            {activeTab === 'roadmap' && <RoadmapManager items={roadmap} refresh={fetchData} showToast={showToast} showModal={showModal} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

// --- Subcomponents ---

const TicketManager = ({ tickets, refresh, showToast }) => {
    const [selectedTicket, setSelectedTicket] = useState(null);

    // Mark ticket as read when admin opens it (clears red dot on sidebar)
    const openTicket = (ticket) => {
        setSelectedTicket(ticket);
        if (ticket.hasUnreadUserReply) {
            axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets/${ticket.id}/mark-read`)
                .catch(() => {}); // silently fail
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-full">
                {/* Visual Header for Table */}
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Support Tickets</h3>
                        <p className="text-xs text-slate-500 mt-1">Manage and resolve user inquiries.</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm"><Filter className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-white/5 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-4 md:px-6 py-4 rounded-l-xl">Subject</th>
                                <th className="px-4 md:px-6 py-4">User</th>
                                <th className="px-4 md:px-6 py-4">Status</th>
                                <th className="px-4 md:px-6 py-4">Priority</th>
                                <th className="px-4 md:px-6 py-4">Last Update</th>
                                <th className="px-4 md:px-6 py-4 rounded-r-xl text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {tickets.map(t => (
                                <tr key={t.id} onClick={() => openTicket(t)} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer text-sm">
                                    <td className="px-4 md:px-6 py-4 font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                                    <Ticket className="w-4 h-4" />
                                                </div>
                                                {/* Unread user reply dot */}
                                                {t.hasUnreadUserReply && (
                                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                            {t.subject}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/20 flex items-center justify-center text-[10px] font-bold">
                                                {t.user?.name?.[0]}
                                            </div>
                                            {t.user?.name}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${t.status === 'Open' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-500/30' :
                                            t.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30' :
                                                'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-400 dark:border-white/5'
                                            }`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <span className={`flex items-center gap-1.5 ${t.priority === 'High' ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${t.priority === 'High' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                            {t.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-slate-400 text-xs">
                                        {formatDistanceToNow(new Date(t.lastReplyAt), { addSuffix: true })}
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right">
                                        <button className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-xs border border-indigo-200 dark:border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-white/5 transition-all">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    refresh={refresh}
                    showToast={showToast}
                />
            )}
        </>
    );
};

const TicketDetailModal = ({ ticket, onClose, refresh, showToast }) => {
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);

    const handleReply = async () => {
        if (!reply.trim()) return;
        setSending(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets/${ticket.id}/reply`, {
                text: reply,
                status: 'In Progress'
            });
            setReply('');
            refresh();
            showToast({ type: 'success', title: 'Reply Sent', message: 'Reply added to ticket.' });
            onClose();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Error', message: "Failed to send reply" });
        } finally {
            setSending(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0B1120] w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Ticket className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">{ticket.subject}</h2>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium"><LifeBuoy className="w-3.5 h-3.5" /> {ticket.user?.email}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${ticket.status === 'Open' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                            {ticket.status}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content: 2 Columns */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Chat History */}
                    <div className="flex-1 flex flex-col border-r border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-black/20">
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                            {ticket.messages?.map((msg, i) => (
                                <div key={i} className={`flex gap-4 ${msg.sender === 'Admin' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${msg.sender === 'Admin' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                                        {msg.name?.[0]}
                                    </div>
                                    <div className={`max-w-[75%] group`}>
                                        <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.sender === 'Admin'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-surface-dark dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-none'
                                            }`}>
                                            {msg.text}
                                        </div>
                                        <div className={`text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 ${msg.sender === 'Admin' ? 'justify-end' : 'justify-start'}`}>
                                            <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(msg.timestamp))} ago
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Box */}
                        <div className="p-4 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-white/10">
                            <div className="relative">
                                <textarea
                                    className="w-full pl-5 pr-14 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white resize-none h-20 transition-all placeholder:text-slate-400"
                                    placeholder="Write a professional reply..."
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                />
                                <button
                                    onClick={handleReply}
                                    disabled={sending || !reply.trim()}
                                    className="absolute right-3 bottom-3 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-between items-center mt-2 px-2">
                                <span className="text-xs text-slate-400">Shift + Enter for new line</span>
                                <div className="flex gap-2">
                                    <button className="text-xs font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors">Attach File</button>
                                    <button className="text-xs font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors">Saved Replies</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Info Sidebar */}
                    <div className="w-80 max-w-full bg-white dark:bg-surface-dark p-4 md:p-6 overflow-y-auto">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-6 text-sm uppercase tracking-wider">Ticket Info</h4>

                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Priority</label>
                                <div className={`flex items-center gap-2 font-bold ${ticket.priority === 'High' ? 'text-red-500' : 'text-slate-700 dark:text-white'}`}>
                                    <AlertCircle className="w-4 h-4" /> {ticket.priority}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category</label>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">General Inquiry</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ticket ID</label>
                                    <p className="text-sm font-mono text-slate-600 dark:text-slate-400 select-all">{ticket.id}</p>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-white/10" />

                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">UserInfo</h4>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                                        {ticket.user?.name?.[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{ticket.user?.name}</div>
                                        <div className="text-xs text-slate-500">Customer</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-2 rounded-lg">
                                        <Clock className="w-3 h-3" /> Last Seen: 2 hours ago
                                    </div>
                                    <button className="w-full py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <ExternalLink className="w-3 h-3" /> View Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const KBManager = ({ articles, refresh, showToast, showModal }) => {
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [category, setCategory] = useState('General');
    const [isPublished, setIsPublished] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArticleId, setSelectedArticleId] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [categories, setCategories] = useState([]);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('Book');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/kb/categories`);
            setCategories(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSaveCategory = async () => {
        if (!newCatName) return;
        try {
            if (editingCategory) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/support/kb/categories/${editingCategory.id}`, { name: newCatName, icon: newCatIcon });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/support/kb/categories`, { name: newCatName, icon: newCatIcon });
            }
            fetchCategories();
            setNewCatName('');
            setEditingCategory(null);
        } catch (err) { console.error(err); }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm("Delete this category? Articles will remain but category reference will be broken.")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/support/kb/categories/${id}`);
            fetchCategories();
        } catch (err) { console.error(err); }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/support/kb/upload-image`, formData);
            const markdownImage = `\n![Image](${res.data.url})\n`;
            setNewContent(prev => prev + markdownImage);
            showToast({ type: 'success', title: 'Image Uploaded', message: 'Image inserted into article.' });
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Upload Failed', message: 'Error uploading image.' });
        }
    };

    const handleSave = async () => {
        if (!newTitle || !newContent) return;
        const data = { title: newTitle, content: newContent, category, isPublished };

        try {
            if (selectedArticleId) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/support/kb/${selectedArticleId}`, data);
                showToast({ type: 'success', title: 'Article Updated', message: 'Changes saved successfully.' });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/support/kb`, data);
                showToast({ type: 'success', title: 'Article Created', message: 'Knowledge Base article published.' });
            }
            resetEditor();
            refresh();
        } catch (e) {
            console.error(e);
            showToast({ type: 'error', title: 'Error', message: "Error saving article" });
        }
    };

    const resetEditor = () => {
        setNewTitle('');
        setNewContent('');
        setCategory('General');
        setIsPublished(true);
        setSelectedArticleId(null);
    };

    const loadArticle = (a) => {
        setNewTitle(a.title);
        setNewContent(a.content);
        setCategory(a.category);
        setIsPublished(a.isPublished);
        setSelectedArticleId(a.id);
    };

    const handleDelete = async (id) => {
        showModal({
            type: 'warning',
            title: 'Delete Article',
            message: "Are you sure you want to delete this article?",
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL}/api/support/kb/${id}`);
                    if (selectedArticleId === id) resetEditor();
                    refresh();
                    showToast({ type: 'success', title: 'Deleted', message: 'Article deleted.' });
                } catch (err) {
                    console.error(err);
                    showToast({ type: 'error', title: 'Error', message: "Error deleting article" });
                }
            }
        });
    };

    const filteredArticles = articles.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Top Stats / Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-4 md:p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Book className="w-24 h-24" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-bold mb-1">{articles.length}</h3>
                            <p className="text-indigo-100 text-sm font-medium">Knowledge Articles</p>
                        </div>
                        <button onClick={resetEditor} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors shadow-sm">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <button onClick={() => setIsCatModalOpen(true)} className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-xs font-bold transition-colors">
                        Manage Categories
                    </button>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-4 md:p-6 flex items-center shadow-sm">
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Knowledge Base Center</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                            Create and manage help articles to reduce support volume. Ensure your content is up to date and easy to read.
                        </p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-white/5 p-4 rounded-full">
                        <Search className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
            </div>
            <div className="flex-1 flex gap-8 overflow-hidden">
                {/* Article List */}
                <div className="w-1/3 flex flex-col gap-4">
                    {/* Category Quick Filter */}
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-2 flex gap-1 overflow-x-auto scrollbar-hide py-3 px-4 shrink-0 shadow-sm">
                        <button
                            onClick={() => setCategoryFilter('All')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${categoryFilter === 'All' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                            All
                        </button>
                        {categories.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setCategoryFilter(c.name)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${categoryFilter === c.name ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                        <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="Search articles..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-8">
                            {filteredArticles.length === 0 && (
                                <div className="text-center p-4 md:p-8 text-slate-400 text-sm">No articles found.</div>
                            )}
                            {categories
                                .filter(cat => categoryFilter === 'All' || cat.name === categoryFilter)
                                .map(cat => {
                                    const articlesInCat = filteredArticles.filter(a => a.category === cat.name);
                                    if (articlesInCat.length === 0) return null;

                                    return (
                                        <div key={cat.id} className="space-y-2">
                                            <div className="flex items-center gap-2 px-2 mb-2">
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cat.name}</span>
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                                            </div>
                                            {articlesInCat.map(a => (
                                                <div
                                                    key={a.id}
                                                    onClick={() => loadArticle(a)}
                                                    className={`group p-4 rounded-xl border transition-all cursor-pointer ${selectedArticleId === a.id
                                                        ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10'
                                                        : 'border-transparent hover:border-indigo-100 hover:bg-slate-50 dark:hover:bg-white/5'} cursor-pointer`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">{a.title}</h4>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-slate-500">{a.category}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.isPublished ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20'}`}>
                                                            {a.isPublished ? 'Live' : 'Draft'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 ml-auto">{new Date(a.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col shadow-sm overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/30 dark:bg-white/[0.01]">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                            {selectedArticleId ? <Book className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
                            {selectedArticleId ? 'Edit Article' : 'New Article'}
                        </div>
                        <div className="flex items-center gap-4">
                            {selectedArticleId && (
                                <button onClick={resetEditor} className="text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
                                    Cancel
                                </button>
                            )}
                            <div className="relative">
                                <input type="file" id="kb-image-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                <button
                                    onClick={() => document.getElementById('kb-image-upload').click()}
                                    className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Image
                                </button>
                            </div>
                            <button onClick={handleSave} className="px-4 md:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20">
                                {selectedArticleId ? 'Save Changes' : 'Publish'}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">Title</label>
                                <input
                                    className="w-full px-4 py-3 font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white transition-all shadow-inner"
                                    placeholder="e.g. Setting up your profile"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">Category</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white transition-all shadow-inner"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                >
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                            <input
                                type="checkbox"
                                id="isPublished"
                                checked={isPublished}
                                onChange={e => setIsPublished(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <label htmlFor="isPublished" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                Publish Article (Visible to users)
                            </label>
                        </div>

                        <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">Content (Markdown Support)</label>
                            <div className="flex-1 relative min-h-[400px]">
                                <textarea
                                    className="w-full h-full min-h-[400px] px-4 md:px-6 py-6 font-mono text-sm leading-relaxed bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-300 transition-all resize-none shadow-inner"
                                    placeholder="# Introduction\n\nWrite your help article here..."
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Category Management Modal */}
            <AnimatePresence>
                {isCatModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
                        onClick={() => setIsCatModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 cursor-pointer"
                        >
                            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-indigo-500" /> Manage Categories
                                </h3>
                                <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white text-sm"
                                        placeholder="Category Name"
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                    />
                                    <button
                                        onClick={handleSaveCategory}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all"
                                    >
                                        {editingCategory ? 'Update' : 'Add'}
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    {categories.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl hover:border-indigo-500/30 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-indigo-500 shadow-sm">
                                                    <Book className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{c.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingCategory(c); setNewCatName(c.name); }} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors">
                                                    <Plus className="w-4 h-4 rotate-45" />
                                                </button>
                                                <button onClick={() => deleteCategory(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const RoadmapManager = ({ items, refresh }) => {
    const { user } = useAuth();
    const [newTitle, setNewTitle] = useState('');
    const [activeConfettiId, setActiveConfettiId] = useState(null);

    const handleCreate = async () => {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/support/roadmap`, { title: newTitle, status: 'Requested' });
        setNewTitle('');
        refresh();
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/support/roadmap/${id}`, { status: newStatus });
            refresh();
        } catch (err) {
            console.error(err);
        }
    };

    const columns = [
        { id: 'Requested', label: 'Requested', icon: '💡', color: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400' },
        { id: 'Approved', label: 'Approved', icon: '✅', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
        { id: 'In Progress', label: 'In Progress', icon: '🔨', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
        { id: 'Live', label: 'Live', icon: '🚀', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' }
    ];

    return (
        <div className="max-w-[1200px] max-w-full w-full mx-auto h-full flex flex-col px-4 md:px-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white/10 dark:to-white/5 p-1 rounded-2xl mb-8 flex gap-2 w-full max-w-md mx-auto shadow-lg">
                <input
                    className="flex-1 bg-white dark:bg-[#0B1120] rounded-xl px-4 py-3 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="What's next for the product?"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                />
                <button onClick={handleCreate} className="px-4 md:px-6 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-400 transition-colors">Add</button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden min-h-0">
                {columns.map((col) => {
                    return (
                        <div key={col.id} className="flex flex-col h-full bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 overflow-hidden">
                            <div className={`p-3 rounded-xl ${col.color} font-bold text-center mb-6 flex items-center justify-center gap-2`}>
                                <span>{col.icon}</span> {col.label}
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-hide pb-4">
                                <AnimatePresence>
                                    {items
                                        .filter(i => i.status === col.id)
                                        .sort((a, b) => {
                                            if (col.id === 'Requested') {
                                                const votesA = Number(a.upvotes) || 0;
                                                const votesB = Number(b.upvotes) || 0;
                                                if (votesB !== votesA) {
                                                    return votesB - votesA; // Highest upvotes first
                                                }
                                                // Tie-breaker: newest requests at the top
                                                return new Date(b.createdAt) - new Date(a.createdAt);
                                            } else {
                                                return new Date(a.createdAt) - new Date(b.createdAt); // Oldest first (first come first serve)
                                            }
                                        })
                                        .map(item => {
                                            const hasVoted = item.voters?.includes(user?.id);
                                            return (
                                                <MotionDiv
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ duration: 0.3 }}
                                                    key={item.id}
                                                    className="bg-white dark:bg-surface-dark p-3 rounded-lg shadow-sm border border-slate-200 dark:border-white/5 hover:shadow-md group shrink-0"
                                                >
                                                    <div className="font-bold text-slate-800 dark:text-white mb-0.5 text-sm">{item.title}</div>
                                                    <div className="text-[10px] text-indigo-500 font-medium mb-2 opacity-80">
                                                        👤 {item.suggesterName || 'System / Anonymous'}
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-white/5 mb-3">
                                                        <span className="text-[10px] text-slate-400 font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                                                        <motion.button
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={async () => {
                                                                const wasVoted = item.voters?.includes(user?.id);
                                                                await axios.post(`${import.meta.env.VITE_API_URL}/api/support/roadmap/${item.id}/upvote`);
                                                                if (!wasVoted) {
                                                                    setActiveConfettiId(item.id);
                                                                    setTimeout(() => setActiveConfettiId(null), 1000);
                                                                }
                                                                refresh(false);
                                                            }}
                                                            className={`relative flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors border ${hasVoted
                                                                ? 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800/50'
                                                                : 'text-slate-600 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 bg-slate-50 dark:bg-white/5 border-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                                                }`}
                                                        >
                                                            <ConfettiExplosion trigger={activeConfettiId === item.id} />
                                                            <motion.div
                                                                animate={hasVoted ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : {}}
                                                                transition={{ duration: 0.4 }}
                                                            >
                                                                <ThumbsUpIcon className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                                                            </motion.div>
                                                            {item.upvotes}
                                                        </motion.button>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {col.id === 'Requested' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(item.id, 'Approved')}
                                                                className="w-full py-1.5 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" /> Approve
                                                            </button>
                                                        )}
                                                        {col.id === 'Approved' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(item.id, 'In Progress')}
                                                                className="w-full py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                <CornerDownRight className="w-3 h-3" /> Start Dev
                                                            </button>
                                                        )}
                                                        {col.id === 'In Progress' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(item.id, 'Live')}
                                                                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                🚀 Mark Live
                                                            </button>
                                                        )}
                                                    </div>
                                                </MotionDiv>
                                            )
                                        })}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminSupport;

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Search, MoreVertical, Paperclip, Smile, Send, Mic, Check, CheckCheck, Clock,
    MessageSquare, X, ChevronDown, Image as ImageIcon, FileText, Info, Bell, BellOff,
    Tag, Users
} from 'lucide-react';
import { format, isToday, isYesterday, differenceInHours } from 'date-fns';
import { io } from 'socket.io-client';
import EmojiPicker from '../components/EmojiPicker';
import QuickReplySuggestions from '../components/QuickReplySuggestions';
import ContactInfoPanel from '../components/ContactInfoPanel';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Notification sound (simple beep via AudioContext)
const playNotificationSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch (err) { console.error('AudioContext error:', err); }
};

// Show browser notification
const showBrowserNotification = (title, body) => {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo.png', silent: false });
    }
};

const WhatsAppInbox = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Core state
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendError, setSendError] = useState('');
    const [sending, setSending] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false); // NEW
    const [isConfigured, setIsConfigured] = useState(true); // Default true until fetched

    // Search & filter
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all | unread | campaigns

    // UI state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showContactPanel, setShowContactPanel] = useState(false);
    const [showScrollFab, setShowScrollFab] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // quoted reply
    const [headerGroups, setHeaderGroups] = useState([]); // For header group display
    const [headerContactId, setHeaderContactId] = useState(null); // Corresponding contact ID
    const [availableGroups, setAvailableGroups] = useState([]); // All groups
    const [showHeaderGroupDropdown, setShowHeaderGroupDropdown] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        const saved = localStorage.getItem('whatsapp_notifications_enabled');
        return saved !== null ? JSON.parse(saved) : true; // Defaulting to true as per standard expectation, but user said "default set to silent", I will check if they want silent by default. User said "is default set to silent... fix this". Usually users WANT it to be on by default but the current code might be bugged. Actually, let's set it to true if not found, or false if that's what "default set to silent" implies they want to change. Wait, "fix this" usually means they want it to WORK and not be silent. I'll default to true.
    });
    const notificationsRef = useRef(notificationsEnabled);

    // Keep ref in sync
    useEffect(() => {
        notificationsRef.current = notificationsEnabled;
        localStorage.setItem('whatsapp_notifications_enabled', JSON.stringify(notificationsEnabled));
    }, [notificationsEnabled]);

    // Close header group dropdown on outside click
    useEffect(() => {
        if (!showHeaderGroupDropdown) return;
        // Defer so the current click that opened the dropdown is not captured
        const id = setTimeout(() => {
            const close = () => setShowHeaderGroupDropdown(false);
            document.addEventListener('click', close, { once: true });
        }, 0);
        return () => clearTimeout(id);
    }, [showHeaderGroupDropdown]);

    // Quick replies
    const [quickReplies, setQuickReplies] = useState([]);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [quickReplyQuery, setQuickReplyQuery] = useState('');
    const [showCreateQuickReply, setShowCreateQuickReply] = useState(false);
    const [newQuickReply, setNewQuickReply] = useState({ shortcut: '', message: '' });

    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const conversationsRef = useRef([]);
    const inputRef = useRef(null);
    const socketRef = useRef(null);

    // ─── Init: Fetch conversations + socket + quick replies + notification permission
    useEffect(() => {
        fetchConversations();
        fetchQuickReplies();

        // Check if WhatsApp is configured
        if (user?.id) {
            axios.get(`${API_BASE}/api/dashboard/stats`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            }).then(res => {
                setIsConfigured(res.data.isWhatsappConfigured);
            }).catch(() => setIsConfigured(false));
        }

        // Fetch groups
        if (user?.id) {
            axios.get(`${API_BASE}/api/groups`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            }).then(res => setAvailableGroups(res.data)).catch(err => console.error('Failed to fetch groups:', err));
        }

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Socket setup
        const socket = io(API_BASE);
        socketRef.current = socket;

        socket.on('connect', () => {
            if (user?.id) socket.emit('join_waba', user.id);
        });

        socket.on('new_message', (data) => {
            const { conversation, message } = data;
            // Update conversation list
            setConversations(prev => {
                const existing = prev.find(c => c.id === conversation.id);
                if (!existing) { fetchConversations(); return prev; }
                const updated = prev.map(c => c.id === conversation.id ? { ...c, ...conversation } : c);
                return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
            });
            conversationsRef.current = conversationsRef.current.map(c => c.id === conversation.id ? { ...c, ...conversation } : c);

            // Append to open chat
            setSelectedChat(prevChat => {
                if (prevChat?.id === conversation.id) {
                    setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
                }
                return prevChat;
            });

            // Notification for inbound messages
            if (message.direction === 'INBOUND') {
                if (notificationsRef.current) {
                    playNotificationSound();
                }
                if (document.hidden) {
                    showBrowserNotification(conversation.contactName || conversation.phoneNumber, message.body || '📎 Media');
                }
            }
        });

        socket.on('message_status_update', ({ messageId, status, conversationId }) => {
            setSelectedChat(prevChat => {
                if (prevChat?.id === conversationId) {
                    setMessages(prev => prev.map(m => m.messageId === messageId ? { ...m, status } : m));
                }
                return prevChat;
            });
        });

        return () => socket.disconnect();
    }, [user?.id]);

    // Fetch messages and contact groups when chat opens
    useEffect(() => {
        if (selectedChat) {
            fetchMessages(selectedChat.id);
            // Fetch groups for header
            if (selectedChat.phoneNumber) {
                axios.get(`${API_BASE}/api/contacts/by-phone/${selectedChat.phoneNumber}`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                }).then(res => {
                    setHeaderGroups(res.data.tags || []);
                    setHeaderContactId(res.data.id);
                }).catch(() => {
                    setHeaderGroups([]);
                    setHeaderContactId(null);
                });
            } else {
                setHeaderGroups([]);
                setHeaderContactId(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChat?.id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) scrollToBottom();
    }, [messages]);

    // Handle incoming chat redirect from Contacts Page
    useEffect(() => {
        if (!loading && location.state?.startChatWith) {
            const targetPhone = location.state.startChatWith.phone;
            // Clean phone number: remove anything but digits and +
            const cleanTarget = targetPhone.replace(/[^\d+]/g, '');

            const existingChat = conversations.find(c => {
                const cleanPhone = (c.phoneNumber || '').replace(/[^\d+]/g, '');
                return cleanPhone === cleanTarget || cleanPhone === cleanTarget.replace('+', '');
            });

            if (existingChat) {
                setSelectedChat(existingChat);
            } else {
                const newConv = {
                    id: 'new-' + Date.now(),
                    phoneNumber: targetPhone,
                    contactName: location.state.startChatWith.name,
                    status: 'active',
                    lastMessage: '...',
                    lastMessageAt: new Date().toISOString(),
                    unreadCount: 0,
                    isPlaceholder: true // flag to know it's not saved yet until message sent
                };
                setConversations(prev => [newConv, ...prev]);
                setSelectedChat(newConv);
            }

            // Clear state so it doesn't pop again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, loading, conversations]);

    // Scroll FAB visibility
    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        setShowScrollFab(container.scrollHeight - container.scrollTop - container.clientHeight > 200);
    };

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // ─── API calls
    const fetchConversations = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/whatsapp/chat/conversations`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setConversations(res.data);
            conversationsRef.current = res.data;
        } catch (err) { console.error('Failed to fetch conversations:', err); }
        finally { setLoading(false); }
    };

    const fetchMessages = async (chatId) => {
        try {
            const res = await axios.get(`${API_BASE}/api/whatsapp/chat/conversations/${chatId}/messages`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setMessages(res.data);
            const conv = conversationsRef.current.find(c => c.id === chatId);
            if (conv?.unreadCount > 0) {
                await axios.post(`${API_BASE}/api/whatsapp/chat/conversations/${chatId}/read`, {}, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                setConversations(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
            }
        } catch (err) { console.error('Failed to fetch messages:', err); }
    };

    const fetchQuickReplies = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/whatsapp/chat/quick-replies`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setQuickReplies(res.data);
        } catch (err) { console.error('Failed to fetch quick replies:', err); }
    };

    const handleHeaderToggleGroup = async (groupName) => {
        if (!groupName || !selectedChat) return;

        const currentGroupNames = headerGroups.map(g => typeof g === 'object' ? g.name : g);
        const exists = currentGroupNames.includes(groupName);
        const newGroups = exists ? currentGroupNames.filter(g => g !== groupName) : [...currentGroupNames, groupName];

        setHeaderGroups(newGroups); // Optimistic update
        setSelectedChat(prev => ({ ...prev, headerGroups: newGroups, tags: newGroups }));
        setConversations(prev => prev.map(c => c.id === selectedChat.id ? { ...c, headerGroups: newGroups, tags: newGroups } : c));

        let targetId = headerContactId;
        try {
            if (!targetId) {
                const res = await axios.post(`${API_BASE}/api/contacts`, {
                    name: selectedChat.contactName || selectedChat.phoneNumber,
                    phone: selectedChat.phoneNumber,
                    tags: newGroups
                }, { headers: { 'x-auth-token': localStorage.getItem('token') } });
                setHeaderContactId(res.data.id);
            } else {
                await axios.put(`${API_BASE}/api/contacts/${targetId}`, { tags: newGroups }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
            }
        } catch (err) {
            console.error('Failed to update groups:', err);
        }
    };

    // ─── Sending
    const handleSend = async (e) => {
        e?.preventDefault();
        const text = inputText.trim();
        if (!text || !selectedChat || sending) return;
        setSendError(''); setSending(true);

        // Build body with quoted reply prefix if replying
        const body = replyTo
            ? `> ${replyTo.body?.slice(0, 60)}${replyTo.body?.length > 60 ? '...' : ''}\n\n${text}`
            : text;

        try {
            const res = await axios.post(`${API_BASE}/api/whatsapp/chat/send/text`, {
                conversationId: selectedChat.id, body
            }, { headers: { 'x-auth-token': localStorage.getItem('token') } });

            setInputText('');
            setReplyTo(null);
            setShowEmojiPicker(false);
            setShowQuickReplies(false);
            setMessages(prev => [...prev, res.data]);
            fetchConversations();
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.code === 'LIMIT_REACHED') {
                setSendError(`🚫 Monthly limit reached (${errData.sentThisMonth}/${errData.monthlyLimit} messages). Please upgrade your plan.`);
            } else {
                setSendError(errData?.error || 'Failed to send message');
            }
        } finally { setSending(false); }
    };

    // ─── Input handling (/ for quick replies, emoji)
    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputText(val);
        setSendError('');

        if (val.startsWith('/')) {
            setShowQuickReplies(true);
            setQuickReplyQuery(val.slice(1));
        } else {
            setShowQuickReplies(false);
            setQuickReplyQuery('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
        if (e.key === 'Escape') { setReplyTo(null); setShowEmojiPicker(false); setShowQuickReplies(false); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedChat) return;

        // determine type
        const isImage = file.type.startsWith('image/');
        const mediaType = isImage ? 'image' : 'document';

        // Check size (Meta limit is typically 16MB for most things, let's just do a basic 15MB check)
        if (file.size > 15 * 1024 * 1024) {
            setSendError('File is too large (max 15MB)');
            return;
        }

        setUploadingMedia(true);
        setSendError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', selectedChat.id);
        formData.append('mediaType', mediaType);

        try {
            const res = await axios.post(`${API_BASE}/api/whatsapp/chat/send/media`, formData, {
                headers: {
                    'x-auth-token': localStorage.getItem('token'),
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessages(prev => [...prev, res.data]);
            fetchConversations();
        } catch (err) {
            setSendError(err.response?.data?.error || 'Failed to upload file');
        } finally {
            setUploadingMedia(false);
            e.target.value = ''; // reset input
        }
    };

    // ─── Helpers
    const isWindowOpen = (chat) => {
        if (!chat?.lastInboundMessageAt) return false;
        return differenceInHours(new Date(), new Date(chat.lastInboundMessageAt)) < 24;
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isToday(d)) return format(d, 'HH:mm');
        if (isYesterday(d)) return 'Yesterday';
        return format(d, 'dd/MM/yy');
    };

    // ─── Filtered conversation list
    const filteredConversations = conversations
        .filter(c => {
            const q = searchQuery.toLowerCase();
            if (q) return c.contactName?.toLowerCase().includes(q) || c.phoneNumber?.includes(q);
            return true;
        })
        .filter(c => {
            if (activeFilter === 'unread') return c.unreadCount > 0;
            return true;
        });

    // ─── Message date grouping
    const getDateLabel = (dateStr) => {
        const d = new Date(dateStr);
        if (isToday(d)) return 'Today';
        if (isYesterday(d)) return 'Yesterday';
        return format(d, 'dd MMM yyyy');
    };

    const messagesWithDateSeparators = messages.reduce((acc, msg, i) => {
        const prev = messages[i - 1];
        const label = getDateLabel(msg.timestamp);
        const prevLabel = prev ? getDateLabel(prev.timestamp) : null;
        if (label !== prevLabel) acc.push({ type: 'date', label });
        acc.push(msg);
        return acc;
    }, []);

    // ─── Status tick
    const StatusTick = ({ status }) => {
        if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
        if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
        if (status === 'sent') return <Check className="w-3.5 h-3.5 text-slate-400" />;
        return <Clock className="w-3 h-3 text-slate-400" />;
    };

    // ─── Quick Reply Creation
    const handleCreateQuickReply = async (e) => {
        e.preventDefault();
        if (!newQuickReply.shortcut || !newQuickReply.message) return;
        try {
            const res = await axios.post(`${API_BASE}/api/whatsapp/chat/quick-replies`, newQuickReply, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setQuickReplies(prev => [...prev, res.data]);
            setShowCreateQuickReply(false);
            setNewQuickReply({ shortcut: '', message: '' });
            // re-open the quick replies dropdown if they were typing
            if (inputText.startsWith('/')) {
                fetchQuickReplies();
                setShowQuickReplies(true);
            }
        } catch (err) {
            console.error("Failed to create quick reply", err);
            alert(err.response?.data?.error || 'Failed to create quick reply');
        }
    };

    // ─── Total unread
    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

    return (
        <div className="absolute inset-0 flex bg-white dark:bg-background-dark overflow-hidden"
            onClick={() => { setShowEmojiPicker(false); }}>

            {/* ═══ LEFT SIDEBAR ═══ */}
            <div className="w-[360px] border-r border-slate-200 dark:border-white/5 flex flex-col bg-white dark:bg-[#111b21] shrink-0">

                {/* Sidebar Header */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-[#202c33] flex justify-between items-center border-b border-slate-100 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow">
                            {user?.name?.[0]}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{user?.name}</p>
                            {totalUnread > 0 && (
                                <p className="text-xs text-green-600 dark:text-green-400">{totalUnread} unread</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setNotificationsEnabled(n => !n)}
                        className={`p-2 rounded-full transition-colors ${notificationsEnabled ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'} hover:bg-slate-100 dark:hover:bg-white/5`}
                        title={notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
                    >
                        {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                </div>

                {/* Search */}
                <div className="p-2 bg-white dark:bg-[#111b21] shrink-0">
                    <div className="bg-slate-100 dark:bg-[#202c33] rounded-xl flex items-center px-3 py-2 gap-2">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search or start new chat"
                            className="bg-transparent border-none focus:ring-0 text-sm w-full text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex px-2 pb-2 gap-1 shrink-0">
                    {['all', 'unread'].map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${activeFilter === f
                                ? 'bg-green-500 text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            {f}
                            {f === 'unread' && totalUnread > 0 && (
                                <span className="ml-1 bg-white/25 px-1 rounded-full">{totalUnread}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        // Skeleton loaders
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                                <div className="size-12 rounded-full bg-slate-200 dark:bg-white/10 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                                    <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-1/2" />
                                </div>
                            </div>
                        ))
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                            <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                {searchQuery ? 'No results found' : 'No conversations yet'}
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                                {!searchQuery && 'All communications have been read'}
                            </p>
                        </div>
                    ) : (
                        filteredConversations.map(chat => {
                            const isActive = selectedChat?.id === chat.id;
                            const initials = chat.contactName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || chat.phoneNumber?.slice(-2);
                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => {
                                        if (isActive) {
                                            setShowContactPanel(p => !p);
                                        } else {
                                            setSelectedChat(chat);
                                            setShowContactPanel(false);
                                            setReplyTo(null);
                                        }
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors relative ${isActive
                                        ? 'bg-slate-100 dark:bg-[#2a3942]'
                                        : 'hover:bg-slate-50 dark:hover:bg-[#1a2328]'
                                        }`}
                                >
                                    {/* Active indicator */}
                                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-green-500 rounded-r-full" />}

                                    {/* Avatar */}
                                    <div className="size-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm"
                                        style={{ background: `hsl(${(chat.phoneNumber?.charCodeAt(5) || 0) * 37 % 360}, 60%, 55%)` }}>
                                        {initials}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className={`text-sm truncate ${chat.unreadCount > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                                                {chat.contactName || chat.phoneNumber}
                                            </h3>
                                            <span className={`text-[10px] shrink-0 ml-1 ${chat.unreadCount > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {formatTime(chat.lastMessageAt)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <p className={`text-xs truncate max-w-[200px] ${chat.unreadCount > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {chat.lastMessage}
                                            </p>
                                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                                {/* Label dots */}
                                                {chat.labels?.slice(0, 2).map(l => (
                                                    <span key={l.label} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} title={l.label} />
                                                ))}
                                                {chat.unreadCount > 0 && (
                                                    <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.1rem] text-center">
                                                        {chat.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ═══ CHAT WINDOW ═══ */}
            {selectedChat ? (
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative min-w-0">
                        {/* WhatsApp background pattern */}
                        <div className="absolute inset-0 opacity-30 dark:opacity-5 pointer-events-none"
                            style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }} />

                        {/* Chat Header */}
                        <div className="px-4 py-3 bg-slate-100 dark:bg-[#202c33] flex justify-between items-center border-b border-slate-200 dark:border-white/5 shrink-0 z-20">
                            <button
                                onClick={() => setShowContactPanel(p => !p)}
                                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                                <div className="size-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                    style={{ background: `hsl(${(selectedChat.phoneNumber?.charCodeAt(5) || 0) * 37 % 360}, 60%, 55%)` }}>
                                    {selectedChat.contactName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                            {selectedChat.contactName || selectedChat.phoneNumber}
                                        </h2>
                                        {/* Label indicator only */}
                                        {selectedChat.labels && selectedChat.labels.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-md bg-opacity-90 text-[10px] font-bold text-white shadow-sm flex items-center max-w-[120px] truncate" style={{ backgroundColor: selectedChat.labels[0].color }}>
                                                <Tag className="w-3 h-3 mr-1" />
                                                {selectedChat.labels[0].name || selectedChat.labels[0].label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {isWindowOpen(selectedChat) ? (
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                session active
                                            </span>
                                        ) : `+${selectedChat.phoneNumber}`}
                                    </p>
                                </div>
                            </button>
                            <div className="flex gap-2 items-center">
                                {/* Header Group Select */}
                                <div className="relative mr-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowHeaderGroupDropdown(p => !p); }}
                                        className="w-32 text-xs bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-white/20 h-8 flex items-center justify-between"
                                    >
                                        <span className="truncate">
                                            {(() => {
                                                const currentGroupNames = headerGroups.map(hg => typeof hg === 'object' ? hg.name : hg);
                                                return currentGroupNames.length > 0 ? currentGroupNames[0] : "+ Add Group";
                                            })()}
                                        </span>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                                    </button>

                                    {showHeaderGroupDropdown && (
                                        <div
                                            className="absolute top-full right-0 mt-1 z-50"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="w-48 bg-white dark:bg-[#111b21] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1.5 shadow-black/5 dark:shadow-black/40 overflow-hidden">
                                                {availableGroups.length === 0 ? (
                                                    <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No groups found</div>
                                                ) : (
                                                    availableGroups.map((g) => {
                                                        const currentGroupNames = headerGroups.map(hg => typeof hg === 'object' ? hg.name : hg);
                                                        const isSelected = currentGroupNames.includes(g.name);
                                                        return (
                                                            <button
                                                                key={g.id}
                                                                onClick={() => {
                                                                    handleHeaderToggleGroup(g.name);
                                                                    setShowHeaderGroupDropdown(false);
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

                                <button
                                    onClick={() => setShowContactPanel(p => !p)}
                                    className={`p-2 rounded-full transition-colors ${showContactPanel ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                >
                                    <Info className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            ref={messagesContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto px-4 py-4 z-10 space-y-1"
                        >
                            {messagesWithDateSeparators.map((item, i) => {
                                // Date separator
                                if (item.type === 'date') return (
                                    <div key={`date-${i}`} className="flex justify-center my-3">
                                        <span className="bg-white/70 dark:bg-[#202c33]/80 text-slate-500 dark:text-slate-400 text-xs px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                                            {item.label}
                                        </span>
                                    </div>
                                );

                                const isMe = item.direction === 'OUTBOUND';
                                return (
                                    <div key={item.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                        <div className="relative max-w-[70%]">
                                            {/* Reply button on hover */}
                                            <button
                                                onClick={() => setReplyTo(item)}
                                                className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 p-1"
                                                title="Reply"
                                            >
                                                ↩
                                            </button>

                                            <div className={`rounded-2xl px-3 py-2 shadow-sm ${isMe
                                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-sm'
                                                : 'bg-white dark:bg-[#202c33] rounded-tl-sm'
                                                }`}>
                                                {/* Quoted reply */}
                                                {item.body?.startsWith('> ') && (
                                                    <div className="border-l-4 border-green-500 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-1 mb-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-full truncate">
                                                        {item.body.split('\n\n')[0].replace('> ', '')}
                                                    </div>
                                                )}

                                                {/* Media rendering */}
                                                {item.type === 'image' && item.mediaUrl && (
                                                    <img src={item.mediaUrl} alt="img" className="rounded-xl max-w-full max-h-60 object-cover mb-1" />
                                                )}
                                                {item.type === 'document' && item.mediaUrl && (
                                                    <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2 mb-1 hover:bg-black/10 transition-colors">
                                                        <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{item.body || 'Document'}</span>
                                                    </a>
                                                )}

                                                {/* Text / Template */}
                                                {item.type !== 'document' && (
                                                    <div className="text-sm text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap break-words">
                                                        {item.type === 'template' ? (
                                                            item.templateData ? (() => {
                                                                const comps = item.templateData.components || [];
                                                                const header = comps.find(c => c.type === 'HEADER');
                                                                const body = comps.find(c => c.type === 'BODY');
                                                                const buttons = comps.find(c => c.type === 'BUTTONS');
                                                                const carousel = comps.find(c => c.type === 'CAROUSEL');

                                                                return (
                                                                    <div className="flex flex-col" style={{ minWidth: carousel ? 260 : 200 }}>
                                                                        {/* Standard header (non-carousel) */}
                                                                        {!carousel && header?.format === 'IMAGE' && (
                                                                            <div className="w-full h-36 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 rounded-t-xl overflow-hidden flex items-center justify-center -mx-3 -mt-2 mb-2" style={{ width: 'calc(100% + 24px)' }}>
                                                                                <ImageIcon className="w-10 h-10 text-white/60" />
                                                                            </div>
                                                                        )}
                                                                        {!carousel && header?.format === 'VIDEO' && (
                                                                            <div className="w-full h-36 bg-slate-800 dark:bg-black rounded-t-xl overflow-hidden flex items-center justify-center -mx-3 -mt-2 mb-2 relative" style={{ width: 'calc(100% + 24px)' }}>
                                                                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                                                                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {!carousel && header?.format === 'DOCUMENT' && (
                                                                            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2 mb-2">
                                                                                <FileText className="w-6 h-6 text-red-400 shrink-0" />
                                                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Document</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Body text */}
                                                                        {body?.text && (
                                                                            <div className="text-[13px] text-slate-800 dark:text-slate-100 leading-snug pr-10 whitespace-pre-wrap">
                                                                                {body.text}
                                                                            </div>
                                                                        )}

                                                                        {/* Standard buttons (non-carousel) */}
                                                                        {!carousel && buttons?.buttons?.length > 0 && (
                                                                            <div className="flex flex-col gap-0 mt-2 -mx-3 -mb-2 border-t border-slate-200 dark:border-white/10">
                                                                                {buttons.buttons.map((btn, bIdx) => (
                                                                                    <div key={bIdx} className={`py-2 text-center text-[#00a884] dark:text-[#00d4a8] font-medium text-sm ${bIdx < buttons.buttons.length - 1 ? 'border-b border-slate-200 dark:border-white/10' : ''}`}>
                                                                                        {btn.type === 'URL' && '🔗 '}{btn.type === 'PHONE_NUMBER' && '📞 '}{btn.text}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* Carousel cards */}
                                                                        {carousel?.cards?.length > 0 && (
                                                                            <div className="mt-2 -mx-3 -mb-2">
                                                                                <div
                                                                                    className="flex gap-2 overflow-x-auto pb-2 pt-1 px-3"
                                                                                    style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                                                                                >
                                                                                    {carousel.cards.map((card, cIdx) => {
                                                                                        const cHeader = card.components?.find(c => c.type === 'HEADER');
                                                                                        const cBody = card.components?.find(c => c.type === 'BODY');
                                                                                        const cButtons = card.components?.find(c => c.type === 'BUTTONS');
                                                                                        return (
                                                                                            <div
                                                                                                key={cIdx}
                                                                                                className="flex-shrink-0 bg-white dark:bg-[#1f2c34] rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10"
                                                                                                style={{ width: 200, scrollSnapAlign: 'start' }}
                                                                                            >
                                                                                                {/* Card image area */}
                                                                                                {(cHeader?.format === 'IMAGE' || cHeader?.format === 'VIDEO') && (
                                                                                                    <div className="w-full h-28 relative overflow-hidden" style={{ background: cHeader.localUrl ? '#000' : undefined }}>
                                                                                                        {cHeader.localUrl ? (
                                                                                                            cHeader.format === 'VIDEO' ? (
                                                                                                                <video src={cHeader.localUrl} className="w-full h-full object-cover" muted playsInline />
                                                                                                            ) : (
                                                                                                                <img src={cHeader.localUrl} alt={`Card ${cIdx + 1}`} className="w-full h-full object-cover" />
                                                                                                            )
                                                                                                        ) : (
                                                                                                            <div className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-300 dark:from-purple-700 dark:to-pink-700 flex items-center justify-center">
                                                                                                                {cHeader.format === 'VIDEO' ? (
                                                                                                                    <div className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                                                                                                                        <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-white border-b-[7px] border-b-transparent ml-0.5" />
                                                                                                                    </div>
                                                                                                                ) : (
                                                                                                                    <ImageIcon className="w-8 h-8 text-white/50" />
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        <div className="absolute top-1.5 right-1.5 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded-full font-medium">
                                                                                                            {cIdx + 1}/{carousel.cards.length}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                {/* Card body */}
                                                                                                <div className="p-2.5">
                                                                                                    {cBody?.text && (
                                                                                                        <p className="text-[11px] text-slate-800 dark:text-slate-100 leading-tight line-clamp-3 mb-2">
                                                                                                            {cBody.text}
                                                                                                        </p>
                                                                                                    )}
                                                                                                    {/* Card buttons */}
                                                                                                    {cButtons?.buttons?.length > 0 && (
                                                                                                        <div className="flex flex-col gap-0 -mx-2.5 -mb-2.5 border-t border-slate-100 dark:border-white/10">
                                                                                                            {cButtons.buttons.map((b, bIdx) => (
                                                                                                                <div key={bIdx} className={`py-1.5 text-center text-[#00a884] dark:text-[#00d4a8] font-semibold text-[11px] ${bIdx < cButtons.buttons.length - 1 ? 'border-b border-slate-100 dark:border-white/10' : ''}`}>
                                                                                                                    {b.type === 'URL' && '🔗 '}{b.type === 'PHONE_NUMBER' && '📞 '}{b.text}
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()
                                                                : (
                                                                    <span className="text-slate-500 dark:text-slate-300 italic">📄 {item.body}</span>
                                                                )
                                                        ) : (
                                                            item.body?.startsWith('> ')
                                                                ? item.body.split('\n\n').slice(1).join('\n\n')
                                                                : item.body
                                                        )}
                                                    </div>
                                                )}


                                                {/* Time + tick */}
                                                <div className="absolute right-2.5 bottom-1.5 flex items-center gap-1">
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-400/70">
                                                        {format(new Date(item.timestamp), 'HH:mm')}
                                                    </span>
                                                    {isMe && <StatusTick status={item.status} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Scroll to bottom FAB */}
                        {showScrollFab && (
                            <button
                                onClick={scrollToBottom}
                                className="absolute bottom-24 right-6 z-20 bg-white dark:bg-[#202c33] text-slate-600 dark:text-slate-300 shadow-lg border border-slate-200 dark:border-white/10 rounded-full p-2 hover:bg-slate-50 dark:hover:bg-[#2a3942] transition-all"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        )}

                        {/* Footer */}
                        <div className="shrink-0 z-10">
                            {/* Reply-to preview */}
                            {replyTo && (
                                <div className="flex items-center gap-3 px-4 py-2 bg-slate-200/80 dark:bg-[#182229] border-t border-slate-300 dark:border-white/10">
                                    <div className="flex-1 border-l-4 border-green-500 pl-3">
                                        <p className="text-xs font-medium text-green-600 dark:text-green-400">Replying to</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{replyTo.body}</p>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="px-4 py-3 bg-slate-100 dark:bg-[#202c33]">
                                {isWindowOpen(selectedChat) ? (
                                    <div className="relative">
                                        {/* Quick Reply Suggestions */}
                                        {showQuickReplies && (
                                            <QuickReplySuggestions
                                                replies={quickReplies}
                                                query={quickReplyQuery}
                                                onSelect={(msg) => { setInputText(msg); setShowQuickReplies(false); inputRef.current?.focus(); }}
                                                onCreate={() => { setShowQuickReplies(false); setShowCreateQuickReply(true); }}
                                            />
                                        )}
                                        {/* Emoji Picker */}
                                        {showEmojiPicker && (
                                            <div onClick={e => e.stopPropagation()}>
                                                <EmojiPicker
                                                    onSelect={(emoji) => { setInputText(p => p + emoji); inputRef.current?.focus(); }}
                                                    onClose={() => setShowEmojiPicker(false)}
                                                />
                                            </div>
                                        )}

                                        <form onSubmit={handleSend} className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={e => { e.stopPropagation(); setShowEmojiPicker(p => !p); }}
                                                className={`shrink-0 transition-colors ${showEmojiPicker ? 'text-yellow-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                            >
                                                <Smile className="w-6 h-6" />
                                            </button>

                                            {/* File Upload Hidden Input */}
                                            <input
                                                type="file"
                                                id="media-upload"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                                            />
                                            <label
                                                htmlFor="media-upload"
                                                className={`cursor-pointer shrink-0 transition-colors ${uploadingMedia ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                            >
                                                {uploadingMedia ? (
                                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Paperclip className="w-6 h-6" />
                                                )}
                                            </label>

                                            <div className="flex-1 relative">
                                                <input
                                                    ref={inputRef}
                                                    value={inputText}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="Type a message or / for quick replies"
                                                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-[#2a3942] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border-none focus:ring-0 outline-none"
                                                    disabled={uploadingMedia}
                                                />
                                            </div>
                                            <button type="submit" disabled={sending || !inputText.trim()}
                                                className={`shrink-0 transition-all ${inputText.trim() ? 'text-green-600 dark:text-green-400 hover:scale-110' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {sending ? (
                                                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                                ) : inputText.trim() ? (
                                                    <Send className="w-6 h-6" />
                                                ) : (
                                                    <Mic className="w-6 h-6" />
                                                )}
                                            </button>
                                        </form>
                                        {sendError && <p className="text-xs text-red-500 mt-1 px-1">{sendError}</p>}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-1 text-center">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                                            <Clock className="w-4 h-4" />
                                            <span>24-hour session expired</span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Send a template to reopen this conversation</p>
                                        <button
                                            onClick={() => window.location.href = `/campaigns?phone=${selectedChat.phoneNumber}`}
                                            className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl font-medium shadow-sm transition-all hover:shadow-md"
                                        >
                                            Send Template
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ─── Contact Info Panel ─── */}
                    {showContactPanel && (
                        <ContactInfoPanel
                            conversation={selectedChat}
                            onClose={() => setShowContactPanel(false)}
                            onUpdate={(updated) => {
                                // If groups were updated, update headerGroups state directly
                                if (updated.headerGroups !== undefined) {
                                    setHeaderGroups(updated.headerGroups);
                                }
                                setSelectedChat(updated);
                                setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
                            }}
                        />
                    )}
                </div>
            ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#111b21] relative">
                    <div className="absolute inset-0 opacity-30 dark:opacity-5 pointer-events-none"
                        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }} />
                    <div className="relative z-10 flex flex-col items-center text-center p-8">
                        <div className="w-24 h-24 bg-white dark:bg-[#202c33] rounded-full flex items-center justify-center shadow-xl mb-6">
                            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-500" />
                        </div>
                        <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 mb-3">WhatsApp Inbox</h1>
                        {!isConfigured ? (
                            <div className="flex flex-col items-center">
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm leading-relaxed mb-6">
                                    Your WhatsApp Business account is not connected yet. Connect it to start chatting with your customers.
                                </p>
                                <button
                                    onClick={() => navigate('/settings', { state: { initialTab: 'whatsapp_gateway' } })}
                                    className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                                >
                                    Configure WhatsApp
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed mb-6">
                                    Select a conversation to start messaging.
                                    Send campaigns to engage with your contacts.
                                </p>
                                {conversations.length > 0 && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-white/5 px-4 py-2 rounded-full">
                                        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} • {totalUnread} unread
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Create Quick Reply Modal ─── */}
            {showCreateQuickReply && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateQuickReply(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 dark:text-white">Create Quick Reply</h3>
                            <button onClick={() => setShowCreateQuickReply(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateQuickReply} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shortcut</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">/</span>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={newQuickReply.shortcut}
                                        onChange={e => setNewQuickReply({ ...newQuickReply, shortcut: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                                        className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="hello"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Letters, numbers, dashes, and underscores only.</p>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newQuickReply.message}
                                    onChange={e => setNewQuickReply({ ...newQuickReply, message: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    placeholder="Type the full response here..."
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCreateQuickReply(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={!newQuickReply.shortcut || !newQuickReply.message} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50">
                                    Save Shortcut
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppInbox;

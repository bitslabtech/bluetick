import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
    Search, MoreVertical, Paperclip, Smile, Send, Mic, Check, CheckCheck, Clock,
    MessageSquare, X, ChevronDown, Image as ImageIcon, FileText, Info, Bell, BellOff,
    Tag, Users, UserCheck, Lock, Layout, ChevronRight, Eye, AlertCircle, Zap, Sparkles, Wand2, Hand, Bot
} from 'lucide-react';
import { format, isToday, isYesterday, differenceInHours } from 'date-fns';
import { io } from 'socket.io-client';
import EmojiPicker from '../components/EmojiPicker';
import QuickReplySuggestions from '../components/QuickReplySuggestions';
import ContactInfoPanel from '../components/ContactInfoPanel';
import AssignAgentPopover from '../components/AssignAgentPopover';

const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

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
    const { showToast } = useUI();
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
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [isConfigured, setIsConfigured] = useState(true);
    const [hasActiveBots, setHasActiveBots] = useState(false);

    const isSubMember = !!user?.parentUserId;
    const teamPolicy = user?.teamPolicy || { inboxVisibility: 'see_all', phonePrivacy: 'visible' };

    const renderName = (name, phone) => {
        const isActuallyPhone = !name || name === phone || /^\d+$/.test(name.replace(/\D/g, ''));
        if (isActuallyPhone && isSubMember) {
            if (teamPolicy.phonePrivacy === 'blurred') return <span className="blur-sm select-none">{phone || name}</span>;
            if (teamPolicy.phonePrivacy === 'masked') return `****${(phone || name)?.slice(-4)}`;
        }
        return name || phone;
    };

    // Assignment
    const [showAssignPopover, setShowAssignPopover] = useState(false);
    const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
    const [mineCount, setMineCount] = useState(0);

    // Search & filter
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all | unread | mine

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

    // Template Modal
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [templateLimit, setTemplateLimit] = useState(-1);           // plan limit (-1 = unlimited)
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateVariables, setTemplateVariables] = useState({});  // card_N_var_N, body_N, plain N
    const [cardParams, setCardParams] = useState({});                 // card_N_headerMediaId, card_N_headerLocalUrl, card_N_previewUrl, card_N_btn_N_url
    const [cardUploading, setCardUploading] = useState({});           // { cardIdx: true/false }
    const [templateSearch, setTemplateSearch] = useState('');
    const [sendingTemplate, setSendingTemplate] = useState(false);
    const [templateStep, setTemplateStep] = useState(1); // 1=select, 2=configure

    // AI Chat Features
    const [isAiDrafting, setIsAiDrafting] = useState(false);
    const [isAiEnhancing, setIsAiEnhancing] = useState(false);
    const [showAiDraftModal, setShowAiDraftModal] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const conversationsRef = useRef([]);
    const inputRef = useRef(null);
    const socketRef = useRef(null);
    const prevChatIdRef = useRef(null);
    const isInitialChatLoad = useRef(false);

    // â”€â”€â”€ Init: Fetch conversations + socket + quick replies + notification permission
    useEffect(() => {
        fetchConversations();
        fetchQuickReplies();


        // Check if WhatsApp is configured
        if (user?.id) {
            axios.get(`${API_BASE}/api/dashboard/stats`).then(res => {
                setIsConfigured(res.data.isWhatsappConfigured);
                setHasActiveBots(res.data.hasActiveBots || false);
            }).catch(() => {
                setIsConfigured(false);
                setHasActiveBots(false);
            });
        }

        // Fetch groups
        if (user?.id) {
            axios.get(`${API_BASE}/api/groups`).then(res => setAvailableGroups(res.data)).catch(err => console.error('Failed to fetch groups:', err));
        }

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Socket setup
        const socket = io(API_BASE);
        socketRef.current = socket;

        socket.on('connect', () => {
            if (user?.id) {
                socket.emit('join_waba', user.id);
                socket.emit('join_personal', user.id); // For assignment notifications
            }
        });

        // Real-time assignment notification
        socket.on('conversation_assigned', ({ conversation, assignedBy }) => {
            // Show toast-like notification
            const toastId = `assign-${Date.now()}`;
            const toastDiv = document.createElement('div');
            toastDiv.id = toastId;
            toastDiv.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:12px 18px;border-radius:16px;font-size:13px;font-weight:600;box-shadow:0 8px 32px rgba(79,70,229,0.4);animation:slideInRight 0.3s ease;max-width:300px;';
            const displayName = conversation.contactName || conversation.phoneNumber;
            const safeName = !conversation.contactName || conversation.contactName === conversation.phoneNumber || /^\d+$/.test(conversation.contactName.replace(/\D/g, ''))
                ? (isSubMember && teamPolicy.phonePrivacy === 'masked' ? `****${conversation.phoneNumber?.slice(-4)}` : conversation.phoneNumber)
                : conversation.contactName;

            toastDiv.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>${assignedBy} assigned you a chat with <strong class="${isSubMember && teamPolicy.phonePrivacy === 'blurred' && (!conversation.contactName || conversation.contactName === conversation.phoneNumber || /^\d+$/.test(conversation.contactName.replace(/\D/g, ''))) ? 'blur-sm select-none' : ''}">${safeName}</strong></span></div>`;
            document.body.appendChild(toastDiv);
            setTimeout(() => { toastDiv.remove(); }, 4000);

            // Update conversations list to include this conversation
            setConversations(prev => {
                const exists = prev.find(c => c.id === conversation.id);
                if (exists) return prev.map(c => c.id === conversation.id ? { ...c, ...conversation } : c);
                return [conversation, ...prev];
            });
            setMineCount(n => n + 1);
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
                    const safeName = !conversation.contactName || conversation.contactName === conversation.phoneNumber || /^\d+$/.test(conversation.contactName.replace(/\D/g, ''))
                        ? (isSubMember && teamPolicy.phonePrivacy === 'masked' ? `****${conversation.phoneNumber?.slice(-4)}` : conversation.phoneNumber)
                        : conversation.contactName;
                    showBrowserNotification(safeName, message.body || '📎 Media');
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

        socket.on('conversation_flow_state', ({ conversationId, inFlow }) => {
            setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, inFlow } : c));
            conversationsRef.current = conversationsRef.current.map(c => c.id === conversationId ? { ...c, inFlow } : c);
            
            setSelectedChat(prevChat => {
                if (prevChat?.id === conversationId) {
                    return { ...prevChat, inFlow };
                }
                return prevChat;
            });
        });

        socket.on('conversation_bot_update', ({ conversationId, botStatus }) => {
            setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, botStatus } : c));
            conversationsRef.current = conversationsRef.current.map(c => c.id === conversationId ? { ...c, botStatus } : c);
            setSelectedChat(prevChat => {
                if (prevChat?.id === conversationId) {
                    return { ...prevChat, botStatus };
                }
                return prevChat;
            });
        });

        return () => socket.disconnect();
    }, [user?.id]);

    // Fetch messages and contact groups when chat opens
    useEffect(() => {
        if (selectedChat) {
            if (selectedChat.id !== prevChatIdRef.current) {
                isInitialChatLoad.current = true;
                prevChatIdRef.current = selectedChat.id;
            }
            fetchMessages(selectedChat.id);
            // Fetch groups for header
            if (selectedChat.id) {
                axios.get(`${API_BASE}/api/whatsapp/chat/conversations/${selectedChat.id}/contact`).then(res => {
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

    // Scroll to bottom on new messages or chat change
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        if (isInitialChatLoad.current && messages.length > 0) {
            // Use a small delay to ensure React has reconciled the DOM
            const timer = setTimeout(() => {
                scrollToBottom('auto');
                isInitialChatLoad.current = false;
            }, 100);
            return () => clearTimeout(timer);
        }

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
            scrollToBottom('smooth');
        }
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

    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    // â”€â”€â”€ API calls
    const fetchConversations = async (searchStr = searchQuery, filterStr = activeFilter) => {
        try {
            const res = await axios.get(`${API_BASE}/api/whatsapp/chat/conversations`, {
                params: {
                    search: searchStr,
                    unreadOnly: filterStr === 'unread',
                    assignedFilter: filterStr === 'mine' ? 'mine' : 'all',
                    limit: 300
                }
            });
            setConversations(res.data);
            conversationsRef.current = res.data;
            // Update mine count
            const myId = user?.id;
            setMineCount(res.data.filter(c => c.assignedTo === myId).length);
        } catch (err) { console.error('Failed to fetch conversations:', err); }
        finally { setLoading(false); }
    };

    // Refetch conversations when search or filter change
    useEffect(() => {
        const bounce = setTimeout(() => {
            fetchConversations(searchQuery, activeFilter);
        }, 500);
        return () => clearTimeout(bounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, activeFilter]);

    const fetchMessages = async (chatId) => {
        try {
            const res = await axios.get(`${API_BASE}/api/whatsapp/chat/conversations/${chatId}/messages`);
            setMessages(res.data);
            const conv = conversationsRef.current.find(c => c.id === chatId);
            if (conv?.unreadCount > 0) {
                await axios.post(`${API_BASE}/api/whatsapp/chat/conversations/${chatId}/read`, {});
                setConversations(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
            }
        } catch (err) { console.error('Failed to fetch messages:', err); }
    };

    const fetchQuickReplies = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/whatsapp/chat/quick-replies`);
            setQuickReplies(res.data);
        } catch (err) { console.error('Failed to fetch quick replies:', err); }
    };

    const fetchTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const [tmplRes, billingRes] = await Promise.all([
                axios.get(`${API_BASE}/api/templates`),
                axios.get(`${API_BASE}/api/billing`)
            ]);
            // Sort oldest first (same as Templates.jsx) so first N = plan-active
            const sorted = [...tmplRes.data]
                .filter(t => t.status === 'APPROVED')
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setTemplates(sorted);
            setTemplateLimit(billingRes.data?.usage?.templateLimit ?? -1);
        } catch (err) { console.error('Failed to fetch templates:', err); }
        finally { setTemplatesLoading(false); }
    };

    const openTemplateModal = () => {
        setShowTemplateModal(true);
        setTemplateStep(1);
        setSelectedTemplate(null);
        setTemplateVariables({});
        setCardParams({});
        setCardUploading({});
        setTemplateSearch('');
        fetchTemplates();
    };

    // Upload card header image/video to Meta via backend (same as FlowConfigurator)
    const handleCardMediaUpload = async (cardIdx, file) => {
        if (!file) return;
        // Show local blob preview immediately
        const blobUrl = URL.createObjectURL(file);
        setCardParams(prev => ({
            ...prev,
            [`card_${cardIdx}_previewUrl`]: blobUrl,
            [`card_${cardIdx}_fileName`]: file.name,
        }));
        setCardUploading(prev => ({ ...prev, [cardIdx]: true }));
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await axios.post(`${API_BASE}/api/templates/upload-message-media`, fd, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setCardParams(prev => ({
                ...prev,
                [`card_${cardIdx}_headerMediaId`]: res.data.mediaId,
                [`card_${cardIdx}_headerLocalUrl`]: res.data.localUrl,
            }));
        } catch (err) {
            console.error('Card media upload failed:', err);
        } finally {
            setCardUploading(prev => ({ ...prev, [cardIdx]: false }));
        }
    };

    const handleSendTemplate = async () => {
        if (!selectedTemplate || !selectedChat || sendingTemplate) return;
        setSendingTemplate(true);
        try {
            const isCarousel = selectedTemplate.archetype === 'carousel';
            let components = [];

            if (isCarousel && Array.isArray(selectedTemplate.cards)) {
                // Main body vars (rare)
                const mainVarMatches = (selectedTemplate.content || '').match(/\{\{([^}]+)\}\}/g) || [];
                const mainVarNums = [...new Set(mainVarMatches.map(v => v.replace(/[{}]/g, '')))].sort();
                if (mainVarNums.length > 0) {
                    components.push({
                        type: 'body',
                        parameters: mainVarNums.map(n => ({ type: 'text', text: templateVariables[`body_${n}`] || '' }))
                    });
                }

                // Per-card components — must use card_index field
                const carouselCards = selectedTemplate.cards.map((card, cardIdx) => {
                    const cardComps = [];

                    // Header media
                    const mediaId = cardParams[`card_${cardIdx}_headerMediaId`];
                    if (card.headerType && card.headerType !== 'NONE' && mediaId) {
                        const mediaType = card.headerType.toLowerCase();
                        cardComps.push({
                            type: 'header',
                            parameters: [{ type: mediaType, [mediaType]: { id: mediaId } }]
                        });
                    }

                    // Body variables
                    const cardVarMatches = (card.content || '').match(/\{\{([^}]+)\}\}/g) || [];
                    const cardVarNums = [...new Set(cardVarMatches.map(v => v.replace(/[{}]/g, '')))].sort();
                    if (cardVarNums.length > 0) {
                        cardComps.push({
                            type: 'body',
                            parameters: cardVarNums.map(n => ({ type: 'text', text: templateVariables[`card_${cardIdx}_var_${n}`] || '' }))
                        });
                    }

                    // Buttons (URL override / quick_reply payload)
                    if (card.buttons && card.buttons.length > 0) {
                        card.buttons.forEach((btn, btnIdx) => {
                            if (btn.type === 'URL') {
                                const overrideUrl = cardParams[`card_${cardIdx}_btn_${btnIdx}_url`];
                                const btnComp = { type: 'button', sub_type: 'url', index: String(btnIdx) };
                                if (overrideUrl) btnComp.parameters = [{ type: 'text', text: overrideUrl }];
                                cardComps.push(btnComp);
                            } else if (btn.type === 'QUICK_REPLY') {
                                cardComps.push({
                                    type: 'button', sub_type: 'quick_reply',
                                    index: String(btnIdx),
                                    parameters: [{ type: 'payload', payload: btn.text || 'reply' }]
                                });
                            }
                        });
                    }

                    return { card_index: cardIdx, components: cardComps };
                });

                components.push({ type: 'carousel', cards: carouselCards });

            } else {
                // Standard template
                const mainVarMatches = (selectedTemplate.content || '').match(/\{\{([^}]+)\}\}/g) || [];
                const uniqueVarNums = [...new Set(mainVarMatches.map(v => v.replace(/[{}]/g, '')))].sort();
                if (uniqueVarNums.length > 0) {
                    components.push({
                        type: 'body',
                        parameters: uniqueVarNums.map(n => ({ type: 'text', text: templateVariables[n] || '' }))
                    });
                }
            }

            await axios.post(`${API_BASE}/api/whatsapp/chat/send/template`, {
                conversationId: selectedChat.id,
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.name,
                languageCode: selectedTemplate.language || 'en_US',
                components
            });

            setShowTemplateModal(false);
            fetchMessages(selectedChat.id);
            fetchConversations();
        } catch (err) {
            console.error('Failed to send template:', err);
            alert(err.response?.data?.error || 'Failed to send template');
        } finally { setSendingTemplate(false); }
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
            const res = await axios.post(`${API_BASE}/api/whatsapp/chat/conversations/${selectedChat.id}/contact/groups`, {
                tags: newGroups
            });

            if (res.data.id) {
                setHeaderContactId(res.data.id);
            }
        } catch (err) {
            console.error('Failed to update groups:', err);
        }
    };

    const handleBotToggle = async (newStatus) => {
        if (!selectedChat) return;
        try {
            const res = await axios.patch(`${API_BASE}/api/whatsapp/chat/conversations/${selectedChat.id}/bot-status`, { botStatus: newStatus });
            
            // Only update local state if successful (socket might also update it)
            setSelectedChat(prev => ({ ...prev, botStatus: res.data.botStatus }));
            setConversations(prev => prev.map(c => c.id === selectedChat.id ? { ...c, botStatus: res.data.botStatus } : c));
            conversationsRef.current = conversationsRef.current.map(c => c.id === selectedChat.id ? { ...c, botStatus: res.data.botStatus } : c);
            
            showToast({ type: 'success', title: newStatus === 'paused' ? '👨‍💻 Manual Override' : '🤖 Bot Activated', message: newStatus === 'paused' ? 'You have taken over this conversation.' : 'AI/Flow Bot has resumed handling this conversation.' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to toggle bot status');
        }
    };

    // === AI Handlers ===
    const handleAiDraftReq = async () => {
        if (!selectedChat) return;
        setIsAiDrafting(true);
        setShowAiDraftModal(false);
        try {
            const res = await axios.post(`${API_BASE}/api/whatsapp/chat/ai-draft`, { conversationId: selectedChat.id });
            if (res.data.draft) {
                setInputText(res.data.draft);
                showToast({ type: 'success', title: '✨ AI Reply Drafted', message: `Reply ready! ${res.data.tokensDeducted} AI tokens used.` });
                if (inputRef.current) {
                    inputRef.current.classList.add('ring-2', 'ring-indigo-500', 'shadow-[0_0_15px_rgba(99,102,241,0.5)]');
                    setTimeout(() => {
                        if (inputRef.current) {
                            inputRef.current.classList.remove('ring-2', 'ring-indigo-500', 'shadow-[0_0_15px_rgba(99,102,241,0.5)]');
                        }
                    }, 2000);
                }
            }
        } catch (err) {
            console.error('AI Draft Error', err);
            toast.error(err.response?.data?.error || 'AI Drafter failed.');
        } finally {
            setIsAiDrafting(false);
        }
    };

    const handleAiEnhanceMsg = async () => {
        const text = inputText.trim();
        if (!text) return;
        setIsAiEnhancing(true);
        try {
            const res = await axios.post(`${API_BASE}/api/whatsapp/chat/ai-enhance`, { text });
            if (res.data.enhancedText) {
                setInputText(res.data.enhancedText);
                showToast({ type: 'success', title: '✨ Message Enhanced', message: `Text optimized! ${res.data.tokensDeducted} AI tokens used.` });
                if (inputRef.current) {
                    inputRef.current.classList.add('ring-2', 'ring-indigo-500', 'shadow-[0_0_15px_rgba(99,102,241,0.5)]');
                    setTimeout(() => {
                        if (inputRef.current) {
                            inputRef.current.classList.remove('ring-2', 'ring-indigo-500', 'shadow-[0_0_15px_rgba(99,102,241,0.5)]');
                        }
                    }, 2000);
                }
            }
        } catch (err) {
            console.error('AI Enhance Error', err);
            toast.error(err.response?.data?.error || 'AI Enhancer failed.');
        } finally {
            setIsAiEnhancing(false);
        }
    };

    // â”€â”€â”€ Sending
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
            });

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
            } else if (err.response?.status === 403 && errData?.error?.includes('assigned to you')) {
                setShowAccessDeniedModal(true);
            } else {
                setSendError(errData?.error || 'Failed to send message');
            }
        } finally { setSending(false); }
    };

    // â”€â”€â”€ Input handling (/ for quick replies, emoji)
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

    // â”€â”€â”€ Helpers
    const isWindowOpen = (chat) => {
        if (!chat?.lastInboundMessageAt) return false;
        const lastInbound = new Date(chat.lastInboundMessageAt).getTime();
        const now = Date.now();
        const diffHours = (now - lastInbound) / (1000 * 60 * 60);
        return diffHours < 24;
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isToday(d)) return format(d, 'HH:mm');
        if (isYesterday(d)) return 'Yesterday';
        return format(d, 'dd/MM/yy');
    };

    // â”€â”€â”€ Filtered conversation list
    // We now filter on the backend via the debounced search useEffect
    const filteredConversations = conversations;

    // â”€â”€â”€ Message date grouping
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

    // â”€â”€â”€ Status tick
    const StatusTick = ({ status }) => {
        if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
        if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
        if (status === 'sent') return <Check className="w-3.5 h-3.5 text-slate-400" />;
        return <Clock className="w-3 h-3 text-slate-400" />;
    };

    // â”€â”€â”€ Quick Reply Creation
    const handleCreateQuickReply = async (e) => {
        e.preventDefault();
        if (!newQuickReply.shortcut || !newQuickReply.message) return;
        try {
            const res = await axios.post(`${API_BASE}/api/whatsapp/chat/quick-replies`, newQuickReply);
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

    // â”€â”€â”€ Total unread
    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

    return (
        <div className="absolute inset-0 flex bg-white dark:bg-background-dark overflow-hidden"
            onClick={() => { setShowEmojiPicker(false); }}>

            {/* â•â•â• LEFT SIDEBAR â•â•â• */}
            <div className="w-[360px] max-w-full border-r border-slate-200 dark:border-white/5 flex flex-col bg-white dark:bg-[#111b21] shrink-0">

                {/* Sidebar Header */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-[#202c33] flex justify-between items-center border-b border-slate-100 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow">
                            {user?.name?.[0]}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{user?.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{conversations.length} Chat{conversations.length !== 1 ? 's' : ''}</p>
                                {totalUnread > 0 && (
                                    <>
                                        <span className="text-slate-300 dark:text-white/10 text-[10px]">•</span>
                                        <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">{totalUnread} Unread</p>
                                    </>
                                )}
                            </div>
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
                    {[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'mine', label: 'Mine' }].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === f.id
                                ? 'bg-green-500 text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            {f.label}
                            {f.id === 'unread' && totalUnread > 0 && (
                                <span className="ml-1 bg-white/25 px-1 rounded-full">{totalUnread}</span>
                            )}
                            {f.id === 'mine' && mineCount > 0 && (
                                <span className="ml-1 bg-white/25 px-1 rounded-full">{mineCount}</span>
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
                        <div className="flex flex-col items-center justify-center h-full p-4 md:p-6 text-center">
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

                                    {/* Avatar with assignee badge */}
                                    <div className="relative shrink-0">
                                        <div className="size-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                            style={{ background: `hsl(${(chat.phoneNumber?.charCodeAt(5) || 0) * 37 % 360}, 60%, 55%)` }}>
                                            {initials}
                                        </div>
                                        {chat.assignedToName && (
                                            <div
                                                title={`Assigned to ${chat.assignedToName}`}
                                                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-indigo-600 border-2 border-white dark:border-[#111b21] flex items-center justify-center text-white text-[8px] font-bold shadow"
                                            >
                                                {chat.assignedToName.slice(0, 1).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className={`text-sm truncate ${chat.unreadCount > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                                                {renderName(chat.contactName, chat.phoneNumber)}
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
                                                <div className="flex items-center gap-0.5 mr-1">
                                                    {chat.labels?.slice(0, 4).map(l => (
                                                        <span key={l.id || l.label} className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: l.color }} title={l.name || l.label} />
                                                    ))}
                                                    {chat.labels?.length > 4 && (
                                                        <span className="text-[9px] font-bold text-slate-400 ml-0.5">+{chat.labels.length - 4}</span>
                                                    )}
                                                </div>
                                                {chat.unreadCount > 0 && (
                                                    <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.1rem] max-w-full text-center">
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

            {/* â•â•â• CHAT WINDOW â•â•â• */}
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
                                            {renderName(selectedChat.contactName, selectedChat.phoneNumber)}
                                        </h2>
                                        {/* Label indicators */}
                                        {selectedChat.labels && selectedChat.labels.length > 0 && (
                                            <div className="flex gap-1 overflow-hidden relative" style={{ maxWidth: '240px' }}>
                                                <div className={`flex gap-1 shrink-0 ${selectedChat.labels.length > 3 ? 'animate-marquee' : ''}`}>
                                                    {selectedChat.labels.map((lbl, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 rounded-md bg-opacity-90 text-[10px] font-bold text-white shadow-sm flex items-center whitespace-nowrap shrink-0" style={{ backgroundColor: lbl.color }}>
                                                            <Tag className="w-3 h-3 mr-1 shrink-0" />
                                                            {lbl.name || lbl.label}
                                                        </span>
                                                    ))}
                                                    {/* Duplicate for seamless marquee if > 3 */}
                                                    {selectedChat.labels.length > 3 && selectedChat.labels.map((lbl, idx) => (
                                                        <span key={`dup-${idx}`} className="px-2 py-0.5 rounded-md bg-opacity-90 text-[10px] font-bold text-white shadow-sm flex items-center whitespace-nowrap shrink-0" style={{ backgroundColor: lbl.color }}>
                                                            <Tag className="w-3 h-3 mr-1 shrink-0" />
                                                            {lbl.name || lbl.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {isWindowOpen(selectedChat) ? (
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                session active
                                            </span>
                                        ) : (
                                            <span className={isSubMember && teamPolicy.phonePrivacy === 'blurred' ? 'blur-sm select-none' : ''}>
                                                {isSubMember && teamPolicy.phonePrivacy === 'masked'
                                                    ? `****${selectedChat.phoneNumber?.slice(-4) || ''}`
                                                    : `+${selectedChat.phoneNumber}`
                                                }
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </button>
                            <div className="flex gap-2 items-center">

                                {/* Assign Agent Button + popover */}
                                {(!isSubMember || user?.teamRole === 'admin') && (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowAssignPopover(p => !p); }}
                                            className={`p-2 rounded-full transition-colors ${selectedChat.assignedTo
                                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                                }`}
                                            title={selectedChat.assignedTo ? `Assigned to ${selectedChat.assignedToName}` : 'Assign conversation'}
                                        >
                                            <UserCheck className="w-5 h-5" />
                                        </button>
                                        {showAssignPopover && (
                                            <AssignAgentPopover
                                                conversation={selectedChat}
                                                onAssign={(assignedToId, assignedToName) => {
                                                    setSelectedChat(prev => ({ ...prev, assignedTo: assignedToId, assignedToName }));
                                                    setConversations(prev => prev.map(c =>
                                                        c.id === selectedChat.id ? { ...c, assignedTo: assignedToId, assignedToName } : c
                                                    ));
                                                }}
                                                onClose={() => setShowAssignPopover(false)}
                                            />
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowContactPanel(p => !p)}
                                    className={`p-2 rounded-full transition-colors ${showContactPanel ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                >
                                    <Info className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Top Banner if Bot is Paused and available */}
                        {hasActiveBots && selectedChat?.botStatus === 'paused' && (
                            <div className="bg-amber-100/80 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-900 px-4 py-2 flex items-center justify-between text-xs backdrop-blur-sm shadow-sm z-10 sticky top-0 shrink-0">
                                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
                                    <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
                                    <span>Bot is paused. Manual messaging active.</span>
                                </div>
                                <button onClick={() => handleBotToggle('active')} className="bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-amber-900 dark:text-amber-100 px-3 py-1 rounded-md font-bold transition-colors">
                                    Re-enable Bot
                                </button>
                            </div>
                        )}

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
                                                    <img src={item.mediaUrl.startsWith('/uploads') ? `${API_BASE}${item.mediaUrl}` : item.mediaUrl} alt="img" className="rounded-xl max-w-full max-h-60 object-cover mb-1" />
                                                )}
                                                {item.type === 'document' && item.mediaUrl && (
                                                    <a href={item.mediaUrl.startsWith('/uploads') ? `${API_BASE}${item.mediaUrl}` : item.mediaUrl} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2 mb-1 hover:bg-black/10 transition-colors">
                                                        <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{item.body || 'Document'}</span>
                                                    </a>
                                                )}

                                                {/* Text / Template */}
                                                {item.type !== 'document' && (
                                                    <div className="text-sm text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap break-words pb-5 pr-14 pl-1 pt-1 min-w-[3rem] max-w-full">
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
                                                                                    className="flex gap-2 overflow-x-auto pb-2 pt-1 px-3 carousel-scrollbar"
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
                                                                                                        {cHeader.localUrl ? (() => {
                                                                                                            // If it's a relative path starting with /uploads, prepend API_BASE
                                                                                                            const imgSrc = cHeader.localUrl.startsWith('/uploads') ? `${API_BASE}${cHeader.localUrl}` : cHeader.localUrl;
                                                                                                            return cHeader.format === 'VIDEO' ? (
                                                                                                                <video src={imgSrc} className="w-full h-full object-cover" muted playsInline />
                                                                                                            ) : (
                                                                                                                <img src={imgSrc} alt={`Card ${cIdx + 1}`} className="w-full h-full object-cover" />
                                                                                                            );
                                                                                                        })() : (
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
                                {/* Reply lock for restricted team members */}
                                {isSubMember && user?.teamRole !== 'admin' &&
                                    (teamPolicy.inboxVisibility === 'see_all_reply_assigned' || teamPolicy.inboxVisibility === 'see_assigned') &&
                                    selectedChat.assignedTo !== user?.realId ? (
                                    <div
                                        onClick={() => setShowAccessDeniedModal(true)}
                                        className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-white/5 rounded-xl cursor-help hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <Lock className="w-4 h-4" />
                                        <span>You can only reply to conversations assigned to you</span>
                                    </div>
                                ) : selectedChat?.inFlow && selectedChat?.botStatus !== 'paused' ? (
                                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/60 shadow-inner relative overflow-hidden group">
                                        {/* Animated Shimmer Background */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                        
                                        <div className="flex items-center gap-4 z-10 w-full sm:w-auto mb-3 sm:mb-0">
                                            <div className="relative shrink-0">
                                                {/* Ping animation behind icon */}
                                                <div className="absolute inset-0 rounded-xl bg-indigo-400 dark:bg-indigo-500 animate-ping opacity-30" />
                                                <div className="w-12 h-12 bg-white dark:bg-[#1f2937] text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center relative shadow-sm border border-indigo-50 dark:border-indigo-900/50">
                                                    <Bot className="w-6 h-6 animate-pulse" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 leading-tight">
                                                    AI Bot is responding
                                                    <span className="flex space-x-0.5 text-indigo-500 dark:text-indigo-400">
                                                        <span className="animate-[bounce_1.4s_infinite_.2s]">.</span>
                                                        <span className="animate-[bounce_1.4s_infinite_.4s]">.</span>
                                                        <span className="animate-[bounce_1.4s_infinite_.6s]">.</span>
                                                    </span>
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Input is disabled while bot is active.</p>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleBotToggle('paused')}
                                            className="z-10 w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 group/btn border border-transparent dark:border-white/10"
                                        >
                                            <Hand className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                                            Takeover Control
                                        </button>
                                    </div>
                                ) : isWindowOpen(selectedChat) ? (
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

                                            <div className="flex-1 relative flex items-center">
                                                <input
                                                    ref={inputRef}
                                                    value={inputText}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="Type a message or / for quick replies"
                                                    className={`w-full rounded-xl px-4 py-2.5 pr-20 text-sm bg-white dark:bg-[#2a3942] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border-none focus:ring-0 outline-none transition-all duration-300 ${isAiDrafting || isAiEnhancing ? 'opacity-70 animate-pulse cursor-wait' : ''}`}
                                                    disabled={uploadingMedia || isAiDrafting || isAiEnhancing}
                                                />
                                                {/* AI Action Buttons */}
                                                <div className="absolute right-2 flex items-center gap-1">
                                                    <div className="group relative">
                                                        <button
                                                            type="button"
                                                            onClick={handleAiEnhanceMsg}
                                                            disabled={!inputText.trim() || isAiEnhancing || isAiDrafting}
                                                            className={`p-1.5 rounded-lg transition-all ${!inputText.trim() || isAiEnhancing || isAiDrafting ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer hover:scale-110 active:scale-95'}`}
                                                        >
                                                            {isAiEnhancing ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                        </button>
                                                        {/* Tooltip */}
                                                        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">Enhance with AI</div>
                                                    </div>

                                                    <div className="group relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAiDraftModal(true)}
                                                            disabled={isAiDrafting || isAiEnhancing}
                                                            className={`p-1.5 rounded-lg transition-all ${isAiDrafting || isAiEnhancing ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer hover:scale-110 active:scale-95'}`}
                                                        >
                                                            {isAiDrafting ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                        </button>
                                                        {/* Tooltip */}
                                                        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">AI Reply Draft</div>
                                                    </div>
                                                </div>
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
                                            onClick={openTemplateModal}
                                            className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm rounded-xl font-semibold shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                                        >
                                            <Layout className="w-4 h-4" />
                                            Send Template
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* â”€â”€â”€ Contact Info Panel â”€â”€â”€ */}
                    {showContactPanel && (
                        <ContactInfoPanel
                            conversation={selectedChat}
                            teamPolicy={teamPolicy}
                            isSubMember={isSubMember}
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
                    <div className="relative z-10 flex flex-col items-center text-center p-4 md:p-8">
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
                                    className="px-4 md:px-6 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
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
                                    <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">
                                            Inbox Overview
                                        </p>
                                        <div className="flex items-center gap-4 bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 md:px-6 py-3 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-sm">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-bold text-slate-900 dark:text-white">{conversations.length}</span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</span>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                                            <div className="flex flex-col items-center">
                                                <span className={`text-lg font-bold ${totalUnread > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                                                    {totalUnread}
                                                </span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unread</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* â”€â”€â”€ Create Quick Reply Modal â”€â”€â”€ */}
            {/* Send Template Modal */}
            {showTemplateModal && (
                <TemplateModal
                    templates={templates}
                    templateLimit={templateLimit}
                    loading={templatesLoading}
                    step={templateStep}
                    selectedTemplate={selectedTemplate}
                    templateVariables={templateVariables}
                    cardParams={cardParams}
                    cardUploading={cardUploading}
                    templateSearch={templateSearch}
                    sendingTemplate={sendingTemplate}
                    onSearchChange={setTemplateSearch}
                    onSelectTemplate={(t) => { setSelectedTemplate(t); setTemplateVariables({}); setCardParams({}); setCardUploading({}); setTemplateStep(2); }}
                    onVariableChange={(key, val) => setTemplateVariables(p => ({ ...p, [key]: val }))}
                    onCardParamChange={(key, val) => setCardParams(p => ({ ...p, [key]: val }))}
                    onCardMediaUpload={handleCardMediaUpload}
                    onBack={() => setTemplateStep(1)}
                    onSend={handleSendTemplate}
                    onClose={() => setShowTemplateModal(false)}
                />
            )}

            {showCreateQuickReply && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateQuickReply(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 dark:text-white">Create Quick Reply</h3>
                            <button onClick={() => setShowCreateQuickReply(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateQuickReply} className="p-4 md:p-6">
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

            {/* ——— AI Reply Drafter Modal ——— */}
            {showAiDraftModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1f2c34] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                        <div className="p-4 md:p-6 flex flex-col items-center text-center">
                            <div className="size-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-5 shadow-inner">
                                <Wand2 className="w-8 h-8 text-indigo-500" />
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                AI Reply Drafter
                            </h3>

                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                                The AI will securely read the last 15 messages of this chat to understand the context and draft a highly professional, concise response inside your text box.
                                <br />

                            </p>

                            <div className="w-full flex gap-3">
                                <button
                                    onClick={() => setShowAiDraftModal(false)}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAiDraftReq}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-[#1f2c34] active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" /> Yes, Draft It
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ——— Access Denied Modal ——— */}
            {showAccessDeniedModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1f2c34] rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                        <div className="p-4 md:p-8 flex flex-col items-center text-center">
                            <div className="size-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <Lock className="w-10 h-10 text-amber-500" />
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Chat Restricted
                            </h3>

                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                                This conversation is not assigned to you. Based on your team's policy, you can only reply to chats that are explicitly assigned to your account.
                            </p>

                            <div className="w-full flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setActiveFilter('mine');
                                        setShowAccessDeniedModal(false);
                                    }}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    View My Assignments
                                </button>
                                <button
                                    onClick={() => setShowAccessDeniedModal(false)}
                                    className="w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-all"
                                >
                                    Got it, thanks
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppInbox;

// ─────────────── TemplateModal Component ───────────────
const CATEGORY_COLORS = {
    MARKETING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    UTILITY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    AUTHENTICATION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

// Extract {{N}} placeholders from a single text string, returns numbers only e.g. ['1','2']
const extractVarsFromText = (text) => {
    if (!text) return [];
    const matches = (text.match(/\{\{(\d+)\}\}/g) || []);
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))].sort();
};

// For standard template: flat sorted array of var numbers
// For carousel: { mainVars, cards: [{cardIndex, label, content, headerType, buttons, vars}] }
const extractVariables = (template) => {
    if (!template) return { isCarousel: false, mainVars: [], cards: [] };
    if (template.archetype === 'carousel' && Array.isArray(template.cards) && template.cards.length > 0) {
        return {
            isCarousel: true,
            mainVars: extractVarsFromText(template.content),
            cards: template.cards.map((card, i) => ({
                cardIndex: i,
                label: `Card ${i + 1}`,
                headerType: card.headerType,
                content: card.content,
                buttons: card.buttons || [],
                vars: extractVarsFromText(card.content)
            }))
        };
    }
    return { isCarousel: false, mainVars: extractVarsFromText(template.content), cards: [] };
};

// Replace {{N}} with filled values for preview
const fillVariables = (content, varMap) => {
    if (!content) return '';
    return content.replace(/\{\{(\d+)\}\}/g, (_, n) => varMap[n] || `{{${n}}}`);
};

const TemplateModal = ({
    templates, templateLimit = -1, loading, step, selectedTemplate, templateVariables, cardParams, cardUploading,
    templateSearch, sendingTemplate, onSearchChange, onSelectTemplate, onVariableChange,
    onCardParamChange, onCardMediaUpload, onBack, onSend, onClose
}) => {
    const navigate = useNavigate();
    // Same lock logic as Templates.jsx: first N (by index in sorted array) are active
    const isLocked = (index) => templateLimit !== -1 && index >= templateLimit;
    const lockedCount = templateLimit !== -1 ? Math.max(0, templates.length - templateLimit) : 0;

    const filtered = templates.filter(t =>
        !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase())
    );

    const { isCarousel, mainVars, cards } = selectedTemplate ? extractVariables(selectedTemplate) : { isCarousel: false, mainVars: [], cards: [] };

    // Flat set of all required keys for canSend
    const allRequiredKeys = isCarousel
        ? [
            ...mainVars.map(n => `body_${n}`),
            ...cards.flatMap(c => c.vars.map(n => `card_${c.cardIndex}_var_${n}`)),
            // Cards with header type IMAGE/VIDEO require a media upload
            ...cards
                .filter(c => c.headerType && c.headerType !== 'NONE')
                .map(c => `card_${c.cardIndex}_headerMediaId`)
        ]
        : mainVars;

    const previewText = !isCarousel && selectedTemplate
        ? fillVariables(selectedTemplate.content, templateVariables)
        : '';

    // For canSend: check required keys in both templateVariables and cardParams
    const getVal = (k) => templateVariables[k]?.trim() || (cardParams || {})[k]?.trim() || '';
    const canSend = !sendingTemplate && selectedTemplate && (
        allRequiredKeys.length === 0 || allRequiredKeys.every(k => getVal(k))
    );

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1a2332] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 md:px-6 py-5 border-b border-slate-100 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button
                                onClick={onBack}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                        )}
                        <div className="size-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                            <Layout className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {step === 1 ? 'Select Template' : selectedTemplate?.name}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {step === 1 ? `${filtered.length} approved template${filtered.length !== 1 ? 's' : ''}` : 'Configure & Preview'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step 1: Select Template */}
                {step === 1 && (
                    <>
                        {/* Search */}
                        <div className="px-4 md:px-6 py-3 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={templateSearch}
                                    onChange={e => onSearchChange(e.target.value)}
                                    placeholder="Search templates..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                                />
                            </div>
                        </div>

                        {/* Template Grid */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
                            {/* Plan limit warning banner */}
                            {lockedCount > 0 && (
                                <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700/40 rounded-xl px-4 py-3 mb-3">
                                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                            Total Template Limit: {templateLimit} of {templates.length} templates active
                                        </p>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                                            {lockedCount} template{lockedCount !== 1 ? 's' : ''} locked. <button onClick={() => navigate('/billing')} className="underline font-semibold hover:text-amber-800">Upgrade your plan</button> to unlock all.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="animate-pulse rounded-2xl border border-slate-100 dark:border-white/5 p-4 space-y-2">
                                            <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-2/3" />
                                            <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                            <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-4/5" />
                                            <div className="h-5 bg-slate-100 dark:bg-white/5 rounded-full w-20 mt-2" />
                                        </div>
                                    ))}
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="size-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                                        <Layout className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        {templateSearch ? 'No templates match your search' : 'No approved templates yet'}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                        {!templateSearch && 'Create and get templates approved in the Templates section.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {filtered.map((t) => {
                                        // Find original index in the full sorted array (before search filter)
                                        const originalIndex = templates.findIndex(tmpl => tmpl.id === t.id);
                                        const locked = isLocked(originalIndex);
                                        return (
                                            <div key={t.id} className="relative">
                                                <button
                                                    onClick={() => !locked && onSelectTemplate(t)}
                                                    disabled={locked}
                                                    className={`w-full text-left p-4 rounded-2xl border bg-white dark:bg-white/5 transition-all group ${locked
                                                        ? 'border-slate-200 dark:border-white/5 opacity-60 cursor-not-allowed'
                                                        : 'border-slate-200 dark:border-white/10 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-900/10 hover:shadow-md cursor-pointer'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <p className={`text-sm font-semibold truncate transition-colors ${locked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400'
                                                            }`}>
                                                            {t.name}
                                                        </p>
                                                        {locked
                                                            ? <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                                                            : <ChevronRight className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-green-500 transition-colors mt-0.5" />
                                                        }
                                                    </div>
                                                    <p className={`text-xs line-clamp-2 leading-relaxed mb-3 ${locked ? 'text-slate-400 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                        {t.content || 'No body text'}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${locked ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600' : CATEGORY_COLORS[t.category] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                                            }`}>
                                                            {t.category}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.language}</span>
                                                    </div>
                                                </button>

                                                {/* Lock overlay — same style as Templates.jsx */}
                                                {locked && (
                                                    <div className="absolute inset-0 z-10 rounded-2xl bg-white/40 dark:bg-[#1a2332]/40 flex flex-col items-center justify-center gap-2">
                                                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 rounded-full px-3 py-1.5 shadow-md">
                                                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Total Template Limit Reached</span>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate('/billing')}
                                                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-indigo-500/30 transition-colors active:scale-95"
                                                        >
                                                            <Zap className="w-3 h-3" /> Upgrade Plan
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Step 2: Configure & Preview */}
                {step === 2 && selectedTemplate && (
                    <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                        {/* Left: Configure */}
                        <div className="sm:w-1/2 flex flex-col border-r border-slate-100 dark:border-white/5">
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">

                                {/* === CAROUSEL configure === */}
                                {isCarousel ? (
                                    <>
                                        {/* Badges */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 uppercase tracking-wide">🎠 Carousel · {cards.length} cards</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${CATEGORY_COLORS[selectedTemplate.category] || 'bg-slate-100 text-slate-600'}`}>{selectedTemplate.category}</span>
                                        </div>

                                        {/* Main body vars */}
                                        {mainVars.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Main Body Variables</p>
                                                {mainVars.map(n => (
                                                    <div key={n} className="flex items-center gap-2">
                                                        <span className="text-xs font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded min-w-[38px] max-w-full text-center">{`{{${n}}}`}</span>
                                                        <input type="text" value={templateVariables[`body_${n}`] || ''} onChange={e => onVariableChange(`body_${n}`, e.target.value)} placeholder={`Value for {{${n}}}`} className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Per-card sections */}
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cards ({cards.length})</p>
                                            {cards.map((card) => {
                                                const isUploading = (cardUploading || {})[card.cardIndex];
                                                const previewUrl = (cardParams || {})[`card_${card.cardIndex}_previewUrl`];
                                                const fileName = (cardParams || {})[`card_${card.cardIndex}_fileName`];
                                                const mediaId = (cardParams || {})[`card_${card.cardIndex}_headerMediaId`];
                                                const hasMedia = card.headerType && card.headerType !== 'NONE';
                                                const accept = card.headerType === 'VIDEO' ? 'video/*' : 'image/*';
                                                return (
                                                    <div key={card.cardIndex} className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                                                        {/* Card header bar */}
                                                        <div className="flex items-center justify-between bg-slate-100 dark:bg-white/5 px-3 py-2">
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{card.label}</span>
                                                            {hasMedia && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-medium">{card.headerType}</span>}
                                                        </div>
                                                        <div className="p-3 space-y-3">

                                                            {/* Card image/video upload */}
                                                            {hasMedia && (
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                                        {card.headerType === 'VIDEO' ? '🎥 Card Video' : '🖼️ Card Image'} <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <label
                                                                        htmlFor={`card-img-${card.cardIndex}`}
                                                                        className="flex items-center gap-2 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg p-2.5 cursor-pointer hover:border-green-400 hover:bg-green-50/20 dark:hover:bg-green-900/10 transition-all group"
                                                                    >
                                                                        <div className="bg-sky-500/10 p-1.5 rounded-lg">
                                                                            <span className="text-sm">{card.headerType === 'VIDEO' ? '🎥' : '🖼️'}</span>
                                                                        </div>
                                                                        {isUploading ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-3.5 h-3.5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                                                                                <span className="text-xs text-slate-500">Uploading to Meta...</span>
                                                                            </div>
                                                                        ) : fileName ? (
                                                                            <span className="text-xs text-green-600 dark:text-green-400 font-medium truncate">
                                                                                {mediaId ? '✓ ' : '⏳ '}{fileName}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400">Click to upload</span>
                                                                        )}
                                                                        <input id={`card-img-${card.cardIndex}`} type="file" accept={accept} className="hidden" onChange={e => onCardMediaUpload(card.cardIndex, e.target.files[0])} />
                                                                    </label>
                                                                    {previewUrl && card.headerType === 'IMAGE' && (
                                                                        <img src={previewUrl} alt={`Card ${card.cardIndex + 1}`} className="w-full h-24 object-cover rounded-lg mt-1.5 border border-slate-200 dark:border-slate-700" />
                                                                    )}
                                                                    {previewUrl && card.headerType === 'VIDEO' && (
                                                                        <video src={previewUrl} className="w-full h-24 object-cover rounded-lg mt-1.5 border border-slate-200 dark:border-slate-700" muted />
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Card body text */}
                                                            {card.content && (
                                                                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap bg-slate-50 dark:bg-white/5 rounded-lg p-2.5">{card.content}</p>
                                                            )}

                                                            {/* Card body variable inputs */}
                                                            {card.vars.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    {card.vars.map(n => {
                                                                        const key = `card_${card.cardIndex}_var_${n}`;
                                                                        return (
                                                                            <div key={key} className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-mono text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20 px-1.5 py-1 rounded min-w-[36px] max-w-full text-center">{`{{${n}}}`}</span>
                                                                                <input type="text" value={templateVariables[key] || ''} onChange={e => onVariableChange(key, e.target.value)} placeholder={`Card ${card.cardIndex + 1} var ${n}`} className="flex-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {/* Card buttons */}
                                                            {card.buttons.length > 0 && (
                                                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Buttons</p>
                                                                    {card.buttons.map((btn, btnIdx) => {
                                                                        const urlKey = `card_${card.cardIndex}_btn_${btnIdx}_url`;
                                                                        return (
                                                                            <div key={btnIdx}>
                                                                                <div className="flex items-center gap-1.5 text-[10px] mb-1">
                                                                                    <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold">{btn.type}</span>
                                                                                    <span className="text-slate-600 dark:text-slate-300 font-medium">{btn.text}</span>
                                                                                </div>
                                                                                {btn.type === 'URL' && (
                                                                                    <input
                                                                                        type="text"
                                                                                        value={(cardParams || {})[urlKey] || btn.url || ''}
                                                                                        onChange={e => onCardParamChange(urlKey, e.target.value)}
                                                                                        placeholder={btn.url || 'https://...'}
                                                                                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {cards.length === 0 && mainVars.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <div className="size-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                                                    <Check className="w-6 h-6 text-green-500" />
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">No variables — ready to send!</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* === STANDARD configure === */
                                    <>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variables</p>
                                        {mainVars.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <div className="size-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                                                    <Check className="w-6 h-6 text-green-500" />
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">No variables — ready to send!</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {mainVars.map(n => (
                                                    <div key={n}>
                                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                                            Variable <span className="font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">{`{{${n}}}`}</span>
                                                        </label>
                                                        <input type="text" value={templateVariables[n] || ''} onChange={e => onVariableChange(n, e.target.value)} placeholder={`Enter value for {{${n}}}`} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right: Live Preview */}
                        <div className="sm:w-1/2 flex flex-col" style={{ background: '#e5ddd5' }}>
                            {/* WhatsApp-style chat header */}
                            <div className="px-4 py-2.5 flex items-center gap-3 shrink-0" style={{ background: '#075e54' }}>
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                    <Eye className="w-4 h-4 text-white/80" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-white leading-none">Live Preview</p>
                                    <p className="text-[10px] text-white/60 mt-0.5">WhatsApp template preview</p>
                                </div>
                            </div>

                            {/* Chat area */}
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end gap-3"
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
                            >
                                {isCarousel ? (
                                    /* Carousel message bubble */
                                    <div className="w-full max-w-[92%] self-end">
                                        {/* Message bubble wrapper */}
                                        <div className="rounded-2xl rounded-br-sm overflow-hidden shadow-md" style={{ background: '#dcf8c6' }}>

                                            {/* Main template body text (shown above cards) */}
                                            {selectedTemplate.content && (
                                                <div className="px-3.5 pt-3 pb-1">
                                                    <p className="text-[12.5px] leading-[1.5] text-slate-800 whitespace-pre-wrap break-words">
                                                        {fillVariables(selectedTemplate.content, (() => {
                                                            const m = {};
                                                            mainVars.forEach(n => { m[n] = templateVariables[`body_${n}`] || ''; });
                                                            return m;
                                                        })())}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Scrollable card strip */}
                                            <div
                                                className="flex gap-2.5 overflow-x-auto pt-2 pb-3 px-2.5"
                                                style={{
                                                    scrollbarWidth: 'thin',
                                                    scrollbarColor: '#25d366 transparent',
                                                    WebkitOverflowScrolling: 'touch',
                                                }}
                                            >
                                                {cards.map((card) => {
                                                    const varMap = {};
                                                    card.vars.forEach(n => { varMap[n] = templateVariables[`card_${card.cardIndex}_var_${n}`] || ''; });
                                                    const imgPreview = (cardParams || {})[`card_${card.cardIndex}_previewUrl`];
                                                    const bodyText = fillVariables(card.content, varMap);
                                                    return (
                                                        <div
                                                            key={card.cardIndex}
                                                            className="flex-none rounded-xl overflow-hidden shadow-sm border border-black/5"
                                                            style={{ width: '180px', background: '#fff' }}
                                                        >
                                                            {/* Card header media */}
                                                            {card.headerType && card.headerType !== 'NONE' && (
                                                                imgPreview ? (
                                                                    card.headerType === 'VIDEO'
                                                                        ? <video src={imgPreview} className="w-full object-cover" style={{ height: '110px' }} muted playsInline />
                                                                        : <img src={imgPreview} alt={`Card ${card.cardIndex + 1}`} className="w-full object-cover" style={{ height: '110px' }} />
                                                                ) : (
                                                                    <div className="w-full flex flex-col items-center justify-center gap-1" style={{ height: '110px', background: '#f0f2f5' }}>
                                                                        <span className="text-3xl">{card.headerType === 'VIDEO' ? '🎥' : '🖼️'}</span>
                                                                        <span className="text-[9px] text-slate-400 font-medium">{card.headerType}</span>
                                                                    </div>
                                                                )
                                                            )}

                                                            {/* Card body text */}
                                                            <div className="px-3 pt-2.5 pb-1.5">
                                                                <p className="text-[12px] leading-[1.45] text-slate-800 whitespace-pre-wrap break-words" style={{ minHeight: '36px' }}>
                                                                    {bodyText || <span className="text-slate-300 italic">Body text...</span>}
                                                                </p>
                                                            </div>

                                                            {/* Card buttons */}
                                                            {card.buttons.length > 0 && (
                                                                <div className="border-t border-slate-100">
                                                                    {card.buttons.map((btn, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="text-center py-2 text-[11px] font-semibold border-b border-slate-100 last:border-0"
                                                                            style={{ color: '#0a85e3' }}
                                                                        >
                                                                            {btn.type === 'URL' ? '🔗 ' : btn.type === 'PHONE_NUMBER' ? '📞 ' : ''}{btn.text}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Card counter */}
                                                            <div className="flex justify-end px-2 py-1">
                                                                <span className="text-[9px] text-slate-300">{card.cardIndex + 1} / {cards.length}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Scroll hint + dots */}
                                            {cards.length > 1 && (
                                                <div className="flex items-center justify-center gap-1 pb-2">
                                                    {cards.map((_, i) => (
                                                        <div key={i} className="rounded-full" style={{ width: i === 0 ? 14 : 6, height: 4, background: i === 0 ? '#25d366' : '#ccc', transition: 'all 0.2s' }} />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Timestamp */}
                                            <div className="flex justify-end items-center gap-1 px-3 pb-2">
                                                <span className="text-[10px]" style={{ color: '#919191' }}>Now</span>
                                                <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M11.071 0L5 6.071l-2.071-2.07L1.5 5.43l3.5 3.5 7.5-7.5-1.429-1.43z" fill="#53bdeb" /><path d="M15.071 0L9 6.071 7.5 4.571 6.071 6l2.929 2.929 7.5-7.5-1.429-1.43z" fill="#53bdeb" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-center text-white/50 mt-2">← Swipe cards →</p>
                                    </div>
                                ) : (
                                    /* Standard preview */
                                    <div className="self-end max-w-[90%]">
                                        <div
                                            className="rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-md"
                                            style={{ background: '#dcf8c6' }}
                                        >
                                            <div className="mb-1.5">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${CATEGORY_COLORS[selectedTemplate.category] || 'bg-slate-100 text-slate-600'}`}>
                                                    {selectedTemplate.category}
                                                </span>
                                            </div>
                                            <p className="text-[13px] leading-[1.45] text-slate-800 whitespace-pre-wrap break-words" style={{ minHeight: '30px' }}>
                                                {previewText || <span className="text-slate-400 italic text-xs">Template body will appear here</span>}
                                            </p>
                                            <div className="flex justify-end items-center gap-1 mt-1.5">
                                                <span className="text-[10px]" style={{ color: '#919191' }}>Now</span>
                                                <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M11.071 0L5 6.071l-2.071-2.07L1.5 5.43l3.5 3.5 7.5-7.5-1.429-1.43z" fill="#53bdeb" /><path d="M15.071 0L9 6.071 7.5 4.571 6.071 6l2.929 2.929 7.5-7.5-1.429-1.43z" fill="#53bdeb" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {step === 2 && (
                    <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0">
                        <button
                            onClick={onBack}
                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={onSend}
                            disabled={!canSend}
                            className="px-4 md:px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            {sendingTemplate ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Template
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
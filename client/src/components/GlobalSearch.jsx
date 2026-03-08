import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, Layout, Users, FileText, Send, Bell, Shield, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Define the searchable index
// We combine global navigation routes and specific setting tabs
const generateSearchIndex = (isAdmin) => {
    const baseItems = [
        { id: 'dashboard', title: 'Dashboard', type: 'page', icon: Layout, path: '/dashboard', keywords: ['home', 'stats', 'overview'] },
        { id: 'contacts', title: 'Contacts', type: 'page', icon: Users, path: '/contacts', keywords: ['people', 'numbers', 'audience', 'list'] },
        { id: 'templates', title: 'Templates', type: 'page', icon: FileText, path: '/templates', keywords: ['messages', 'formats', 'meta'] },
        { id: 'campaigns', title: 'Campaigns', type: 'page', icon: Send, path: '/campaigns', keywords: ['broadcast', 'send', 'blast'] },
        { id: 'reports', title: 'Reports', type: 'page', icon: FileText, path: '/reports', keywords: ['analytics', 'metrics', 'results'] },
        { id: 'whatsapp', title: 'WhatsApp Inbox', type: 'page', icon: Send, path: '/whatsapp', keywords: ['chat', 'messages', 'conversations'] },

        // Settings sub-pages
        { id: 'set_profile', title: 'My Profile', type: 'setting', icon: Users, path: '/settings', tab: 'profile', keywords: ['account', 'name', 'password', 'personal'] },
        { id: 'set_billing', title: 'Subscription & Billing', type: 'setting', icon: CreditCard, path: '/settings', tab: 'billing', keywords: ['plan', 'upgrade', 'payment', 'invoice'] },
        { id: 'set_general', title: 'System Settings', type: 'setting', icon: Settings, path: '/settings', tab: 'general', keywords: ['theme', 'language', 'date format', 'appearance'] },
        { id: 'set_whatsapp', title: 'WhatsApp Gateway', type: 'setting', icon: Send, path: '/settings', tab: 'whatsapp_gateway', keywords: ['api', 'token', 'meta', 'phone number id'] },
    ];

    const adminItems = [
        { id: 'superadmin', title: 'Super Admin Dashboard', type: 'admin', icon: Shield, path: '/superadmin', keywords: ['admin', 'users', 'system'] },
        { id: 'set_branding', title: 'Branding Settings', type: 'setting', icon: Layout, path: '/settings', tab: 'branding', keywords: ['logo', 'colors', 'app name'] },
        { id: 'set_notifications', title: 'Notification Config', type: 'setting', icon: Bell, path: '/settings', tab: 'notifications', keywords: ['email', 'whatsapp templates', 'alerts'] },
        { id: 'set_payments', title: 'Payment Gateway', type: 'setting', icon: CreditCard, path: '/settings', tab: 'payment_gateway', keywords: ['stripe', 'razorpay', 'keys'] },
        { id: 'set_smtp', title: 'Email SMTP', type: 'setting', icon: Bell, path: '/settings', tab: 'smtp', keywords: ['email server', 'smtp', 'mail'] },
        { id: 'set_security', title: 'Security', type: 'setting', icon: Shield, path: '/settings', tab: 'security', keywords: ['2fa', 'passwords', 'registration'] },
    ];

    return isAdmin ? [...baseItems, ...adminItems] : baseItems;
};

// Custom hook for debouncing
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [activeIndex, setActiveIndex] = useState(-1);

    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    const debouncedQuery = useDebounce(query, 300);
    const searchIndex = useMemo(() => generateSearchIndex(user?.isAdmin), [user]);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Perform local search logic when debounced query changes
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            return;
        }

        const normalizedQuery = debouncedQuery.toLowerCase();

        // Filter the index
        const filtered = searchIndex.filter(item => {
            const matchTitle = item.title.toLowerCase().includes(normalizedQuery);
            const matchKeywords = item.keywords.some(kw => kw.toLowerCase().includes(normalizedQuery));
            return matchTitle || matchKeywords;
        });

        // Optional: Sort so exact title matches are first
        filtered.sort((a, b) => {
            const aTitle = a.title.toLowerCase().indexOf(normalizedQuery);
            const bTitle = b.title.toLowerCase().indexOf(normalizedQuery);

            // Both have it in title
            if (aTitle > -1 && bTitle > -1) return aTitle - bTitle;
            // A has it in title, B doesn't
            if (aTitle > -1) return -1;
            // B has it in title, A doesn't
            if (bTitle > -1) return 1;
            return 0;
        });

        setResults(filtered.slice(0, 8)); // limit results
        setActiveIndex(-1); // Reset keyboard navigation
    }, [debouncedQuery, searchIndex]);

    const handleSelect = (item) => {
        setIsOpen(false);
        setQuery('');

        if (item.tab) {
            navigate(item.path, { state: { initialTab: item.tab } });
        } else {
            navigate(item.path);
        }
    };

    const handleKeyDown = (e) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < results.length) {
                handleSelect(results[activeIndex]);
            } else if (results.length > 0) {
                // If they hit enter with no item selected but there are results, select the first one
                handleSelect(results[0]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-md">
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-surface-dark h-10 w-full px-3 border border-transparent focus-within:border-primary transition-colors">
                <Search className="w-5 h-5 text-slate-400 dark:text-text-secondary" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (query.trim()) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-secondary text-sm focus:outline-none ml-2"
                    placeholder="Search settings, pages, campaigns..."
                />

                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setIsOpen(false);
                            inputRef.current?.focus();
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && query.trim() !== '' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    {debouncedQuery !== query ? (
                        <div className="p-4 text-center text-sm text-slate-500 dark:text-text-secondary flex justify-center items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            Searching...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500 dark:text-text-secondary">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>No results found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto w-full">
                            <div className="p-2">
                                <h4 className="text-xs font-semibold text-slate-400 dark:text-text-secondary uppercase tracking-wider mb-2 px-3 mt-1">
                                    Results
                                </h4>
                                <ul className="space-y-1">
                                    {results.map((item, index) => {
                                        const Icon = item.icon;
                                        const isSelected = index === activeIndex;
                                        return (
                                            <li key={`${item.id}-${index}`}>
                                                <button
                                                    onClick={() => handleSelect(item)}
                                                    onMouseMove={() => setActiveIndex(index)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${isSelected
                                                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-white'
                                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-md ${item.type === 'setting' ? 'bg-slate-100 dark:bg-white/10' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium">{item.title}</div>
                                                            <div className="text-[10px] text-slate-400 dark:text-text-secondary capitalize">
                                                                {item.type === 'setting' ? 'Settings' : item.type === 'page' ? 'Navigation' : 'Admin'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={`w-4 h-4 opacity-0 transition-opacity ${isSelected ? 'opacity-100' : ''}`} />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

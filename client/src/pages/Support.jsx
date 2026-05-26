import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Ticket, Book, Map, Plus, Send, Search, ChevronRight, ThumbsUp, Paperclip, X, CreditCard, Laptop, HelpCircle, User, Menu, Coffee, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';

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

const Support = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read from URL e.g. ?tab=tickets&action=create-ticket
    const initialTab = searchParams.get('tab') || 'home';
    const action = searchParams.get('action');

    const [activeTab, setActiveTabState] = useState(['home', 'tickets', 'roadmap'].includes(initialTab) ? initialTab : 'home');

    // Keep URL in sync with tabs to allow copy-pasting the link
    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams(prev => { prev.set('tab', tab); return prev; }, { replace: true });
    };

    // Sync tab state if URL changes externally
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['home', 'tickets', 'roadmap'].includes(tab) && tab !== activeTab) {
            setActiveTabState(tab);
        }
    }, [searchParams]);
    const [kbArticles, setKbArticles] = useState([]);
    const [roadmap, setRoadmap] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [activeConfettiId, setActiveConfettiId] = useState(null);

    const fetchKB = async () => { try { const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/kb`); setKbArticles(res.data); } catch (e) { console.error(e); } };
    const fetchCategories = async () => { try { const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/kb/categories`); setCategories(res.data); } catch (e) { console.error(e); } };
    const fetchRoadmap = async () => { try { const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/roadmap`); setRoadmap(res.data); } catch (e) { console.error(e); } };
    const fetchTickets = async () => { try { const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/tickets`); setTickets(res.data); } catch (e) { console.error(e); } };

    const [visibleRoadmapCount, setVisibleRoadmapCount] = useState(8);

    useEffect(() => {
        fetchKB();
        fetchCategories();
        fetchRoadmap();
        fetchTickets();
    }, []);

    const filteredArticles = kbArticles.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark overflow-hidden fade-in transition-colors duration-300">
            {/* Standard Header */}
            <header className="hidden md:flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-6 w-full">
                    {/* Search Bar */}
                    <div className="flex items-center rounded-lg bg-slate-100 dark:bg-surface-dark h-10 w-full max-w-md px-3 border border-transparent focus-within:border-primary transition-colors">
                        <Search className="w-5 h-5 text-slate-400 dark:text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search support..."
                            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-secondary text-sm focus:outline-none ml-2"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scroll-smooth">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Hello, {user?.name} 👋</h1>
                    <p className="text-slate-500 dark:text-text-secondary mb-8">How can we help you today?</p>

                    {/* Navigation Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <button onClick={() => setActiveTab('home')} className={`p-6 rounded-2xl border transition-all text-left group ${activeTab === 'home' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-500/30' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/5 hover:border-indigo-500/50'}`}>
                            <div className={`p-3 rounded-xl w-fit mb-4 ${activeTab === 'home' ? 'bg-white/20' : 'bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400'}`}>
                                <Book className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-1 ${activeTab === 'home' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>Knowledge Base</h3>
                            <p className={`text-sm ${activeTab === 'home' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>Browse guides & tutorials</p>
                        </button>

                        <button onClick={() => setActiveTab('tickets')} className={`p-6 rounded-2xl border transition-all text-left group ${activeTab === 'tickets' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-500/30' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/5 hover:border-indigo-500/50'}`}>
                            <div className={`p-3 rounded-xl w-fit mb-4 ${activeTab === 'tickets' ? 'bg-white/20' : 'bg-emerald-50 dark:bg-white/5 text-emerald-600 dark:text-emerald-400'}`}>
                                <Ticket className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-1 ${activeTab === 'tickets' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>My Tickets</h3>
                            <p className={`text-sm ${activeTab === 'tickets' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>Track your support requests</p>
                        </button>

                        <button onClick={() => setActiveTab('roadmap')} className={`p-6 rounded-2xl border transition-all text-left group ${activeTab === 'roadmap' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-500/30' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/5 hover:border-indigo-500/50'}`}>
                            <div className={`p-3 rounded-xl w-fit mb-4 ${activeTab === 'roadmap' ? 'bg-white/20' : 'bg-amber-50 dark:bg-white/5 text-amber-600 dark:text-amber-400'}`}>
                                <Map className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-1 ${activeTab === 'roadmap' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>Product Roadmap</h3>
                            <p className={`text-sm ${activeTab === 'roadmap' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>Vote on new features</p>
                        </button>
                    </div>

                    {/* Content Area */}
                    {activeTab === 'home' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative max-w-2xl mx-auto mb-10">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark shadow-sm text-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                                    placeholder="Search for answers..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${searchTerm === ''
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                                        : 'bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-indigo-500/50'
                                        }`}
                                >
                                    All
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSearchTerm(cat.name)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${searchTerm === cat.name
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                                            : 'bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-indigo-500/50'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-12 mb-12">
                                {categories
                                    .filter(cat => searchTerm === '' || cat.name === searchTerm || kbArticles.some(a => a.category === cat.name && a.title.toLowerCase().includes(searchTerm.toLowerCase())))
                                    .map(cat => {
                                        const articlesInCat = filteredArticles.filter(a => a.category === cat.name);
                                        if (articlesInCat.length === 0) return null;

                                        return (
                                            <div key={cat.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                        <Book className="w-5 h-5" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{cat.name}</h3>
                                                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/5 ml-2"></div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {articlesInCat.map(article => (
                                                        <div
                                                            key={article.id}
                                                            onClick={() => setSelectedArticle(article)}
                                                            className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-xl border border-slate-200 dark:border-white/5 hover:border-indigo-500 transition-all cursor-pointer group hover:shadow-md active:scale-[0.98]"
                                                        >
                                                            <h4 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-500 transition-colors">{article.title}</h4>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 dark:bg-white/5 rounded text-indigo-500 border border-indigo-100 dark:border-indigo-500/20">{article.category}</span>
                                                            </div>
                                                            <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{article.content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                {filteredArticles.length === 0 && (
                                    <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
                                        <div className="bg-slate-100 dark:bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No articles found</h3>
                                        <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or category filter.</p>
                                    </div>
                                )}
                            </div>

                            {/* CTA for Tickets */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-4 md:p-8 text-center border border-indigo-100 dark:border-indigo-500/20">
                                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mb-2">Can't find what you're looking for?</h3>
                                <p className="text-indigo-700 dark:text-indigo-400 mb-6">Our support team is here to help you get back on track.</p>
                                <button
                                    onClick={() => setActiveTab('tickets')}
                                    className="px-4 md:px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 mx-auto"
                                >
                                    <Ticket className="w-5 h-5" /> Create Support Ticket
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tickets' && <UserTicketManager tickets={tickets} refresh={fetchTickets} initialView={action === 'create-ticket' ? 'create' : 'list'} />}

                    {activeTab === 'roadmap' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Suggest Feature Section */}
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white/10 dark:to-white/5 p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 text-white shadow-lg">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold mb-1">Have an idea?</h3>
                                    <p className="text-slate-300 text-sm">Suggest a new feature and help us improve the product.</p>
                                </div>
                                <RoadmapSuggestionForm refresh={fetchRoadmap} initiallyOpen={action === 'suggest'} />
                            </div>

                            <div className="space-y-6">
                                <div className="text-center max-w-2xl mx-auto mb-10">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center justify-center gap-2">
                                        <Map className="w-4 h-4" /> Coming Soon
                                    </h4>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                                        Exciting New Features on the Horizon
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        Here's a sneak peek at what our engineering team is actively building right now. These features will automatically be added to your workspace once completed.
                                    </p>
                                </div>

                                {roadmap.filter(i => i.status === 'In Progress').length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 dark:bg-white/[0.02] rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                                        <div className="w-20 h-20 bg-white dark:bg-surface-dark rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-white/5">
                                            <Coffee className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Our engineers are brewing up the next big thing!</h3>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">There's nothing public in the pipeline right now. Check back soon or suggest a feature above.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 relative">
                                            {/* Decorative background glow */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
                                            
                                            <AnimatePresence>
                                                {roadmap
                                                    .filter(i => i.status === 'In Progress')
                                                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                                                    .slice(0, visibleRoadmapCount)
                                                    .map((item, index) => (
                                                        <motion.div
                                                            layout
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            transition={{ duration: 0.4, delay: index * 0.05 }}
                                                            key={item.id}
                                                            className="group bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1 relative"
                                                        >
                                                            {/* Top decorative bar */}
                                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                                            <div className="p-5 h-full flex flex-col relative z-10">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                                                        <Sparkles className="w-5 h-5" />
                                                                    </div>
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                                                        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                                                        In Development
                                                                    </span>
                                                                </div>

                                                                <h5 className="font-bold text-slate-900 dark:text-white text-base leading-snug mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                    {item.title}
                                                                </h5>

                                                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                                    {item.suggesterName ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                                                                <User className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                                                            </div>
                                                                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                                                Idea by <strong className="text-slate-700 dark:text-slate-300">{item.suggesterId === user?.id ? 'You' : item.suggesterName.split(' ')[0]}</strong>
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600">
                                                                                <Laptop className="w-3 h-3" />
                                                                            </div>
                                                                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Our Team</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                            </AnimatePresence>
                                        </div>

                                        {/* Load More Button */}
                                        {roadmap.filter(i => i.status === 'In Progress').length > visibleRoadmapCount && (
                                            <div className="flex justify-center mt-8">
                                                <button
                                                    onClick={() => setVisibleRoadmapCount(prev => prev + 8)}
                                                    className="px-4 md:px-6 py-2.5 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm"
                                                >
                                                    Load More Features
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Article Modal */}
            <AnimatePresence>
                {selectedArticle && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-4 md:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedArticle(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-surface-dark w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10 border border-slate-200 dark:border-white/10"
                        >
                            {/* Modal Header */}
                            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                        <Book className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{selectedArticle.category}</span>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg line-clamp-1">{selectedArticle.title}</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 md:p-4 md:p-12">
                                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                                    {selectedArticle.content.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">{line.replace('# ', '')}</h1>;
                                        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-slate-900 dark:text-white">{line.replace('## ', '')}</h2>;
                                        if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-900 dark:text-white">{line.replace('### ', '')}</h3>;
                                        if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-2">{line.replace('- ', '')}</li>;
                                        if (line.startsWith('![')) {
                                            const match = line.match(/!\[(.*?)\]\((.*?)\)/);
                                            if (match) return <img key={i} src={match[2]} alt={match[1]} className="rounded-2xl my-8 border border-slate-100 dark:border-white/10 shadow-lg" />;
                                        }
                                        if (line.trim() === '') return <div key={i} className="h-4" />;
                                        return <p key={i} className="leading-relaxed mb-4">{line}</p>;
                                    })}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <ThumbsUp className="w-4 h-4" /> Was this helpful?
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="px-4 md:px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Subcomponents
const RoadmapStats = ({ roadmap, userId }) => {
    const myItems = roadmap.filter(i => i.suggesterId === userId);
    if (myItems.length === 0) return null;

    const counts = {
        Requested: myItems.filter(i => i.status === 'Requested').length,
        Approved: myItems.filter(i => i.status === 'Approved').length,
        InProgress: myItems.filter(i => i.status === 'In Progress').length,
        Live: myItems.filter(i => i.status === 'Live').length,
    };

    return (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none">
                <Map className="w-32 h-32" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">My Feature Impact</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Track the progress of your suggestions and compete with others.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="text-2xl font-black text-slate-700 dark:text-white mb-1">{counts.Requested}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requested</div>
                    <div className="absolute bottom-0 right-2 opacity-10 group-hover:scale-110 transition-transform">💡</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-500/20 relative overflow-hidden group">
                    <div className="text-2xl font-black text-green-700 dark:text-green-400 mb-1">{counts.Approved}</div>
                    <div className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">Approved</div>
                    <div className="absolute bottom-0 right-2 opacity-10 group-hover:scale-110 transition-transform">✅</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 relative overflow-hidden group">
                    <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mb-1">{counts.InProgress}</div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider">In Progress</div>
                    <div className="absolute bottom-0 right-2 opacity-10 group-hover:scale-110 transition-transform">🔨</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 relative overflow-hidden group">
                    <div className="text-2xl font-black text-purple-700 dark:text-purple-400 mb-1">{counts.Live}</div>
                    <div className="text-xs font-bold text-purple-600 dark:text-purple-500 uppercase tracking-wider">Live</div>
                    <div className="absolute bottom-0 right-2 opacity-10 group-hover:scale-110 transition-transform">🚀</div>
                </div>
            </div>
        </div>
    );
};

const RoadmapSuggestionForm = ({ refresh, initiallyOpen }) => {
    const [title, setTitle] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(initiallyOpen || false);

    const handleSubmit = async () => {
        if (!title.trim()) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/support/roadmap`, { title, status: 'Requested' });
            setTitle('');
            setIsModalOpen(false);
            refresh();
        } catch {
            alert('Failed to submit suggestion');
        }
    };

    return (
        <>
            <button onClick={() => setIsModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-4 md:px-6 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 whitespace-nowrap flex items-center gap-2">
                <Plus className="w-5 h-5" /> Suggest a Feature
            </button>
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                        <Map className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Suggest Feature</h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Feature Name</label>
                                <input autoFocus className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white" placeholder="e.g. Native iOS Mobile App" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Your suggestion will be added to the roadmap as "Requested".</p>
                            </div>
                            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex justify-end gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
                                <button onClick={handleSubmit} disabled={!title.trim()} className="px-4 md:px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 shadow-none min-w-[120px] max-w-full">Submit</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const UserTicketManager = ({ tickets, refresh, initialView }) => {
    const [view, setView] = useState(initialView || 'list'); // list | create
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('General');
    const [priority, setPriority] = useState('Medium');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');

    const handleCreate = async () => {
        if (!subject.trim() || !message.trim()) return alert("Please fill in all details");
        setIsSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets`, { subject, category, priority, message });
            setSubject(''); setMessage(''); setCategory('General'); setPriority('Medium');
            refresh(); setView('list');
        } catch (e) { alert("Failed to create ticket"); } finally { setIsSubmitting(false); }
    };

    const handleReply = async () => {
        if (!replyMessage.trim()) return;
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets/${selectedTicket.id}/reply`, { text: replyMessage });
            setSelectedTicket(res.data); setReplyMessage(''); refresh();
        } catch (e) { alert("Failed to send reply"); }
    };

    const handleResolve = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets/${selectedTicket.id}/reply`, { text: "Ticket marked as resolved.", status: 'Resolved' });
            setSelectedTicket(res.data); refresh();
        } catch (e) { alert("Failed to resolve ticket"); }
    };

    const handleReopen = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets/${selectedTicket.id}/reply`, { text: "Ticket reopened by user.", status: 'Open' });
            setSelectedTicket(res.data); refresh();
        } catch (e) { alert("Failed to reopen ticket"); }
    };

    const ticketCategories = [
        { id: 'Technical', icon: Laptop, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { id: 'Billing', icon: CreditCard, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
        { id: 'Account', icon: User, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { id: 'General', icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800' },
    ];

    const ticketPriorities = [
        { id: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400' },
        { id: 'Medium', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
        { id: 'High', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
        { id: 'Critical', color: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' }
    ];

    return (
        <div className="space-y-6 relative">
            {view === 'create' ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => setView('list')} className="p-2 rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">New Support Ticket</h2><p className="text-slate-500 dark:text-slate-400">Describe your issue and we'll help you ASAP.</p></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subject</label><input className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium" placeholder="e.g. API Integration Issue" value={subject} onChange={e => setSubject(e.target.value)} /></div>
                            <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Detailed Description</label><textarea className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white h-48 resize-none text-sm leading-relaxed" placeholder="Please provide as much detail as possible..." value={message} onChange={e => setMessage(e.target.value)} /><div className="mt-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 md:p-8 text-center hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group"><div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Paperclip className="w-6 h-6 text-indigo-500" /></div><p className="text-sm font-bold text-slate-700 dark:text-slate-300">Click to upload or drag and drop</p></div></div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Category</label><div className="space-y-2">{ticketCategories.map(c => (<button key={c.id} onClick={() => setCategory(c.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${category === c.id ? `border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500` : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}><div className={`p-2 rounded-lg ${c.bg} ${c.color}`}><c.icon className="w-5 h-5" /></div><span className={`font-semibold text-sm ${category === c.id ? 'text-indigo-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{c.id}</span></button>))}</div></div>
                            <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Priority</label><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{ticketPriorities.map(p => (<button key={p.id} onClick={() => setPriority(p.id)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${priority === p.id ? 'border-indigo-500 ring-1 ring-indigo-500 opacity-100' : 'border-transparent opacity-50 grayscale hover:grayscale-0 hover:opacity-100'} ${p.color}`}>{p.id}</button>))}</div></div>
                            <button onClick={handleCreate} disabled={isSubmitting} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2">{isSubmitting ? 'Creating...' : <><Send className="w-5 h-5" /> Submit Ticket</>}</button>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Tickets</h2><p className="text-slate-500 dark:text-slate-400 text-sm">Manage and track your active support requests.</p></div>
                        <button onClick={() => setView('create')} className="px-4 md:px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-transform active:scale-95">
                            <Plus className="w-5 h-5" /> New Ticket
                        </button>
                    </div>

                    {tickets.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-white dark:bg-surface-dark rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6"><Ticket className="w-10 h-10 text-slate-300" /></div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No tickets found</h3>
                            <button onClick={() => setView('create')} className="text-indigo-600 font-bold hover:underline">Create your first ticket</button>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4">
                            {tickets.map(t => (
                                <div key={t.id} onClick={() => setSelectedTicket(t)} className="group bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-indigo-600 transition-colors">{t.subject}</h3>
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/5">{t.category}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${t.priority === 'High' || t.priority === 'Critical' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'}`}>{t.priority} Priority</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${t.status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{t.status}</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 line-clamp-2 leading-relaxed">{t.messages[0]?.text}</p>
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-4">
                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400"><span>#{t.id.split('-')[0]}</span><span>Updated {formatDistanceToNow(new Date(t.lastReplyAt), { addSuffix: true })}</span></div>
                                        <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors">View Ticket</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <AnimatePresence>
                {selectedTicket && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-surface-dark w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-white/10">
                            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
                                <div>
                                    <div className="flex items-center gap-3 mb-1"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h2><span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedTicket.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{selectedTicket.status}</span></div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500"><span>#{selectedTicket.id}</span><span>{selectedTicket.category}</span><span>{selectedTicket.priority} Priority</span></div>
                                </div>
                                <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="flex-1 flex overflow-hidden">
                                <div className="flex-1 flex flex-col border-r border-slate-100 dark:border-white/5">
                                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/30 dark:bg-black/20">
                                        {selectedTicket.messages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.sender === 'User' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.sender === 'User' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 text-slate-900 dark:text-white rounded-tl-none'}`}>
                                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                                    <p className={`text-[10px] mt-2 opacity-70 ${msg.sender === 'User' ? 'text-indigo-100' : 'text-slate-400'}`}>{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-surface-dark flex gap-4">
                                        <input className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 rounded-xl px-4 py-3 outline-none" placeholder="Type your reply..." value={replyMessage} onChange={e => setReplyMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()} />
                                        <button onClick={handleReply} className="p-3 bg-indigo-600 text-white rounded-xl"><Send className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <div className="w-80 max-w-full bg-slate-50 dark:bg-black/20 p-4 md:p-6 overflow-y-auto space-y-6">
                                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Actions</h4>
                                        {selectedTicket.status !== 'Resolved' ? (
                                            <button onClick={handleResolve} className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Mark Resolved</button>
                                        ) : (
                                            <button onClick={handleReopen} className="w-full py-2 border border-indigo-600 text-indigo-600 rounded-lg text-xs font-bold">Reopen</button>
                                        )}
                                    </div>
                                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 shadow-sm text-sm">
                                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Details</h4>
                                        <div className="flex justify-between mb-2"><span className="text-slate-500">Created</span><span className="text-slate-900 dark:text-white">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Priority</span><span className="font-bold text-blue-500">{selectedTicket.priority}</span></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Support;

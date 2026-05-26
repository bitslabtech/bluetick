import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Sparkles, User, Bot } from 'lucide-react';

const FloatingChatbot = ({ config }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const aiConfig = config?.aiChatbot;

    // Initialize welcome message when opened for the first time
    useEffect(() => {
        if (isOpen && messages.length === 0 && aiConfig?.welcomeMessage) {
            setMessages([
                { role: 'model', content: aiConfig.welcomeMessage }
            ]);
        }
    }, [isOpen, messages.length, aiConfig]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Don't render anything if the bot is disabled in config
    if (!aiConfig?.enabled) return null;

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/landing/chat`, {
                message: userMsg,
                history: messages // pass history for context
            });

            setMessages([...newMessages, { role: 'model', content: res.data.reply }]);
        } catch (error) {
            console.error('Chat Error:', error);
            const backendError = error.response?.data?.error;
            setMessages([...newMessages, { role: 'model', content: backendError || 'Oops! I am having trouble connecting to the server right now. Please try again later.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[999]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] max-w-[calc(100vw-48px)] h-[550px] max-h-[80vh] bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl shadow-indigo-500/20 border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-500 flex items-center justify-between shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white leading-tight">AI Assistant</h3>
                                    <p className="text-indigo-100 text-xs">Usually replies instantly</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-indigo-100 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black/20">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
                                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-white/5 rounded-tl-sm shadow-sm'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl rounded-tl-sm flex gap-1 items-center shadow-sm">
                                        <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Footer */}
                        <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-white/5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-full outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-1.5 top-1.5 bottom-1.5 w-10 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5 mt-0.5" />}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-700 transition-colors border-[3px] border-white dark:border-zinc-950 relative"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-zinc-950 rounded-full"></span>
                )}
            </motion.button>
        </div>
    );
};

export default FloatingChatbot;

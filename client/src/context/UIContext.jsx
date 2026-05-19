
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from './AuthContext'; // Import useAuth to get user status

const UIContext = createContext();

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};

export const UIProvider = ({ children }) => {
    const { user } = useAuth(); // Get user from AuthContext
    const [settings, setSettings] = useState(null);
    const [publicSettings, setPublicSettings] = useState(null);
    const [publicSettingsLoading, setPublicSettingsLoading] = useState(true);

    // Fetch Public Settings on initial load (for branding before login)
    useEffect(() => {
        fetchPublicSettings();
    }, []);

    const fetchPublicSettings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings/public`);
            const data = res.data;
            if (data?.logoUrl?.startsWith('/uploads')) {
                data.logoUrl = `${import.meta.env.VITE_API_URL}${data.logoUrl}`;
            }
            setPublicSettings(data);
            applyBranding(data);
        } catch (err) {
            console.error("Failed to fetch public settings:", err);
        } finally {
            setPublicSettingsLoading(false);
        }
    };

    const applyBranding = (data) => {
        if (!data) return;
        const root = document.documentElement;
        if (data.primaryColor) {
            root.style.setProperty('--color-primary', data.primaryColor);
        }
    };

    // Fetch Private Settings when user logs in
    useEffect(() => {
        if (user) {
            fetchSettings();
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            const data = res.data;
            if (data?.logoUrl?.startsWith('/uploads')) {
                data.logoUrl = `${import.meta.env.VITE_API_URL}${data.logoUrl}`;
            }
            setSettings(data);

            // Re-apply if user has personal overrides, otherwise public stays
            applyBranding(res.data);
        } catch (err) {
            console.error("Failed to fetch settings for UI Context:", err);
        }
    };

    // Global Date Formatter
    const formatDate = useCallback((dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

        const format = settings?.dateFormat || 'MM/DD/YYYY';

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        // Simple format mapping
        if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
        if (format === 'YYYY/MM/DD') return `${year}/${month}/${day}`;
        // Default MM/DD/YYYY
        return `${month}/${day}/${year}`;

    }, [settings]);


    const [modal, setModal] = useState({
        isOpen: false,
        type: 'info', // success, error, warning, info
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'OK',
        cancelText: null
    });

    const showModal = useCallback(({ type = 'info', title, message, onConfirm, confirmText = 'OK', cancelText = null }) => {
        setModal({
            isOpen: true,
            type,
            title,
            message,
            onConfirm,
            confirmText,
            cancelText
        });
    }, []);

    const closeModal = useCallback(() => {
        setModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = useCallback(() => {
        if (modal.onConfirm) modal.onConfirm();
        closeModal();
    }, [modal, closeModal]);

    // Toast State
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((args, forcedType = 'info') => {
        const id = Date.now().toString();
        let config = { type: 'info', title: '', message: '', duration: 4000 };

        if (typeof args === 'string') {
            // Support old positional format: showToast("message", "type")
            config.message = args;
            config.type = forcedType;
            config.title = forcedType.charAt(0).toUpperCase() + forcedType.slice(1);
        } else {
            // Support new object format: showToast({ message, type, title, duration })
            config = { ...config, ...args };
        }

        setToasts(prev => [...prev, { id, ...config }]);

        if (config.duration) {
            setTimeout(() => {
                removeToast(id);
            }, config.duration);
        }
    }, [removeToast]);

    return (
        <UIContext.Provider value={{ showModal, closeModal, showToast, formatDate, settings, publicSettings, publicSettingsLoading }}>
            {children}

            {/* Modal Layer */}
            <AnimatePresence>
                {modal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
                        >
                            <div className="p-6 flex flex-col items-center text-center">
                                {/* Icon */}
                                <div className={`mb-4 p-3 rounded-full ${modal.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                    modal.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                        modal.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                    {modal.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
                                    {modal.type === 'error' && <AlertCircle className="w-8 h-8" />}
                                    {modal.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
                                    {modal.type === 'info' && <Info className="w-8 h-8" />}
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                    {modal.title}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                                    {modal.message}
                                </p>

                                <div className="flex gap-3 w-full">
                                    {modal.cancelText && (
                                        <button
                                            onClick={closeModal}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            {modal.cancelText}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleConfirm}
                                        className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] ${modal.type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                                            modal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                                                'bg-indigo-600 hover:bg-indigo-700'
                                            }`}
                                    >
                                        {modal.confirmText}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Layer - Fixed Top Right */}
            <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none p-4">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            layout
                            className="pointer-events-auto w-full max-w-sm bg-white dark:bg-background-dark/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-4 flex items-start gap-4 ring-1 ring-black/5"
                        >
                            <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${toast.type === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' :
                                toast.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                                    toast.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                                        'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                }`}>
                                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                                {toast.type === 'info' && <Info className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                {toast.title && <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">{toast.title}</h4>}
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{toast.message}</p>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </UIContext.Provider>
    );
};

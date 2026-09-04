import { useState, useEffect, useRef } from "react";
import { Bug, AlertTriangle, ChevronDown, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useNotifications } from "../context/NotificationContext";
import { formatDistanceToNow } from "date-fns";

const ErrorBell = () => {
    const navigate = useNavigate();
    const { errorNotifs, unreadErrorCount, resolveError, fetchNotifications, isAdmin } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    if (!isAdmin) return null;

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Refresh when opened
    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleResolve = async (e, id) => {
        e.stopPropagation();
        await resolveError(id);
    };

    const handleDeleteError = async (e, id) => {
        e.stopPropagation();
        try {
            await axios.delete(import.meta.env.VITE_API_URL + "/api/admin-notifications/" + id);
            await fetchNotifications();
        } catch (err) { console.error(err); }
    };

    // Show only top 5 unresolved first, then resolved
    const sorted = [...errorNotifs].sort((a, b) => {
        if (!a.isRead && b.isRead) return -1;
        if (a.isRead && !b.isRead) return 1;
        return new Date(b.lastOccurredAt || b.createdAt) - new Date(a.lastOccurredAt || a.createdAt);
    });
    const preview = sorted.slice(0, 5);

    return (
        <div className="relative" ref={containerRef}>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center justify-center size-10 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors focus:outline-none"
                title="System Errors"
            >
                <Bug className="w-5 h-5" />
                {unreadErrorCount > 0 && (
                    <motion.span
                        key={unreadErrorCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-background-dark"
                    >
                        {unreadErrorCount > 9 ? "9+" : unreadErrorCount}
                    </motion.span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30 z-50 overflow-hidden"
                        style={{ top: "100%" }}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-red-100 dark:border-red-900/20 flex justify-between items-center bg-red-50/80 dark:bg-red-900/10">
                            <div className="flex items-center gap-2">
                                <Bug className="w-4 h-4 text-red-500" />
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">System Errors</h3>
                                {unreadErrorCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {unreadErrorCount} unresolved
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {errorNotifs.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 dark:text-text-secondary">
                                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                                    <p className="text-sm font-medium">All clear! No errors.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {preview.map((err) => (
                                        <div
                                            key={err.id}
                                            onClick={() => { setIsOpen(false); navigate("/superadmin/alerts"); }}
                                            className={`p-4 cursor-pointer transition-colors border-l-4 ${!err.isRead
                                                ? "bg-red-50 dark:bg-red-900/20 border-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                : "border-transparent hover:bg-slate-50 dark:hover:bg-white/5"
                                            }`}
                                        >
                                            <div className="flex gap-3 items-start">
                                                <div className="mt-0.5 size-8 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 dark:bg-red-900/30">
                                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold truncate pr-4 ${!err.isRead ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                                        {err.message}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {err.data?.occurrences > 1 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                                {err.data.occurrences}x
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-slate-400">
                                                            {formatDistanceToNow(new Date(err.lastOccurredAt || err.createdAt), { addSuffix: true })}
                                                        </span>
                                                        {!err.isRead && (
                                                            <button
                                                                onClick={(e) => handleResolve(e, err.id)}
                                                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                                                            >
                                                                Resolve
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteError(e, err.id)}
                                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                                                    title="Delete"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-900/5 text-center">
                            <button
                                onClick={() => { setIsOpen(false); navigate("/superadmin/alerts"); }}
                                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                            >
                                View all errors
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ErrorBell;

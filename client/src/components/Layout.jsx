import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { LogOut, Info, AlertTriangle, Menu, X } from 'lucide-react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';

export default function Layout() {
    const { isImpersonating, exitImpersonation, user } = useAuth();
    const { publicSettings, publicSettingsLoading } = useUI();
    const [systemStatus, setSystemStatus] = useState(null);
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchSystemConfig = async () => {
            try {
                // Use the new public status endpoint
                const res = await axios.get('http://127.0.0.1:5000/api/system/status');

                setSystemStatus(res.data);

                // Set Maintenance (if needed locally, though middleware handles it mostly)
                if (res.data.maintenanceMode) {
                    setIsMaintenance(true);
                }
            } catch (err) { console.error(err); }
        };
        fetchSystemConfig();
    }, []);



    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark transition-colors duration-300 relative">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-surface-dark shrink-0 z-30 shadow-sm relative">
                    <div className="flex items-center gap-3">
                        {publicSettings?.logoUrl ? (
                            <img src={publicSettings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                        ) : (
                            <div className="flex items-center justify-center rounded-lg bg-indigo-600 size-8 text-white shadow-sm">
                                <span className="font-bold text-sm">Wa</span>
                            </div>
                        )}
                        <h1 className="text-slate-900 dark:text-white text-base font-bold leading-normal truncate max-w-[140px] min-h-[1.5rem]">
                            {!publicSettingsLoading && (publicSettings?.appName || 'WhatsApp Cloud')}
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Global Announcement Banner */}
                <AnimatePresence>
                    {systemStatus?.globalAnnouncement?.active && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className={`w-full flex items-center justify-center px-4 py-2 font-bold text-sm text-white shadow-md cursor-pointer relative z-50 ${systemStatus.globalAnnouncement.type === 'error' ? 'bg-red-500' :
                                systemStatus.globalAnnouncement.type === 'warning' ? 'bg-amber-500' :
                                    'bg-gradient-to-r from-indigo-600 to-violet-600'
                                }`}
                            layout
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            {systemStatus.globalAnnouncement.message}
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Impersonation Warning Banner */}
                {isImpersonating && user && (
                    <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between shadow-md">
                        <div className="font-semibold text-sm flex items-center gap-2">
                            <span>Warning: You are currently viewing as <strong>{user.name}</strong> ({user.email})</span>
                        </div>
                        <button
                            onClick={async () => {
                                await exitImpersonation();
                                window.location.href = '/superadmin/users'; // Redirect back to users list
                            }}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold transition-colors"
                        >
                            <LogOut className="w-3 h-3" /> Exit to Admin
                        </button>
                    </div>
                )}



                {/* Main Content */}
                <main className={`flex-1 overflow-auto bg-background-light dark:bg-background-dark relative transition-colors duration-300 p-4 md:p-6 pb-20`}>
                    <Outlet />
                </main>

                {/* MAINTENANCE MODAL */}
                {isMaintenance && !user?.isAdmin && (
                    <div className="absolute inset-0 z-[100] bg-white/50 dark:bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">System Under Maintenance</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">
                                We're currently performing scheduled maintenance to improve your experience.
                                Please check back shortly.
                            </p>
                            <div className="text-xs font-mono text-slate-400">
                                Error Code: 503_MAINTENANCE
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

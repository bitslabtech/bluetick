import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { LogOut, Info, AlertTriangle, AlertOctagon, Menu, X, Zap } from 'lucide-react';
import axios from 'axios';

import NotificationBell from './NotificationBell';
import UserDropdown from './UserDropdown';

export default function Layout() {
    const { isImpersonating, exitImpersonation, user } = useAuth();
    const { publicSettings, publicSettingsLoading } = useUI();
    const [systemStatus, setSystemStatus] = useState(null);
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSystemConfig = async () => {
            try {
                // Use the new public status endpoint
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/system/status`);

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
                    className="fixed inset-0 bg-black/50 z-[55] md:hidden backdrop-blur-sm transition-opacity cursor-pointer"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-surface-dark shrink-0 z-30 shadow-sm relative h-[60px]">
                    {/* Hamburger Menu - Left */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors z-10 relative"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Logo - Centered */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                        {publicSettings?.logoUrl ? (
                            <img 
                                src={publicSettings.logoUrl} 
                                alt="Logo" 
                                className="h-7 max-w-[120px] w-auto object-contain" 
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                        ) : null}
                        <div className="flex items-center justify-center rounded-lg bg-primary size-7 text-white shadow-lg shadow-blue-500/20" style={{ display: publicSettings?.logoUrl ? 'none' : 'flex' }}>
                            <span className="font-bold text-xs">Wa</span>
                        </div>
                    </div>

                    {/* Notification & Profile - Right */}
                    <div className="flex items-center gap-3 z-10 relative">
                        <UserDropdown />
                    </div>
                </div>

                {/* Global Announcement Banner — CSS-animated, no framer-motion */}
                {systemStatus?.globalAnnouncement?.active && (
                    <div
                        style={{ animation: 'layout-banner-in 0.3s ease forwards', overflow: 'hidden' }}
                        className={`w-full flex items-center justify-center gap-3 px-4 py-2 font-bold text-sm text-white shadow-md relative z-50 ${systemStatus.globalAnnouncement.type === 'error' ? 'bg-red-500' :
                            systemStatus.globalAnnouncement.type === 'warning' ? 'bg-amber-500' :
                                'bg-gradient-to-r from-indigo-600 to-violet-600'
                            }`}
                    >
                        {systemStatus.globalAnnouncement.type === 'error' ? (
                            <AlertOctagon className="w-4 h-4 shrink-0" />
                        ) : systemStatus.globalAnnouncement.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                        ) : (
                            <Info className="w-4 h-4 shrink-0" />
                        )}
                        <span>{systemStatus.globalAnnouncement.message}</span>
                        {systemStatus.globalAnnouncement.buttonUrl && (
                            <a
                                href={systemStatus.globalAnnouncement.buttonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 ml-2 px-3 py-0.5 bg-white/25 hover:bg-white/40 border border-white/40 rounded-full text-white text-xs font-bold transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {systemStatus.globalAnnouncement.buttonText || 'Learn More'}
                            </a>
                        )}
                    </div>
                )}
                <style>{`@keyframes layout-banner-in { from { height: 0; opacity: 0 } to { height: auto; opacity: 1 } }`}</style>


                {/* Impersonation Warning Banner */}
                {isImpersonating && user && (
                    <div className="bg-amber-500 text-white px-4 md:px-6 py-2 flex items-center justify-between shadow-md">
                        <div className="font-semibold text-sm flex items-center gap-2">
                            <span>Warning: You are currently viewing as <strong>{user.name}</strong> ({user.email})</span>
                        </div>
                        <button
                            onClick={async () => {
                                await exitImpersonation();
                                // exitImpersonation already handles navigation to /superadmin/users
                            }}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold transition-colors"
                        >
                            <LogOut className="w-3 h-3" /> Exit to Admin
                        </button>
                    </div>
                )}



                {/* Global Trial Banner overlay (Centered at Top) */}
                {user?.planStatus === 'Trial' && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-4 hidden md:flex items-center gap-3 bg-amber-50/90 dark:bg-amber-900/40 border border-amber-200/50 dark:border-amber-500/30 px-3 py-1.5 rounded-full backdrop-blur-md transition-all hover:border-amber-300 dark:hover:border-amber-500/50 shadow-sm z-[60]">
                        <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            <div className="flex flex-col justify-center">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-amber-100/90 leading-none mb-0.5">Trial Plan Active</span>
                                <span className="text-[9px] font-semibold text-amber-600/80 dark:text-amber-400/80 leading-none">
                                    {user?.planExpiry ? `${Math.max(0, Math.ceil((new Date(user.planExpiry) - new Date()) / 86400000))} Days Left` : 'Explore Features'}
                                </span>
                            </div>
                        </div>
                        <div className="h-5 w-px bg-amber-200 dark:bg-amber-500/20 mx-1"></div>
                        <button
                            onClick={() => navigate('/billing')}
                            className="group relative px-3 py-1 font-bold text-[11px] rounded-full overflow-hidden active:scale-95 transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow"
                        >
                            <span className="relative flex items-center">
                                Upgrade Now
                            </span>
                        </button>
                    </div>
                )}

                {/* Main Content */}
                <main className={`flex-1 overflow-auto bg-background-light dark:bg-background-dark relative transition-colors duration-300 p-4 md:p-6 pb-7 sm:pb-20`}>
                    <Outlet />
                </main>

                {/* MAINTENANCE MODAL */}
                {isMaintenance && !user?.isAdmin && (
                    <div className="absolute inset-0 z-[100] bg-white/50 dark:bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
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

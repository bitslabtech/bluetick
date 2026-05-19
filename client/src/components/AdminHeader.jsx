import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserDropdown from './UserDropdown';
import NotificationBell from './NotificationBell';

const AdminHeader = ({ title, subtitle, children, showSearch = true, searchTerm = '', onSearchChange }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // Profile logic moved to UserDropdown



    return (
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300 sticky top-0 z-10">
            <div className="flex items-center gap-6 w-full">
                {showSearch && (
                    <div className="flex items-center rounded-lg bg-slate-100 dark:bg-surface-dark h-10 w-full max-w-md px-3 border border-transparent focus-within:border-primary transition-colors hidden md:flex">
                        <input
                            value={searchTerm}
                            onChange={onSearchChange}
                            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-secondary text-sm focus:outline-none ml-2"
                            placeholder="Search..."
                        />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4">
                {/* Custom actions passed from parent */}
                {children}

                {/* Notification Bell */}
                <NotificationBell />

                {/* Profile Dropdown */}
                <UserDropdown />
            </div>
        </header>
    );
};

export default AdminHeader;

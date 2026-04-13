import React from 'react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import UserDropdown from './UserDropdown';

export default function TopHeader({ leftContent, title, subtitle, rightContent }) {
    return (
        <header className="hidden md:flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300 sticky top-0 z-50 w-full shadow-sm">
            <div className="flex items-center gap-6 flex-1 min-w-0">
                {leftContent ? leftContent : (
                    <div className="flex flex-col gap-0.5 truncate">
                        {title && <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight truncate">{title}</h2>}
                        {subtitle && <p className="text-slate-500 dark:text-text-secondary text-sm truncate">{subtitle}</p>}
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-4 shrink-0 ml-4">
                {rightContent && (
                    <div className="flex items-center gap-3 mr-4 pr-4 border-r border-slate-200 dark:border-white/10">
                        {rightContent}
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </div>
        </header>
    );
}

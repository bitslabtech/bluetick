import React from 'react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import UserDropdown from './UserDropdown';

export default function TopHeader({ leftContent, title, subtitle, rightContent }) {
    // If no custom content, hide the entire TopHeader on mobile to save space
    const headerDisplayClass = (!leftContent && !rightContent) ? 'hidden md:flex' : 'flex';

    return (
        <header className={`${headerDisplayClass} flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300 sticky top-0 z-50 w-full shadow-sm`}>
            <div className="flex items-center gap-6 flex-1 min-w-0 w-full">
                {leftContent ? leftContent : (
                    <div className="hidden md:flex flex-col gap-0.5 truncate">
                        {title && <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight truncate">{title}</h2>}
                        {subtitle && <p className="text-slate-500 dark:text-text-secondary text-sm truncate">{subtitle}</p>}
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                {rightContent && (
                    <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 md:border-r pt-3 md:pt-0 border-slate-200 dark:border-white/10">
                        {rightContent}
                    </div>
                )}
                <div className="hidden md:flex items-center gap-4">
                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </div>
        </header>
    );
}

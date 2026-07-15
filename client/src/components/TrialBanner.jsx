import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';

export default function TrialBanner() {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (user?.planStatus !== 'Trial') return null;

    return (
        <div className="flex items-center gap-3 bg-amber-50/90 dark:bg-amber-900/40 border border-amber-200/50 dark:border-amber-500/30 px-3 py-1.5 rounded-full backdrop-blur-md transition-all hover:border-amber-300 dark:hover:border-amber-500/50 shadow-sm mr-2 hidden md:flex shrink-0 whitespace-nowrap">
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
    );
}

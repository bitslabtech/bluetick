import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Nfc, ShieldCheck, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NfcSetup() {
    const { shortCode } = useParams();
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // If they are already logged in, redirect them directly to the vcard list with a query param
    // or we can just let them click a button to go there.
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background-dark flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-surface-dark rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 p-4 md:p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <Nfc className="w-12 h-12 text-indigo-600 dark:text-indigo-400 relative z-10" />
                </div>
                
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">New NFC Device!</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    You've successfully tapped a brand new, unassigned Physical NFC device. 
                    <br /><br />
                    Code: <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 rounded">{shortCode}</span>
                </p>

                {isAuthenticated ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3 text-left">
                            <ShieldCheck className="w-6 h-6 shrink-0" />
                            <p className="text-sm font-medium">You are currently logged in as <strong>{user?.name}</strong>.</p>
                        </div>
                        <Link 
                            to="/dashboard" 
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 group"
                        >
                            Go to Dashboard to Link it
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Link 
                            to="/login" 
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30"
                        >
                            Log In to Link Device
                        </Link>
                        <Link 
                            to="/register" 
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold py-4 rounded-xl transition-all"
                        >
                            <UserPlus className="w-5 h-5" />
                            Create a New Account
                        </Link>
                        <p className="text-xs text-slate-400 mt-6">
                            Once logged in, navigate to Digital vCards and click "Link NFC Device".
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

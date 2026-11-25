import { useEffect, useState } from 'react';
import axios from 'axios';
import { useUI } from '../context/UIContext';

const API = import.meta.env.VITE_API_URL;

/**
 * Danger zone: the owner schedules deletion of the whole workspace. It is purged permanently after
 * a 30-day grace period and can be cancelled until then (same API as the mobile app).
 */
export default function DeleteAccountPanel() {
    const { showToast } = useUI();
    const [state, setState] = useState(null);
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get(`${API}/api/account/deletion`).then((r) => setState(r.data)).catch(() => setState(null));
    }, []);

    const scheduled = state?.scheduledFor ? new Date(state.scheduledFor) : null;
    const graceDays = state?.graceDays ?? 30;

    const request = async () => {
        setBusy(true);
        setError('');
        try {
            const r = await axios.post(`${API}/api/account/deletion`, { password });
            setState((s) => ({ ...s, ...r.data }));
            setOpen(false);
            setPassword('');
            showToast({ type: 'success', title: 'Deletion scheduled', message: `Your account will be deleted in ${graceDays} days. You can cancel until then.` });
        } catch (err) {
            setError(err.response?.data?.error || 'Could not schedule the deletion.');
        } finally {
            setBusy(false);
        }
    };

    const cancel = async () => {
        setBusy(true);
        try {
            const r = await axios.delete(`${API}/api/account/deletion`);
            setState((s) => ({ ...s, ...r.data }));
            showToast({ type: 'success', title: 'Deletion cancelled', message: 'Your account will not be deleted.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Could not cancel', message: err.response?.data?.error || 'Please try again.' });
        } finally {
            setBusy(false);
        }
    };

    if (state && !state.canDelete && !scheduled) return null; // team members: nothing to do here

    return (
        <section className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-400">{scheduled ? 'Account deletion scheduled' : 'Delete Account'}</h3>
                    <p className="text-sm text-red-600 dark:text-red-300/80 mt-1">
                        {scheduled
                            ? `This workspace and all its data will be deleted permanently on ${scheduled.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}. Everything keeps working until then.`
                            : `Removes the whole workspace for everyone on your team: chats, contacts, templates, campaigns, flows, store, media and team access. You have ${graceDays} days to cancel; after that it cannot be undone. Payment records are kept for accounting.`}
                    </p>
                </div>
                {scheduled ? (
                    state?.canDelete && (
                        <button onClick={cancel} disabled={busy} className="px-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60 whitespace-nowrap">
                            {busy ? 'Cancelling…' : 'Cancel deletion'}
                        </button>
                    )
                ) : (
                    <button onClick={() => { setOpen(true); setError(''); }} className="px-4 py-2 bg-white dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors whitespace-nowrap">
                        Delete Account
                    </button>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-dark p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Delete your OneDash account?</h4>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Everything in this workspace will be deleted permanently in {graceDays} days. You can cancel until then. Enter your password to confirm.
                        </p>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && password && !busy) request(); }}
                            placeholder="Password"
                            className="mt-4 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-400"
                            autoFocus
                        />
                        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
                        <div className="mt-5 flex justify-end gap-2">
                            <button onClick={() => setOpen(false)} disabled={busy} className="px-4 py-2 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5">Keep account</button>
                            <button onClick={request} disabled={!password || busy} className="px-4 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                                {busy ? 'Scheduling…' : 'Delete account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

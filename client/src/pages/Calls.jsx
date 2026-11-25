import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneMissed, PhoneIncoming, X, Copy, MessageSquare, Lock, Gauge, RefreshCw, Loader2, CheckCircle2, XCircle, Bell, Users } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/dateFormat';
import CallSettingsPanel from '../components/calls/CallSettingsPanel';
import { contactLabel, realName, describe, headline, END_REASON, autoText, mmss, STATE_COPY, phoneView } from '../components/calls/callText';

const card = 'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm';
const PAGE = 30;

function Avatar({ label, bad }) {
    const initials = label.replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '#';
    return (
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${bad ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>
            {initials}
        </div>
    );
}

/** Why calling is not usable: same states as the mobile app. Web may link to the add-on. */
function Unavailable({ status, isOwner }) {
    const navigate = useNavigate();
    const c = STATE_COPY[status.state] || STATE_COPY.addon_required;
    const body = status.state === 'not_eligible'
        ? `WhatsApp only allows calling on numbers with a messaging limit of ${status.minimumLimit.toLocaleString()} or more. ${status.messagingLimit > 0 ? `Yours is ${status.messagingLimit.toLocaleString()}.` : 'We could not read your current limit.'}`
        : c.body;
    const Icon = status.state === 'not_eligible' ? Gauge : status.state === 'whatsapp_not_connected' ? MessageSquare : Lock;
    return (
        <div className={`${card} p-10 text-center max-w-xl mx-auto`}>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4"><Icon className="w-7 h-7 text-slate-500" /></div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{body}</p>
            {status.state === 'whatsapp_not_connected' ? (
                <button onClick={() => navigate('/whatsapp-settings')} className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Connect WhatsApp</button>
            ) : status.state === 'addon_required' && isOwner ? (
                <button onClick={() => navigate('/marketplace')} className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">View add-ons</button>
            ) : status.state === 'addon_required' ? (
                <p className="text-xs text-slate-400 mt-4">Ask your account owner about enabling it.</p>
            ) : null}
        </div>
    );
}

function DetailRow({ icon: Icon, label, value }) { // eslint-disable-line no-unused-vars -- used as <Icon />
    return (
        <div className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-white/10 last:border-0">
            <Icon className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white text-right">{value}</span>
        </div>
    );
}

function CallDrawer({ initial, onClose }) {
    const navigate = useNavigate();
    const { showToast } = useUI();
    const { user } = useAuth();
    const [call, setCall] = useState(initial);
    const [loading, setLoading] = useState(true);

    // The drawer is keyed by call id, so state starts fresh for each call.
    useEffect(() => {
        let alive = true;
        axios.get(`/api/calls/${initial.id}`).then((r) => alive && setCall(r.data)).catch(() => {}).finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [initial]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const phone = phoneView(call.phoneNumber, user);
    const nameIsNumber = !realName(call.contactName) && !!call.phoneNumber;
    const name = contactLabel(call.contactName, call.phoneNumber, user);
    const h = headline(call);
    const when = (iso) => (iso ? formatDateTime(iso) : '');
    const copy = async () => {
        try { await navigator.clipboard.writeText(`+${call.phoneNumber}`); showToast({ type: 'success', title: 'Number copied' }); } catch { /* ignore */ }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
            <aside className="w-full max-w-md h-full bg-white dark:bg-[#111a27] shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()} aria-label="Call details">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#111a27]">
                    <h2 className="font-bold text-slate-900 dark:text-white">Call details</h2>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-5 space-y-6">
                    <div className="text-center space-y-1">
                        <div className="flex justify-center mb-2"><Avatar label={nameIsNumber ? '#' : name} bad={h.bad} /></div>
                        <p className={`text-lg font-bold text-slate-900 dark:text-white ${nameIsNumber && phone.blur ? 'blur-sm select-none' : ''}`}>{name}</p>
                        {realName(call.contactName) && call.phoneNumber ? <p className={`text-sm text-slate-500 ${phone.blur ? 'blur-sm select-none' : ''}`}>{phone.text}</p> : null}
                        <p className={`text-sm font-semibold ${h.bad ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>{h.text}</p>
                        {END_REASON[call.endReason] && call.status !== 'ended' ? <p className="text-xs text-slate-500 max-w-xs mx-auto">{END_REASON[call.endReason]}</p> : null}
                    </div>

                    <div className="flex gap-2">
                        {call.conversationId ? (
                            <button onClick={() => navigate('/whatsapp', { state: { openChatId: call.conversationId } })} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"><MessageSquare className="w-4 h-4" />Open chat</button>
                        ) : null}
                        {call.phoneNumber && !phone.hidden ? (
                            <button onClick={copy} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2"><Copy className="w-4 h-4" />Copy number</button>
                        ) : null}
                    </div>

                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Timeline</h3>
                        <div>
                            <DetailRow icon={PhoneIncoming} label="Call came in" value={when(call.startedAt)} />
                            {call.answeredAt ? <DetailRow icon={CheckCircle2} label={`Answered${call.answeredByName ? ` by ${call.answeredByName}` : ''}`} value={when(call.answeredAt)} /> : null}
                            {call.endedAt ? <DetailRow icon={XCircle} label="Call ended" value={when(call.endedAt)} /> : null}
                            {call.durationSec ? <DetailRow icon={Phone} label="Duration" value={mmss(call.durationSec)} /> : null}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Who was rung</h3>
                        {loading && !call.rang ? (
                            <div className="space-y-2 py-2">{[0, 1].map((i) => <div key={i} className="h-5 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />)}</div>
                        ) : call.rang?.length ? (
                            <div>
                                {call.rang.map((m) => (
                                    <DetailRow key={m.id} icon={m.declined ? XCircle : m.id === call.answeredBy ? CheckCircle2 : Bell} label={m.name} value={m.id === call.answeredBy ? 'Answered' : m.declined ? 'Declined' : 'Rang'} />
                                ))}
                                {call.ringStage === 2 ? <DetailRow icon={Users} label="Nobody picked up in time, so the whole team was rung" value="" /> : null}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 py-2">No phone was rung for this call.</p>
                        )}
                    </section>

                    {call.autoMessage ? (
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{call.autoMessage.which === 'closedMessage' ? 'Closed message' : 'Missed call message'}</h3>
                            <p className={`text-sm py-2 ${autoText(call.autoMessage).bad ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>{autoText(call.autoMessage).text}</p>
                        </section>
                    ) : null}
                </div>
            </aside>
        </div>
    );
}

function History({ status }) {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [calls, setCalls] = useState([]);
    const [state, setState] = useState('loading'); // loading | ready | error
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [open, setOpen] = useState(null);

    const merge = useCallback((list, incoming, atTop) => {
        const byId = new Map(list.map((c) => [c.id, c]));
        incoming.forEach((c) => byId.set(c.id, { ...byId.get(c.id), ...c }));
        const fresh = incoming.filter((c) => !list.some((x) => x.id === c.id));
        const rest = list.map((c) => byId.get(c.id));
        return atTop ? [...fresh, ...rest] : [...rest, ...fresh];
    }, []);

    const load = useCallback(async () => {
        setState('loading');
        try {
            const { data } = await axios.get('/api/calls', { params: { limit: PAGE } });
            setCalls(data.calls || []);
            setHasMore(!!data.hasMore);
            setState('ready');
        } catch { setState('error'); }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const more = async () => {
        if (!calls.length) return;
        setLoadingMore(true);
        try {
            const { data } = await axios.get('/api/calls', { params: { limit: PAGE, before: calls[calls.length - 1].startedAt } });
            setCalls((list) => merge(list, data.calls || [], false));
            setHasMore(!!data.hasMore);
        } catch { /* keep the button so they can retry */ } finally { setLoadingMore(false); }
    };

    // Live: new calls appear at the top, and ringing ones update as they end.
    useEffect(() => {
        if (!socket) return undefined;
        const onUpdate = (c) => { if (c?.id) setCalls((list) => merge(list, [c], true)); };
        socket.on('call_update', onUpdate);
        return () => socket.off('call_update', onUpdate);
    }, [socket, merge]);

    const sorted = useMemo(() => [...calls].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)), [calls]);

    if (state === 'loading') {
        return (
            <div className={`${card} divide-y divide-slate-100 dark:divide-white/10`}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                        <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
                        <div className="flex-1 space-y-2"><div className="h-3.5 w-40 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /><div className="h-3 w-24 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></div>
                        <div className="h-3 w-16 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div className={`${card} p-10 text-center`}>
                <p className="text-slate-600 dark:text-slate-300 font-semibold">Couldn’t load call history</p>
                <button onClick={load} className="mt-4 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />Try again</button>
            </div>
        );
    }
    if (!sorted.length) {
        return (
            <div className={`${card} p-10 text-center`}>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4"><Phone className="w-7 h-7 text-emerald-600" /></div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{status.state === 'disabled' ? 'Calling is switched off' : 'No calls yet'}</h2>
                <p className="text-sm text-slate-500 mt-2">{status.state === 'disabled' ? 'Turn on “Accept WhatsApp calls” in Settings so customers can call you.' : 'Calls from your customers on WhatsApp will appear here.'}</p>
            </div>
        );
    }

    return (
        <>
            <div className={`${card} divide-y divide-slate-100 dark:divide-white/10 overflow-hidden`}>
                {sorted.map((c) => {
                    const name = contactLabel(c.contactName, c.phoneNumber, user);
                    const blur = !realName(c.contactName) && phoneView(c.phoneNumber, user).blur;
                    const d = describe(c);
                    return (
                        <button key={c.id} onClick={() => setOpen(c)} className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <Avatar label={realName(c.contactName) ? name : '#'} bad={d.bad} />
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold truncate ${d.bad ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'} ${blur ? 'blur-sm select-none' : ''}`}>{name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate inline-flex items-center gap-1.5">
                                    {d.bad ? <PhoneMissed className="w-3.5 h-3.5" /> : <PhoneIncoming className="w-3.5 h-3.5" />}{d.text}
                                </p>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">{formatDateTime(c.startedAt)}</span>
                        </button>
                    );
                })}
            </div>
            {hasMore ? (
                <div className="flex justify-center mt-4">
                    <button onClick={more} disabled={loadingMore} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 disabled:opacity-60">
                        {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Load more
                    </button>
                </div>
            ) : null}
            {open ? <CallDrawer key={open.id} initial={open} onClose={() => setOpen(null)} /> : null}
        </>
    );
}

/** Voice calls: history and settings. Calls are answered only in the mobile app. */
export default function Calls() {
    const { user } = useAuth();
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState('history');

    const fetchStatus = useCallback(() => axios.get('/api/calls/status')
        .then(({ data }) => { setStatus(data); setError(false); })
        .catch(() => setError(true)), []);
    useEffect(() => { fetchStatus(); }, [fetchStatus]);
    const loadStatus = () => { setError(false); setStatus(null); fetchStatus(); };

    const onStatus = useCallback((s) => setStatus((prev) => ({ ...s, canManage: s.canManage ?? prev?.canManage ?? false })), []);
    const usable = status && (status.state === 'ready' || status.state === 'disabled');
    const isOwner = !user?.parentUserId;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Voice Calls</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Customers call your WhatsApp number. Your team answers in the OneDash mobile app.</p>
                </div>
            </div>

            {error ? (
                <div className={`${card} p-10 text-center`}>
                    <p className="text-slate-600 dark:text-slate-300 font-semibold">Couldn’t load voice calling</p>
                    <button onClick={loadStatus} className="mt-4 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />Try again</button>
                </div>
            ) : !status ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : !usable ? (
                <Unavailable status={status} isOwner={isOwner} />
            ) : (
                <>
                    <div role="tablist" className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 mb-5">
                        {[['history', 'History'], ['settings', 'Settings']].map(([id, label]) => (
                            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === id ? 'bg-white dark:bg-[#1a2332] text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {tab === 'history' ? <History status={status} /> : <CallSettingsPanel status={status} onStatus={onStatus} />}
                </>
            )}
        </div>
    );
}

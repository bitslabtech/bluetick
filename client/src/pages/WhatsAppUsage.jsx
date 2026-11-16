import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, Send, Gift, RefreshCw, ExternalLink, AlertCircle, Info, ChevronDown, Layers } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL;
const BILLING_HUB_URL = 'https://business.facebook.com/billing_hub/payment_activity';

const RANGES = [
    { id: 'this_month', label: 'This month' },
    { id: 'last_month', label: 'Last month' },
    { id: 'last_30', label: 'Last 30 days' },
    { id: 'custom', label: 'Custom range' }
];

const card = 'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm';

function StatCard({ icon: Icon, label, value, sub, tone, loading }) {
    const tones = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
    };
    return (
        <div className={`${card} p-5 flex flex-col gap-3`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                {loading
                    ? <div className="h-8 w-28 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
                    : <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>}
                {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function WhatsAppUsage() {
    const [range, setRange] = useState('this_month');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const today = format(new Date(), 'yyyy-MM-dd');

    const load = useCallback(async (refresh = false) => {
        if (range === 'custom' && !(from && to && from <= to)) return;
        setLoading(true);
        setError(null);
        try {
            const params = { range, ...(range === 'custom' ? { from, to } : {}), ...(refresh ? { refresh: 1 } : {}) };
            const res = await axios.get(`${API_BASE}/api/whatsapp/meta-analytics`, { params });
            setData(res.data);
        } catch (err) {
            setData(null);
            setError(err.response?.data?.detail || err.response?.data?.error || 'Could not load usage data');
        } finally {
            setLoading(false);
        }
    }, [range, from, to]);

    useEffect(() => { load(); }, [load]);

    const money = (n) => {
        const v = Number(n || 0);
        if (!data?.currency) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: data.currency, minimumFractionDigits: 2 }).format(v);
        } catch { return `${data.currency} ${v.toFixed(2)}`; }
    };
    const num = (n) => Number(n || 0).toLocaleString();

    const totals = data?.totals || { spend: 0, volume: 0, paid: 0, free: 0 };
    const allowance = data?.freeAllowance;
    const allowancePct = allowance ? Math.min(100, (allowance.used / allowance.limit) * 100) : 0;
    const chartData = (data?.daily || []).map(d => ({
        label: format(new Date(`${d.date}T00:00:00`), 'MMM d'),
        cost: Number(d.cost.toFixed(2)),
        messages: d.volume
    }));

    return (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b1117] p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-indigo-500" />
                            Usage & Spend
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            What your WhatsApp number used and what Meta charged for it. Meta bills your payment method directly.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <select
                                value={range}
                                onChange={e => setRange(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                                {RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        {range === 'custom' && (
                            <>
                                <input type="date" value={from} max={today} onChange={e => setFrom(e.target.value)}
                                    className="px-3 py-2 rounded-xl text-sm bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white" />
                                <span className="text-slate-400 text-sm">to</span>
                                <input type="date" value={to} max={today} onChange={e => setTo(e.target.value)}
                                    className="px-3 py-2 rounded-xl text-sm bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white" />
                            </>
                        )}
                        <button
                            onClick={() => load(true)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <a
                            href={BILLING_HUB_URL}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a2332] text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Invoices & payments
                        </a>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-4 mb-6">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                {data?.syncError && (
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 mb-6">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            {data.syncError === 'token_expired'
                                ? 'Your WhatsApp connection has expired. Reconnect it in WhatsApp Settings to refresh these numbers. Showing the last saved data.'
                                : 'Could not refresh from Meta right now. Showing the last saved data.'}
                        </p>
                    </div>
                )}

                {data && data.costAvailable === false && (
                    <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4 mb-6">
                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Meta does not share prices for this account (it is billed through a partner). Message counts are accurate; check your provider for amounts.
                        </p>
                    </div>
                )}

                {!error && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <StatCard icon={Wallet} tone="indigo" label="Estimated spend" loading={loading}
                                value={money(totals.spend)}
                                sub={data?.range ? `${data.range.from} to ${data.range.to}` : null} />
                            <StatCard icon={Send} tone="blue" label="Paid messages" loading={loading}
                                value={num(totals.paid)}
                                sub={`${num(totals.volume)} delivered in total`} />
                            <StatCard icon={Gift} tone="emerald" label="Free messages" loading={loading}
                                value={num(totals.free)}
                                sub="Free chat replies, ad conversations and more" />
                        </div>

                        {allowance && (
                            <div className={`${card} p-5 mb-6`}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Free chat replies this month</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        <span className="font-bold text-slate-900 dark:text-white">{num(allowance.used)}</span> of {num(allowance.limit)} used
                                    </p>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                    <div className={`h-full rounded-full ${allowancePct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${allowancePct}%` }} />
                                </div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                    Your first 1,000 chat replies each month are free. Replies after that are charged. Resets on the 1st.
                                </p>
                            </div>
                        )}

                        <div className={`${card} p-5 mb-6`}>
                            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">What you paid for</h2>
                            {loading ? (
                                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />)}</div>
                            ) : !data?.byCategory?.length ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No delivered messages in this period.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="text-left font-semibold pb-2">Type</th>
                                                <th className="text-right font-semibold pb-2">Messages</th>
                                                <th className="text-right font-semibold pb-2">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {data.byCategory.map(c => (
                                                <tr key={c.key}>
                                                    <td className="py-2.5 text-slate-800 dark:text-slate-200">{c.label}</td>
                                                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{num(c.volume)}</td>
                                                    <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">{c.key === 'FREE' ? 'Free' : money(c.cost)}</td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td className="pt-3 font-bold text-slate-900 dark:text-white">Total</td>
                                                <td className="pt-3 text-right font-bold text-slate-900 dark:text-white">{num(totals.volume)}</td>
                                                <td className="pt-3 text-right font-bold text-slate-900 dark:text-white">{money(totals.spend)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className={`${card} p-5 mb-6`}>
                            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">Daily spend</h2>
                            {loading ? (
                                <div className="h-56 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />
                            ) : chartData.length === 0 ? (
                                <p className="text-sm text-slate-400 py-10 text-center">Nothing to chart for this period.</p>
                            ) : (
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={48} />
                                            <Tooltip
                                                formatter={(value, name) => name === 'cost' ? [money(value), 'Spend'] : [num(value), 'Messages']}
                                                contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.3)' }}
                                            />
                                            <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className={`${card} p-5 mb-6`}>
                            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                                <Layers className="w-4 h-4 text-slate-400" />
                                Where your messages came from
                            </h2>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Message counts by feature. Amounts are shown only in the table above.</p>
                            {loading ? (
                                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />)}</div>
                            ) : !data?.byFeature?.length ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No tracked messages in this period yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="text-left font-semibold pb-2">Feature</th>
                                                <th className="text-right font-semibold pb-2">Delivered</th>
                                                <th className="text-right font-semibold pb-2">Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {data.byFeature.map(f => (
                                                <tr key={f.key}>
                                                    <td className="py-2.5 text-slate-800 dark:text-slate-200">{f.label}</td>
                                                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{num(f.delivered)}</td>
                                                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{num(f.paid)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400 px-1">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                                Amounts are Meta's estimates and may differ slightly from your invoice. Only delivered messages are charged. For official invoices and payment history, open{' '}
                                <a href={BILLING_HUB_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Meta Billing Hub</a>.
                                {data?.syncedAt && <> Last updated {format(new Date(data.syncedAt), 'MMM d, h:mm a')}.</>}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

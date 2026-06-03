import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, CheckCircle2, Clock, BarChart, MessageCircle, UserPlus, Layout, Zap, FileText, Download, TrendingUp, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';


const BillingTab = () => {
    const navigate = useNavigate();
    const [billingInfo, setBillingInfo] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        try {
            const [infoRes, invoicesRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/billing`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/billing/invoices`)
            ]);
            setBillingInfo(infoRes.data);
            setInvoices(invoicesRes.data);
        } catch (error) {
            console.error("Error fetching billing data:", error);
        } finally {
            setLoading(false);
        }
    };



    if (loading) return <div className="p-4 md:p-8 text-center text-slate-500">Loading billing details...</div>;

    const { plan, usage } = billingInfo || {};
    const usagePercent = usage?.monthlyLimit > 0 ? (usage.messagesSent / usage.monthlyLimit) * 100 : 0;
    const isEnterprise = plan?.name === 'Enterprise';

    // Currency symbol helper
    const currencySymbol = (currency) => {
        const map = { USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' };
        return map[currency] || currency || '$';
    };

    // Billing interval label helper
    const intervalLabel = (interval) => {
        if (interval === 'year') return '/yr';
        if (interval === 'lifetime') return ' lifetime';
        return '/mo';  // default = month
    };

    // Plan Validity (expiry vs now)
    const expiryDate = plan?.expiry ? new Date(plan.expiry) : null;
    const today = new Date();
    const daysRemaining = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
    const isExpired = daysRemaining !== null && daysRemaining < 0;

    // Monthly Usage Reset (first of next month)
    const nextReset = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextReset - today) / (1000 * 60 * 60 * 24));

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Plan Card */}
                <div className="lg:col-span-2 relative group overflow-hidden rounded-3xl p-4 md:p-8 text-white shadow-2xl transition-all hover:scale-[1.01]">
                    <div className={`absolute inset-0 bg-gradient-to-br ${isEnterprise ? 'from-slate-900 via-slate-800 to-black' : 'from-violet-600 via-indigo-600 to-blue-600'}`}></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                    <div className="absolute top-0 right-0 p-4 md:p-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                                    <Sparkles className="w-3 h-3 text-yellow-300" /> Current Plan
                                </div>
                                <h2 className="text-4xl font-display font-bold mb-2 tracking-tight">{plan?.name || 'Free Plan'}</h2>
                                <p className="text-indigo-100 text-lg opacity-80">
                                    {isEnterprise ? 'Unlimited power for your business.' : 'Supercharge your messaging.'}
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <div className="flex items-baseline justify-start sm:justify-end gap-1">
                                    <span className="text-5xl font-bold tracking-tighter">{currencySymbol(plan?.currency)}{plan?.price}</span>
                                    <span className="text-white/60 font-medium">{intervalLabel(plan?.interval)}</span>
                                </div>
                                <p className="text-sm text-white/60 mt-1">
                                    {plan?.interval === 'year' ? 'Billed annually' : plan?.interval === 'lifetime' ? 'One-time payment' : 'Billed monthly'}
                                </p>
                            </div>
                        </div>

                        {/* Expiry Alert Banner */}
                        {(isExpiringSoon || isExpired) && (
                            <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${isExpired ? 'bg-red-500/30 text-red-100 border border-red-400/30' : 'bg-yellow-500/30 text-yellow-100 border border-yellow-400/30'}`}>
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                {isExpired
                                    ? 'Your plan has expired. Renew now to continue using premium features.'
                                    : `Your plan expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}!`
                                }
                            </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-6">
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-green-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/60 uppercase font-bold">Status</p>
                                        <p className="font-bold">{isExpired ? 'Expired' : (plan?.status || 'Active')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <Calendar className="w-5 h-5 text-blue-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/60 uppercase font-bold">Valid Until</p>
                                        <p className="font-bold">
                                            {expiryDate
                                                ? expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : 'Lifetime / No Expiry'
                                            }
                                        </p>
                                    </div>
                                </div>
                                {daysRemaining !== null && !isExpired && (
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <Clock className="w-5 h-5 text-purple-300" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/60 uppercase font-bold">Days Left</p>
                                            <p className={`font-bold ${isExpiringSoon ? 'text-yellow-300' : ''}`}>{daysRemaining} days</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate('/billing')}
                                    className="px-4 md:px-6 py-2.5 bg-white text-indigo-900 font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-all text-sm flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Upgrade Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Usage Summary Card */}
                <div className="bg-white dark:bg-surface-dark rounded-3xl p-4 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors"></div>

                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                            <BarChart className="w-5 h-5 text-indigo-500" /> Monthly Usage
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Resets in <span className="font-bold text-slate-700 dark:text-slate-200">{daysUntilReset} days</span> (1st of next month)</p>
                    </div>

                    <div className="flex-1 flex items-center justify-center my-6">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-white/5" />
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * (Math.min(usagePercent, 100) / 100))}
                                    className="text-indigo-500 transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round(usagePercent)}%</span>
                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">Used</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                            <span className="text-slate-900 dark:text-white font-bold">{usage?.messagesSent?.toLocaleString()}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            {usage?.monthlyLimit === -1 ? 'Unlimited' : usage?.monthlyLimit?.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Invoices Section */}
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" /> Billing History
                    </h3>
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-4 md:px-6 py-4">Invoice ID</th>
                                <th className="px-4 md:px-6 py-4">Date</th>
                                <th className="px-4 md:px-6 py-4">Plan</th>
                                <th className="px-4 md:px-6 py-4">Amount</th>
                                <th className="px-4 md:px-6 py-4">Status</th>
                                <th className="px-4 md:px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-sm text-slate-700 dark:text-slate-300">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 md:px-6 py-8 text-center text-slate-500">No invoices found.</td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-4 md:px-6 py-4 font-mono text-xs text-slate-500">#{inv.id.slice(0, 8)}</td>
                                        <td className="px-4 md:px-6 py-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 md:px-6 py-4 font-bold">{inv.planName}</td>
                                        <td className="px-4 md:px-6 py-4">{currencySymbol(inv.currency || plan?.currency)}{inv.amount}</td>
                                        <td className="px-4 md:px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <CheckCircle2 className="w-3 h-3" /> {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                    {invoices.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No invoices found.</div>
                    ) : (
                        invoices.map((inv) => (
                            <div key={inv.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{inv.planName}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-1">#{inv.id.slice(0, 8)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-900 dark:text-white">{currencySymbol(inv.currency || plan?.currency)}{inv.amount}</div>
                                        <div className="text-xs text-slate-500 mt-1">{new Date(inv.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        <CheckCircle2 className="w-3 h-3" /> {inv.status}
                                    </span>
                                    <button className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-2 text-xs font-bold">
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillingTab;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Copy, Check, Link2, ExternalLink } from 'lucide-react';
import IntegrationsTab from '../components/IntegrationsTab';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { cn } from '../lib/utils';

const MetaWebhookCard = () => {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [publicBaseUrl, setPublicBaseUrl] = useState(
        () => localStorage.getItem('publicBaseUrl') || import.meta.env.VITE_API_URL || ''
    );
    const [verifyToken, setVerifyToken] = useState('');
    const [webhookCopied, setWebhookCopied] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);

    const webhookPath = user?.id ? `/api/webhook/${user.id}` : '/api/webhook/...';
    const webhookUrl = publicBaseUrl
        ? `${publicBaseUrl.replace(/\/$/, '')}${webhookPath}`
        : `[Enter your public URL below]${webhookPath}`;

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/api/settings`)
            .then(res => setVerifyToken(res.data.verifyToken || res.data.webhookVerifyToken || ''))
            .catch(() => {});
    }, []);

    const handleUrlChange = (val) => {
        setPublicBaseUrl(val);
        localStorage.setItem('publicBaseUrl', val);
    };

    const copy = (text, setter) => {
        if (!publicBaseUrl) {
            showToast({ type: 'warning', title: 'No URL Set', message: 'Enter your public server URL first.' });
            return;
        }
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm mb-8">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Meta Webhook Setup</h2>
                        <p className="text-xs text-slate-500">Paste these into your Meta App Dashboard to connect WhatsApp</p>
                    </div>
                </div>
                <a
                    href="https://developers.facebook.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                    Meta Dashboard <ExternalLink className="w-3 h-3" />
                </a>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Public Server URL</label>
                    <input
                        type="url"
                        value={publicBaseUrl}
                        onChange={e => handleUrlChange(e.target.value)}
                        placeholder="https://your-domain.com or https://xxxx.ngrok.io"
                        className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Saved in your browser only.</p>
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Webhook URL</label>
                    <div className="flex gap-2">
                        <input readOnly value={webhookUrl}
                            className="flex-1 min-w-0 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 outline-none truncate" />
                        <button onClick={() => copy(webhookUrl, setWebhookCopied)}
                            className={cn("shrink-0 px-3 rounded-xl border text-xs font-semibold transition-all",
                                webhookCopied ? "bg-green-500 border-green-500 text-white" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-400")}>
                            {webhookCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Verify Token</label>
                    <div className="flex gap-2">
                        <input readOnly value={verifyToken}
                            className="flex-1 min-w-0 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 outline-none truncate" />
                        <button onClick={() => { navigator.clipboard.writeText(verifyToken); setTokenCopied(true); setTimeout(() => setTokenCopied(false), 2000); }}
                            className={cn("shrink-0 px-3 rounded-xl border text-xs font-semibold transition-all",
                                tokenCopied ? "bg-green-500 border-green-500 text-white" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-400")}>
                            {tokenCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Integrations = () => {
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader
                title="Integrations & API"
                subtitle="Connect your WhatsApp communications with CRM, eCommerce, and 3rd-party tools."
            />
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative p-4 sm:p-6 md:p-10">
                <div className="max-w-6xl mx-auto">
                    <MetaWebhookCard />
                    <IntegrationsTab />
                </div>
            </div>
        </div>
    );
};

export default Integrations;

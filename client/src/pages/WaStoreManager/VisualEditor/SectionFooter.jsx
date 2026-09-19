import React from 'react';
import { Instagram, Facebook, Youtube, Twitter, Globe } from 'lucide-react';

const SOCIAL_FIELDS = [
    { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/yourstore' },
    { key: 'facebook',  label: 'Facebook',  icon: Facebook,  placeholder: 'https://facebook.com/yourstore' },
    { key: 'youtube',   label: 'YouTube',   icon: Youtube,   placeholder: 'https://youtube.com/@yourstore' },
    { key: 'twitter',   label: 'Twitter/X', icon: Twitter,   placeholder: 'https://x.com/yourstore' },
    { key: 'website',   label: 'Website',   icon: Globe,     placeholder: 'https://yourdomain.com' },
];

const POLICY_FIELDS = [
    { key: 'showPrivacyPolicy',  label: 'Privacy Policy' },
    { key: 'showTerms',          label: 'Terms & Conditions' },
    { key: 'showReturnPolicy',   label: 'Return Policy' },
];

export default function SectionFooter({ draft, updateDraft }) {
    const footerConfig = draft.footerConfig || {};
    const socialLinks = footerConfig.socialLinks || {};

    const updateFooter = (key, val) => {
        updateDraft({ footerConfig: { ...footerConfig, [key]: val } });
    };

    const updateSocial = (key, val) => {
        updateDraft({ footerConfig: { ...footerConfig, socialLinks: { ...socialLinks, [key]: val } } });
    };

    return (
        <div className="space-y-5">
            {/* Custom footer text */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Footer Tagline</label>
                <input
                    type="text"
                    value={draft.customFooterText || ''}
                    onChange={e => updateDraft({ customFooterText: e.target.value })}
                    placeholder="e.g. Crafted with love in India 🇮🇳"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 outline-none"
                />
                <p className="text-xs text-gray-300 dark:text-slate-600">Appears in the bottom of your store footer.</p>
            </div>

            {/* Social links */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Social Media Links</label>
                <div className="space-y-2">
                    {SOCIAL_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
                        <div key={key} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                                <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                            </div>
                            <input
                                type="url"
                                value={socialLinks[key] || ''}
                                onChange={e => updateSocial(key, e.target.value)}
                                placeholder={placeholder}
                                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Policy links in footer */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Policy Links in Footer</label>
                <div className="space-y-2">
                    {POLICY_FIELDS.map(({ key, label }) => {
                        const enabled = footerConfig[key] !== false; // default to true
                        return (
                            <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                                <span className="text-sm text-gray-900 dark:text-white">{label}</span>
                                <button
                                    onClick={() => updateFooter(key, !enabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-violet-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <p className="text-xs text-gray-300 dark:text-slate-600 leading-relaxed">
                The Footer is always the last section and cannot be reordered or hidden.
            </p>
        </div>
    );
}

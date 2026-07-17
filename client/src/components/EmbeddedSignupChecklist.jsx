import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Circle, AlertTriangle, Facebook, Check } from 'lucide-react';

const CATEGORIES = [
    {
        id: 'facebook',
        title: 'Facebook Account Checklist',
        icon: <Facebook className="w-5 h-5 text-blue-600" />,
        items: [
            { id: 'fb_age', label: 'Account Maturity', desc: 'I am using a personal Facebook account that is at least 60 days old and regularly active (brand new accounts are instantly flagged).', isMandatory: true },
            { id: 'fb_2fa', label: 'Security', desc: 'Two-Factor Authentication (2FA) is enabled on my Facebook account.', isMandatory: false },
            { id: 'fb_network', label: 'Network Trust', desc: 'I am connected to a standard, trusted Wi-Fi network and I am NOT using a VPN.', isMandatory: true }
        ]
    },
    {
        id: 'business',
        title: 'Business Identity Checklist',
        icon: <ShieldCheck className="w-5 h-5 text-indigo-500" />,
        items: [
            { id: 'biz_name', label: 'Business Name', desc: 'The business name I will provide exactly matches my official website and public presence.', isMandatory: true },
            { id: 'biz_email', label: 'Website & Email', desc: 'I have a functional website and a business email address (e.g., admin@mybusiness.com, not @gmail.com).', isMandatory: false }
        ]
    },
    {
        id: 'phone',
        title: 'Phone Number Checklist',
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        items: [
            { id: 'phone_app', label: 'No Active Apps', desc: 'The phone number I plan to use has been completely deleted from the standard WhatsApp or WhatsApp Business mobile apps.', isMandatory: true },
            { id: 'phone_history', label: 'Clean History', desc: 'This phone number has never been banned or restricted by WhatsApp previously.', isMandatory: true },
            { id: 'phone_access', label: 'Accessibility', desc: 'I can receive an SMS or Voice Call on this number right now to verify it.', isMandatory: true }
        ]
    },
    {
        id: 'verification',
        title: 'Business Verification (Optional for Initial Setup)',
        icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
        items: [
            { id: 'ver_docs', label: 'Legal Documents', desc: 'I have official business registration documents readily available (e.g., GST Certificate, LLP docs). This is required later for higher messaging limits.', isMandatory: false },
            { id: 'ver_match', label: 'Document Consistency', desc: 'The exact business name and physical address on my legal documents perfectly match what I will submit to Meta.', isMandatory: false }
        ]
    }
];

export default function EmbeddedSignupChecklist({ isOpen, onClose, onProceed, fbLoading }) {
    const [checkedItems, setCheckedItems] = useState({});
    const [isReady, setIsReady] = useState(false);
    const [progress, setProgress] = useState(0);

    // Load from local storage on mount
    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem('wa_signup_checklist');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setCheckedItems(parsed);
                    calculateProgress(parsed);
                } catch (e) {
                    console.error('Error parsing checklist state', e);
                }
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleItem = (itemId) => {
        const newState = {
            ...checkedItems,
            [itemId]: !checkedItems[itemId]
        };
        setCheckedItems(newState);
        localStorage.setItem('wa_signup_checklist', JSON.stringify(newState));
        calculateProgress(newState);
    };

    const calculateProgress = (state) => {
        let mandatoryTotal = 0;
        let mandatoryChecked = 0;
        let overallTotal = 0;
        let overallChecked = 0;

        CATEGORIES.forEach(cat => {
            cat.items.forEach(item => {
                overallTotal++;
                if (state[item.id]) overallChecked++;

                if (item.isMandatory) {
                    mandatoryTotal++;
                    if (state[item.id]) mandatoryChecked++;
                }
            });
        });
        
        const prog = overallTotal === 0 ? 100 : Math.round((overallChecked / overallTotal) * 100);
        setProgress(prog);
        setIsReady(mandatoryTotal === 0 || mandatoryChecked === mandatoryTotal);
    };

    const getProgressColor = () => {
        if (progress < 40) return 'bg-red-500';
        if (progress < 80) return 'bg-yellow-500';
        if (progress < 100) return 'bg-blue-500';
        return 'bg-green-500';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative animate-scale-in">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header (Fixed) */}
                <div className="p-6 pb-4 border-b border-gray-100 bg-gray-50/80 sticky top-0 z-0">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Pre-flight Checklist</h3>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-lg">
                        Meta's security systems are highly strict. To prevent your Facebook account from being instantly restricted, you MUST meet all criteria before connecting.
                    </p>

                    <div className="mt-5 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Approval Readiness Score</span>
                            <span className={`text-sm font-black ${progress === 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                                {progress}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ease-out ${getProgressColor()}`} 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Checklist */}
                <div className="overflow-y-auto flex-1 p-2">
                    <div className="divide-y divide-gray-100/80">
                {CATEGORIES.map(category => (
                    <div key={category.id} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            {category.icon}
                            <h4 className="text-md font-bold text-gray-800">{category.title}</h4>
                        </div>
                        <div className="space-y-4 pl-8">
                            {category.items.map(item => (
                                <label 
                                    key={item.id} 
                                    className="flex items-start gap-3 cursor-pointer group"
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        {checkedItems[item.id] ? (
                                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                                        )}
                                    </div>
                                    <div>
                                        <div className={`text-sm font-medium flex items-center gap-2 ${checkedItems[item.id] ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {item.label}
                                            {item.isMandatory ? (
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Required</span>
                                            ) : (
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">Optional</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {item.desc}
                                        </div>
                                    </div>
                                    {/* Invisible actual checkbox for accessibility */}
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={!!checkedItems[item.id]} 
                                        onChange={() => toggleItem(item.id)} 
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
                    </div>
                </div>
                {/* Footer (Fixed) */}
                <div className="p-5 bg-gray-50 border-t border-gray-200 flex flex-col items-center justify-center shrink-0">
                    {!isReady ? (
                        <div className="text-center w-full">
                            <p className="text-sm text-amber-600 font-medium mb-3">
                                Please complete all <strong>REQUIRED</strong> items to proceed. Optional items can be done later.
                            </p>
                            <button disabled className="w-full sm:w-auto opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 px-8 py-3 rounded-xl font-bold inline-flex items-center justify-center gap-2">
                                <Facebook className="w-5 h-5" />
                                Connect with Facebook
                            </button>
                        </div>
                    ) : (
                        <div className="text-center animate-fade-in-up w-full">
                            <p className="text-sm text-green-600 font-bold mb-3 flex items-center justify-center gap-1.5">
                                <Check className="w-4 h-4" /> 
                                {progress === 100 ? "Fully optimized! You may now proceed." : "Requirements met. You may proceed!"}
                            </p>
                            <button
                                onClick={onProceed}
                                disabled={fbLoading}
                                className="w-full sm:w-auto px-8 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 text-md disabled:opacity-75 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                            >
                                {fbLoading ? (
                                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                ) : (
                                    <Facebook className="w-5 h-5" />
                                )}
                                {fbLoading ? 'Connecting...' : 'Connect with Facebook'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

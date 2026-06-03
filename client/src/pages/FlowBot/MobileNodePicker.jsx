import React from 'react';
import {
    MessageSquare, MousePointerClick, Clock, UserCheck, Zap,
    List, Image, FileText, MapPin,
    GitBranch, Split, Repeat,
    TextCursorInput, Calendar, Hash,
    Network, Database, Bell, CreditCard, Bot, Info, X
} from 'lucide-react';

const MobileNodePicker = ({ isOpen, onClose, onSelectNode }) => {
    const categories = [
        {
            name: "Messaging & Media",
            blocks: [
                { type: 'messageNode', label: 'Send Message', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
                { type: 'interactiveNode', label: 'Buttons', icon: MousePointerClick, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
                { type: 'listNode', label: 'Interactive List', icon: List, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
                { type: 'mediaNode', label: 'Media/Doc', icon: Image, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800' },
                { type: 'templateNode', label: 'Template', icon: FileText, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
                { type: 'locationNode', label: 'Request Location', icon: MapPin, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
            ]
        },
        {
            name: "Logic & Flow",
            blocks: [
                { type: 'conditionNode', label: 'Condition', icon: GitBranch, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800' },
                { type: 'splitNode', label: 'A/B Split', icon: Split, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' },
                { type: 'jumpNode', label: 'Jump To', icon: Repeat, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' },
                { type: 'delayNode', label: 'Delay', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
            ]
        },
        {
            name: "Data Collection",
            blocks: [
                { type: 'inputTextNode', label: 'Wait for Text', icon: TextCursorInput, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
                { type: 'inputDateNode', label: 'Wait for Date', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
                { type: 'inputNumberNode', label: 'Wait for Number', icon: Hash, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
            ]
        },
        {
            name: "Actions & Integrations",
            blocks: [
                { type: 'actionNode', label: 'Action/Route', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
                { type: 'customFieldNode', label: 'Update Field', icon: Database, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
                { type: 'webhookNode', label: 'API/Webhook', icon: Network, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800' },
                { type: 'notifyNode', label: 'Notify Team', icon: Bell, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
                { type: 'paymentNode', label: 'Payment Link', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
                { type: 'aiNode', label: 'AI Reply', icon: Bot, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800' },
                { type: 'handoffNode', label: 'Human Handoff', icon: UserCheck, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' },
            ]
        }
    ];

    return (
        <div className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            {/* Drawer */}
            <div className={`absolute bottom-0 left-0 w-full h-[85vh] bg-slate-50 dark:bg-slate-900 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="w-full flex justify-center pt-3 pb-1 flex-shrink-0" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full cursor-pointer" />
                </div>
                <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-200 dark:border-slate-800/50 flex-shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Add Module/Block</h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
                    {categories.map((category, idx) => (
                        <div key={idx} className="mb-6">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 ml-1">{category.name}</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {category.blocks.map(block => {
                                    const Icon = block.icon;
                                    return (
                                        <button
                                            key={block.type}
                                            onClick={() => onSelectNode(block.type, block.label)}
                                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border ${block.border} ${block.bg} hover:shadow-md transition-all active:scale-95`}
                                        >
                                            <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm ${block.color}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">{block.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MobileNodePicker;

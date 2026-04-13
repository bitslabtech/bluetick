import React, { useState } from 'react';
import { 
    MessageSquare, MousePointerClick, Clock, UserCheck, Zap, 
    List, Image, FileText, MapPin, 
    GitBranch, Split, Repeat, 
    TextCursorInput, Calendar, Hash, 
    Network, Database, Bell, CreditCard, Bot, Info
} from 'lucide-react';

const FlowSidebar = () => {
    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const categories = [
        {
            name: "Messaging & Media",
            blocks: [
                { type: 'messageNode', label: 'Send Message', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', tooltip: 'Sends a basic text message.' },
                { type: 'interactiveNode', label: 'Buttons', icon: MousePointerClick, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', tooltip: 'Sends up to 3 clickable buttons.' },
                { type: 'listNode', label: 'Interactive List', icon: List, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', tooltip: 'Sends a list with up to 10 selectable items.' },
                { type: 'mediaNode', label: 'Media/Document', icon: Image, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800', tooltip: 'Sends an image, video, audio, or document.' },
                { type: 'templateNode', label: 'Template Message', icon: FileText, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', border: 'border-fuchsia-200 dark:border-fuchsia-800', tooltip: 'Sends a pre-approved WhatsApp template.' },
                { type: 'locationNode', label: 'Request Location', icon: MapPin, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', tooltip: 'Asks the user to share their location pin.' },
            ]
        },
        {
            name: "Logic & Flow",
            blocks: [
                { type: 'conditionNode', label: 'Condition (If/Else)', icon: GitBranch, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', tooltip: 'Splits flow based on a variable value.' },
                { type: 'splitNode', label: 'A/B Split Test', icon: Split, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', tooltip: 'Randomly routes users between 2 paths.' },
                { type: 'jumpNode', label: 'Jump To / Loop', icon: Repeat, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800', tooltip: 'Jumps to another point or flow.' },
                { type: 'delayNode', label: 'Smart Delay', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', tooltip: 'Pauses the flow for a specific time.' },
            ]
        },
        {
            name: "Data Collection",
            blocks: [
                { type: 'inputTextNode', label: 'Wait for Text', icon: TextCursorInput, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800', tooltip: 'Saves the user\'s typed reply to a variable.' },
                { type: 'inputDateNode', label: 'Wait for Date', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', tooltip: 'Waits for a user to input a date.' },
                { type: 'inputNumberNode', label: 'Wait for Number', icon: Hash, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', tooltip: 'Waits for and validates a numeric input.' },
            ]
        },
        {
            name: "Actions & Integrations",
            blocks: [
                { type: 'actionNode', label: 'Action / Routing', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', tooltip: 'Adds or removes user tags.' },
                { type: 'customFieldNode', label: 'Update Field', icon: Database, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', tooltip: 'Updates a database field for the user.' },
                { type: 'webhookNode', label: 'API / Webhook', icon: Network, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800', tooltip: 'Sends HTTP requests to external servers.' },
                { type: 'notifyNode', label: 'Notify Team', icon: Bell, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', tooltip: 'Sends an internal notification.' },
                { type: 'paymentNode', label: 'Payment Link', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', tooltip: 'Generates and sends a payment link.' },
                { type: 'aiNode', label: 'AI Reply', icon: Bot, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', tooltip: 'Uses AI to generate a smart reply.' },
                { type: 'handoffNode', label: 'Human Handoff', icon: UserCheck, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', tooltip: 'Pauses the bot so a human can chat.' },
            ]
        }
    ];

    return (
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm z-10 relative">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex-shrink-0">
                <h3 className="font-semibold text-slate-800 dark:text-white">Blocks</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Drag and drop to build flow</p>
            </div>
            
            <div className="flex-1 overflow-y-auto pb-6">
                {categories.map((category, catIdx) => (
                    <div key={catIdx} className="mb-4">
                        <div className="px-4 py-2 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-100 dark:border-slate-800/50">
                            <h4 className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">{category.name}</h4>
                        </div>
                        <div className="px-3 space-y-2 mt-2">
                            {category.blocks.map((block) => {
                                const Icon = block.icon;
                                return (
                                    <div
                                        key={block.type}
                                        className={`p-2.5 rounded-xl border ${block.border} ${block.bg} cursor-grab active:cursor-grabbing hover:shadow-md transition-all flex items-center gap-3 group`}
                                        onDragStart={(event) => onDragStart(event, block.type)}
                                        draggable
                                    >
                                        <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm ${block.color} group-hover:scale-110 transition-transform`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{block.label}</span>
                                        {block.tooltip && (
                                            <div className="relative group/tooltip">
                                                <Info className="w-4 h-4 text-slate-400 dark:text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
                                                <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[11px] font-medium rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-xl z-50 pointer-events-none">
                                                    {block.tooltip}
                                                    <div className="absolute right-2 bottom-full border-[5px] border-transparent border-b-slate-800 dark:border-b-white" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default FlowSidebar;

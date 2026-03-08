import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUI } from '../../context/UIContext';
import { Edit2, Folder, UploadCloud, Clipboard, Search, Plus, ArrowRight, Lightbulb, ShieldCheck, X, AlertTriangle, TrendingUp, Zap, Lock } from 'lucide-react';

const CampaignStep1 = ({ data, updateData, onNext }) => {
    const navigate = useNavigate();
    const { showToast } = useUI();
    const [searchTerm, setSearchTerm] = useState('');

    // Manual Entry State
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [addToContacts, setAddToContacts] = useState(false);
    const [isProcessingManual, setIsProcessingManual] = useState(false);

    const [recipientGroups, setRecipientGroups] = useState([
        { id: 'all', name: 'All Contacts', count: '...', updated: 'Just now' },
    ]);
    // accountStats: { usage (sent this month), limit (-1=unlimited), contactLimit }
    const [accountStats, setAccountStats] = useState({ usage: 0, limit: -1, planName: '', contactLimit: -1 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [showLockedWarning, setShowLockedWarning] = useState(false);
    const [allContacts, setAllContacts] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingStats(true);
            try {
                // Fetch all contacts
                const contactsRes = await axios.get('http://localhost:5000/api/contacts');
                const allContacts = contactsRes.data;
                const totalCount = allContacts.length;

                // Fetch groups (tags)
                const groupsRes = await axios.get('http://localhost:5000/api/contacts/groups');
                const groups = Array.isArray(groupsRes.data) ? groupsRes.data.map(tag => ({
                    id: tag,
                    name: tag,
                    count: allContacts.filter(c => c.tags && c.tags.includes(tag)).length.toString(),
                    updated: 'Just now'
                })) : [];

                setRecipientGroups([
                    { id: 'all', name: 'All Contacts', count: totalCount.toString(), updated: 'Just now' },
                    ...groups
                ]);

                // Fetch real plan limits from billing API
                const billingRes = await axios.get('http://localhost:5000/api/billing');
                const usage = billingRes.data?.usage;
                setAccountStats({
                    usage: usage?.messagesSent ?? 0,
                    limit: usage?.monthlyLimit ?? -1,
                    planName: billingRes.data?.plan?.name ?? '',
                    contactLimit: usage?.contactLimit ?? -1
                });
                setAllContacts(allContacts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));

            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchData();
    }, []);

    // --- Derived: how many recipients does the current selection represent? ---
    const selectedCount = useMemo(() => {
        let count = 0;
        const recipients = data.recipients || [];
        if (recipients.includes('all')) {
            const allGroup = recipientGroups.find(g => g.id === 'all');
            count += parseInt(allGroup?.count || '0', 10);
        } else {
            for (const id of recipients) {
                const grp = recipientGroups.find(g => g.id === id);
                if (grp) count += parseInt(grp.count || '0', 10);
            }
        }
        count += (data.manualRecipients || []).length;
        return count;
    }, [data.recipients, data.manualRecipients, recipientGroups]);

    // --- Derived: limit status for progress bar ---
    const limitCalc = useMemo(() => {
        const { usage, limit } = accountStats;
        const isUnlimited = limit === -1;
        if (isUnlimited) {
            return { isUnlimited, wouldExceed: false, pastPct: 0, campaignPct: 0, overflowPct: 0, remaining: Infinity };
        }
        const remaining = Math.max(0, limit - usage);
        const wouldExceed = selectedCount > remaining;
        const fitsCount = Math.min(selectedCount, remaining);
        const overflowCount = Math.max(0, selectedCount - remaining);
        const pastPct = Math.min((usage / limit) * 100, 100);
        const campaignPct = (fitsCount / limit) * 100;
        const overflowPct = (overflowCount / limit) * 100;
        return { isUnlimited, wouldExceed, pastPct, campaignPct, overflowPct, remaining, overflowCount };
    }, [accountStats, selectedCount]);

    // --- Derived: Locked Contacts detection ---
    const lockedInfo = useMemo(() => {
        if (accountStats.contactLimit === -1) return { count: 0, hasLocked: false };

        let selectedContactObjects = [];
        const recipientIds = data.recipients || [];

        if (recipientIds.includes('all')) {
            selectedContactObjects = allContacts;
        } else {
            // Get contacts from selected groups
            selectedContactObjects = allContacts.filter(c =>
                c.tags && c.tags.some(tag => recipientIds.includes(tag))
            );
        }

        // A contact is locked if its index in sorted allContacts is >= contactLimit
        const lockedContacts = selectedContactObjects.filter(c => {
            const index = allContacts.findIndex(ac => ac.id === c.id);
            return index >= accountStats.contactLimit;
        });

        return {
            count: lockedContacts.length,
            hasLocked: lockedContacts.length > 0
        };
    }, [allContacts, data.recipients, accountStats.contactLimit]);

    const handleNext = () => {
        if (lockedInfo.hasLocked) {
            setShowLockedWarning(true);
        } else {
            onNext();
        }
    };

    const handleManualSubmit = async () => {
        if (!manualInput.trim()) return;

        // Check for contact limit IF adding to contacts
        if (addToContacts && accountStats.contactLimit !== -1 && allContacts.length >= accountStats.contactLimit) {
            showToast({
                type: 'warning',
                title: 'Limit Reached',
                message: `You cannot add more contacts. Your plan limit is ${accountStats.contactLimit}.`
            });
            return;
        }

        setIsProcessingManual(true);
        try {
            const lines = manualInput.split(/[\n,]+/).map(l => l.trim()).filter(l => l);
            const newRecipients = lines.map(l => {
                const parts = l.split(',');
                if (parts.length > 1) {
                    return { name: parts[0].trim(), phone: parts[1].trim() };
                }
                return { name: 'Guest', phone: parts[0].trim() };
            });

            if (addToContacts) {
                let addedCount = 0;
                for (const rec of newRecipients) {
                    try {
                        await axios.post('http://localhost:5000/api/contacts', {
                            name: rec.name,
                            phone: rec.phone,
                            tags: 'Manual Import'
                        });
                        addedCount++;
                    } catch (e) {
                        console.warn(`Failed to add ${rec.phone}`, e);
                    }
                }
                showToast({ type: 'success', title: 'Contacts Added', message: `Successfully added ${addedCount} contacts.` });
                updateData({ recipients: [...(data.recipients || []), 'all'] });
            } else {
                updateData({ manualRecipients: [...(data.manualRecipients || []), ...newRecipients] });
            }

            setShowManualModal(false);
            setManualInput('');
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Error', message: "Error processing input" });
        } finally {
            setIsProcessingManual(false);
        }
    };

    const handleGroupSelection = (groupId, isChecked) => {
        let newRecipients = [...(data.recipients || [])];

        if (isChecked) {
            if (groupId === 'all') {
                // If checking 'all', remove specific groups if any exist
                if (newRecipients.length > 0) {
                    showToast({ type: 'info', title: 'Selection Updated', message: "Selecting 'All Contacts' will deselect specific groups." });
                }
                newRecipients = ['all'];
            } else {
                // If checking a specific group
                if (newRecipients.includes('all')) {
                    showToast({ type: 'info', title: 'Selection Updated', message: "Selecting a specific group will deselect 'All Contacts'." });
                    newRecipients = [groupId]; // Remove 'all' and add this one
                } else {
                    newRecipients.push(groupId);
                }
            }
        } else {
            // Unchecking
            newRecipients = newRecipients.filter(id => id !== groupId);
        }

        updateData({ recipients: newRecipients });
    };

    return (
        <div className="flex flex-col gap-8 h-full fade-in">
            {/* Step Header */}
            {/* Step Header */}
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 dark:border-surface-dark pb-6 transition-colors duration-300">
                {/* Title Section */}
                <div className="w-full md:w-auto z-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Compose Message</h1>
                    <p className="text-slate-500 dark:text-text-secondary mt-1">Define campaign details and select your target audience.</p>
                </div>

                {/* Centered Stepper */}
                <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 flex justify-center z-0">
                    <div className="bg-white/80 dark:bg-surface-dark/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl flex items-center gap-1 shadow-sm dark:shadow-2xl ring-1 ring-slate-100 dark:ring-white/5 transition-colors duration-300">
                        {/* Step 1: Active */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary rounded-xl shadow-lg shadow-primary/20 ring-1 ring-primary/50 transition-all">
                            <span className="flex items-center justify-center size-5 bg-white text-primary rounded-full text-[10px] font-bold">1</span>
                            <span className="text-xs font-bold text-white">Info</span>
                        </div>

                        <div className="w-8 h-[2px] bg-slate-200 dark:bg-white/10 rounded-full mx-1"></div>

                        {/* Step 2: Inactive */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl opacity-50 grayscale transition-all">
                            <span className="flex items-center justify-center size-5 bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white rounded-full text-[10px] font-bold border border-slate-300 dark:border-white/10">2</span>
                            <span className="text-xs font-bold text-slate-500 dark:text-white hidden sm:block">Template</span>
                        </div>

                        <div className="w-8 h-[2px] bg-slate-200 dark:bg-white/10 rounded-full mx-1"></div>

                        {/* Step 3: Inactive */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl opacity-50 grayscale transition-all">
                            <span className="flex items-center justify-center size-5 bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white rounded-full text-[10px] font-bold border border-slate-300 dark:border-white/10">3</span>
                            <span className="text-xs font-bold text-slate-500 dark:text-white hidden sm:block">Schedule</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Form & Lists */}
                <div className="xl:col-span-2 flex flex-col gap-8">
                    {/* Campaign Info Card */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm transition-colors duration-300">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                <Edit2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Campaign Info</h3>
                                <p className="text-xs text-slate-500 dark:text-text-secondary">Basic details for internal tracking</p>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-2">Campaign Name <span className="text-red-400">*</span></label>
                                <input
                                    autoFocus
                                    value={data.name}
                                    onChange={(e) => updateData({ name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-gray-600 transition-all outline-none"
                                    placeholder="e.g. Summer Sale Announcement 2024"
                                    type="text"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-2">Description (Optional)</label>
                                <input
                                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-gray-600 transition-all outline-none"
                                    placeholder="Internal notes, e.g. Q3 Re-engagement Batch A"
                                    type="text"
                                    value={data.description}
                                    onChange={(e) => updateData({ description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-2">Tag (Optional)</label>
                                <input
                                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-gray-600 transition-all outline-none"
                                    placeholder="e.g. #summer"
                                    type="text"
                                    value={data.tag || ''}
                                    onChange={(e) => updateData({ tag: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Recipients Card */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col shadow-sm transition-colors duration-300">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                            <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                <Folder className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Recipients</h3>
                                <p className="text-xs text-slate-500 dark:text-text-secondary">Select who will receive this message</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 pt-6 pb-2">
                            <div className="flex bg-slate-100 dark:bg-background-dark p-1 rounded-xl w-full sm:w-fit border border-slate-200 dark:border-white/10">
                                <button className="flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-surface-dark shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center gap-2 transition-all">
                                    <Folder className="w-4 h-4" />
                                    Saved Groups
                                </button>
                                <button
                                    onClick={() => navigate('/contacts', { state: { openImportModal: true } })}
                                    className="flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <UploadCloud className="w-4 h-4" />
                                    Upload CSV
                                </button>
                                <button
                                    onClick={() => setShowManualModal(true)}
                                    className="flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Clipboard className="w-4 h-4" />
                                    Enter Manually
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="p-6 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-gray-600 transition-all outline-none"
                                    placeholder="Search for contact groups..."
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {recipientGroups.map((group) => (
                                    <label key={group.id} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all group relative ${data.recipients?.includes(group.id) ? 'bg-primary/10 border-primary' : 'bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-white/10 hover:border-primary/50'}`}>
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-0 cursor-pointer accent-primary"
                                                checked={data.recipients?.includes(group.id)}
                                                onChange={(e) => handleGroupSelection(group.id, e.target.checked)}
                                            />
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <div className="flex justify-between items-start">
                                                <span className={`font-bold text-sm transition-colors ${data.recipients?.includes(group.id) ? 'text-primary' : 'text-slate-900 dark:text-white group-hover:text-primary'}`}>{group.name}</span>
                                                <span className="text-[10px] font-bold bg-white dark:bg-surface-dark text-slate-500 dark:text-text-secondary px-2 py-1 rounded-md border border-slate-200 dark:border-white/5">{group.count}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-text-secondary mt-1">Updated: {group.updated}</span>
                                        </div>
                                    </label>
                                ))}
                                {/* Manual Recipients Display */}
                                {data.manualRecipients?.length > 0 && (
                                    <div className="p-4 rounded-xl border border-primary/50 bg-primary/5">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-sm text-primary">Manually Added</span>
                                            <span className="text-[10px] font-bold bg-white dark:bg-surface-dark text-slate-500 dark:text-text-secondary px-2 py-1 rounded-md border border-slate-200 dark:border-white/5">{data.manualRecipients.length}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">Temporary list for this campaign</p>
                                    </div>
                                )}
                                <button
                                    onClick={() => navigate('/contacts', { state: { openGroupManager: true } })}
                                    className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-transparent cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-text-secondary transition-colors h-full min-h-[80px]"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span className="font-medium text-sm">Create New Group</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions & Preview */}
                {/* Right Column: Actions */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Quick Tips */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm transition-colors duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500">
                                <Lightbulb className="w-5 h-5" />
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-sm">Campaign Tips</h3>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-xs text-slate-500 dark:text-text-secondary leading-relaxed">
                                <span className="text-primary font-bold">•</span>
                                Avoid using "Free" or "Winner" excessively to prevent spam flagging.
                            </li>
                            <li className="flex gap-3 text-xs text-slate-500 dark:text-text-secondary leading-relaxed">
                                <span className="text-primary font-bold">•</span>
                                Keep your audience groups targeted for higher engagement rates.
                            </li>
                            <li className="flex gap-3 text-xs text-slate-500 dark:text-text-secondary leading-relaxed">
                                <span className="text-primary font-bold">•</span>
                                Personalize messages using variables like {'{{name}}'} in the next step.
                            </li>
                        </ul>
                    </div>

                    {/* Account Limits - Live Interactive Panel */}
                    <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-300 ${limitCalc.wouldExceed
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50'
                        : selectedCount > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/5'
                        }`}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-lg transition-colors ${limitCalc.wouldExceed ? 'bg-red-500/15 text-red-500' :
                                    selectedCount > 0 ? 'bg-emerald-500/15 text-emerald-500' :
                                        'bg-blue-500/15 text-blue-500'
                                    }`}>
                                    {limitCalc.wouldExceed ? <AlertTriangle className="w-4 h-4" /> :
                                        selectedCount > 0 ? <TrendingUp className="w-4 h-4" /> :
                                            <ShieldCheck className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-sm">Account Limits</h3>
                                    {accountStats.planName && (
                                        <p className="text-[10px] text-slate-400 dark:text-text-secondary">{accountStats.planName} Plan</p>
                                    )}
                                </div>
                            </div>
                            {limitCalc.isUnlimited && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                                    <Zap className="w-3 h-3" /> Unlimited
                                </span>
                            )}
                        </div>

                        {loadingStats ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full w-full" />
                                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full w-2/3" />
                            </div>
                        ) : limitCalc.isUnlimited ? (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">No message limit on your plan. Send freely!</p>
                        ) : (
                            <div className="space-y-3">
                                {/* Quota numbers */}
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-slate-500 dark:text-text-secondary">Monthly Limit</span>
                                    <span className={`text-xs font-bold tabular-nums ${limitCalc.wouldExceed ? 'text-red-500' : 'text-slate-900 dark:text-white'
                                        }`}>
                                        {(accountStats.usage + selectedCount).toLocaleString()}
                                        <span className="text-slate-400 dark:text-text-secondary font-normal"> / {accountStats.limit.toLocaleString()}</span>
                                    </span>
                                </div>

                                {/* 3-segment stacked progress bar */}
                                <div className="h-3 w-full bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden flex shadow-inner">
                                    {/* BLUE: past usage */}
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500 ease-out flex-shrink-0"
                                        style={{ width: `${limitCalc.pastPct}%` }}
                                        title={`Already sent: ${accountStats.usage.toLocaleString()}`}
                                    />
                                    {/* GREEN: this campaign (fits) */}
                                    {limitCalc.campaignPct > 0 && (
                                        <div
                                            className="h-full bg-emerald-400 transition-all duration-500 ease-out flex-shrink-0"
                                            style={{ width: `${limitCalc.campaignPct}%` }}
                                            title={`This campaign (fits): ${Math.min(selectedCount, accountStats.limit - accountStats.usage).toLocaleString()}`}
                                        />
                                    )}
                                    {/* RED: overflow */}
                                    {limitCalc.overflowPct > 0 && (
                                        <div
                                            className="h-full bg-red-500 animate-pulse transition-all duration-500 ease-out flex-shrink-0"
                                            style={{ width: `${Math.min(limitCalc.overflowPct, 100 - limitCalc.pastPct - limitCalc.campaignPct)}%` }}
                                            title={`Over limit: ${limitCalc.overflowCount?.toLocaleString()}`}
                                        />
                                    )}
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-text-secondary">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                        Past ({accountStats.usage.toLocaleString()})
                                    </span>
                                    {selectedCount > 0 && (
                                        <span className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-text-secondary">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                            Campaign ({Math.min(selectedCount, limitCalc.remaining).toLocaleString()})
                                        </span>
                                    )}
                                    {limitCalc.wouldExceed && (
                                        <span className="flex items-center gap-1.5 text-[10px] text-red-500 font-semibold">
                                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                            Over limit ({limitCalc.overflowCount?.toLocaleString()})
                                        </span>
                                    )}
                                </div>

                                {/* Status message */}
                                {limitCalc.wouldExceed ? (
                                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-400/30 rounded-xl px-3 py-2.5 mt-1">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-[11px] text-red-600 dark:text-red-400 font-medium leading-snug">
                                            This campaign needs <strong>{selectedCount.toLocaleString()}</strong> messages but you only have <strong>{limitCalc.remaining.toLocaleString()}</strong> remaining. Reduce recipients or upgrade your plan.
                                        </p>
                                    </div>
                                ) : selectedCount > 0 ? (
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        ✓ {selectedCount.toLocaleString()} message{selectedCount !== 1 ? 's' : ''} fit within your remaining monthly limit.
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-slate-400 dark:text-text-secondary">
                                        {limitCalc.remaining.toLocaleString()} messages remaining this month. Limit resets in {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} days.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-lg transition-colors duration-300">
                        <h3 className="font-bold text-xs mb-4 uppercase tracking-wider text-slate-500 dark:text-text-secondary">Actions</h3>
                        <div className="space-y-3">
                            <button
                                onClick={handleNext}
                                disabled={
                                    !data.name ||
                                    ((data.recipients || []).length === 0 && (data.manualRecipients || []).length === 0) ||
                                    (!limitCalc.isUnlimited && limitCalc.wouldExceed)
                                }
                                className={`w-full py-4 text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group ${(!data.name || ((data.recipients || []).length === 0 && (data.manualRecipients || []).length === 0) || (!limitCalc.isUnlimited && limitCalc.wouldExceed))
                                    ? 'bg-slate-300 dark:bg-gray-700/50 cursor-not-allowed text-slate-500 dark:text-gray-400 shadow-none'
                                    : 'bg-primary hover:bg-blue-600 shadow-blue-500/20 active:scale-95'
                                    }`}
                            >
                                {!limitCalc.isUnlimited && limitCalc.wouldExceed ? (
                                    <><AlertTriangle className="w-4 h-4" /> Limit Exceeded</>
                                ) : (
                                    <>Next Step <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </div>
                        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-text-secondary">
                                <span>Selected Recipients</span>
                                <span className="text-slate-900 dark:text-white font-bold text-sm tabular-nums">
                                    {selectedCount.toLocaleString()}
                                </span>
                            </div>
                            {!limitCalc.isUnlimited && (
                                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-text-secondary">
                                    <span>Remaining Monthly Limit</span>
                                    <span className={`font-bold text-sm tabular-nums ${limitCalc.remaining === 0 ? 'text-red-500' :
                                        limitCalc.remaining < 20 ? 'text-amber-500' :
                                            'text-slate-900 dark:text-white'
                                        }`}>
                                        {limitCalc.remaining === Infinity ? '∞' : limitCalc.remaining.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {showManualModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-colors duration-300">
                        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enter Manually</h3>
                            <button
                                onClick={() => setShowManualModal(false)}
                                className="text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <p className="text-sm text-slate-500 dark:text-text-secondary">Enter phone numbers (with country code). Optionally separate Name and Phone with a comma.</p>
                            <div className="bg-slate-100 dark:bg-background-dark/50 p-2 rounded text-xs text-slate-600 dark:text-text-secondary font-mono border border-slate-200 dark:border-white/5">
                                Example:<br />
                                +1234567890<br />
                                John Doe, +1987654321
                            </div>
                            <textarea
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                rows={8}
                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                                placeholder="Paste numbers here..."
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="addToContactCheck"
                                    className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-0 cursor-pointer accent-primary"
                                    checked={addToContacts}
                                    onChange={(e) => setAddToContacts(e.target.checked)}
                                />
                                <label htmlFor="addToContactCheck" className="text-sm text-slate-700 dark:text-white cursor-pointer select-none">
                                    Add these numbers to my contacts
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowManualModal(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleManualSubmit}
                                    disabled={isProcessingManual || !manualInput.trim()}
                                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessingManual ? 'Processing...' : 'Add Recipients'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Locked Contacts Warning Modal */}
            {showLockedWarning && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="bg-amber-500/20 size-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Locked Contacts Detected</h3>
                        <p className="text-sm text-slate-500 dark:text-text-secondary mb-6 leading-relaxed">
                            Your selection includes <strong>{lockedInfo.count}</strong> locked contacts that exceed your plan's limit.
                            These contacts will be <strong>automatically excluded</strong> from the campaign until you upgrade.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => { setShowLockedWarning(false); onNext(); }}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                            >
                                Continue anyway
                            </button>
                            <button
                                onClick={() => navigate('/billing')}
                                className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                            >
                                ⚡ Upgrade Plan
                            </button>
                            <button
                                onClick={() => setShowLockedWarning(false)}
                                className="w-full py-2 text-slate-500 dark:text-text-secondary text-xs font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Go back
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignStep1;

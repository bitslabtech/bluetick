import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';
import {
    Search, Filter, Tag, LayoutGrid, List, Users, CheckCircle, Ban,
    FolderCog, Upload, UserPlus, MoreVertical, Trash2, FolderPlus, Download,
    ChevronLeft, ChevronRight, Menu, HelpCircle, Bell, User, UploadCloud, Plus,
    X, MessageSquare, Clock, CheckCircle2, ChevronDown, AlertCircle, Tags, Lock, AlertTriangle, Phone
} from 'lucide-react';
import ManageLabelsModal from '../components/ManageLabelsModal';

const groupColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Rose', value: '#F43F5E' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Emerald', value: '#10B981' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Slate', value: '#64748B' },
];

// ── VCF (vCard) client-side parser — no npm package needed ──────────────
const parseVCF = (text) => {
    const cards = text.split(/BEGIN:VCARD/i).slice(1);
    return cards.map(card => {
        const lines = card.split(/\r?\n/);
        let name = '', phone = '', email = '';
        for (const line of lines) {
            if (/^FN[;:]/i.test(line) && !name)
                name = line.split(':').slice(1).join(':').trim();
            else if (/^TEL[;:]/i.test(line) && !phone)
                phone = line.split(':').slice(1).join(':').replace(/[\s\-\(\)]/g, '').trim();
            else if (/^EMAIL[;:]/i.test(line) && !email)
                email = line.split(':').slice(1).join(':').trim();
        }
        return { name, phone, email };
    }).filter(c => c.name || c.phone);
};

// ── CSV flexible column normaliser — matches common header variations ─────
const normaliseCSVRow = (row) => {
    const find = (patterns) => {
        const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
        return key ? String(row[key] || '').trim() : '';
    };
    return {
        name: find([/^name$/i, /^full.?name$/i, /^contact.?name$/i, /^first.?name$/i]),
        phone: find([/^phone$/i, /^mobile$/i, /^tel/i, /^number$/i, /^whatsapp$/i, /^cell$/i]),
        email: find([/^email$/i, /^e-mail$/i, /^mail$/i]),
    };
};

const Contacts = () => {
    const location = useLocation();
    const { showModal, showToast } = useUI();
    const { user } = useAuth();
    const teamPolicy = user?.teamPolicy || { inboxVisibility: 'see_all', phonePrivacy: 'visible' };
    const isSubMember = !!user?.parentUserId;

    const renderName = (name, phone) => {
        const isActuallyPhone = !name || name === phone || /^\d+$/.test(name.replace(/\D/g, ''));
        if (isActuallyPhone && isSubMember) {
            if (teamPolicy.phonePrivacy === 'blurred') return <span className="blur-sm select-none">{phone || name}</span>;
            if (teamPolicy.phonePrivacy === 'masked') return `****${(phone || name)?.slice(-4)}`;
        }
        return name || phone;
    };
    // Mock Data matching the design
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false); // kept for backward compat
    const [showContactModal, setShowContactModal] = useState(false); // unified add/import modal
    const [contactModalTab, setContactModalTab] = useState('file'); // 'file' | 'google' | 'manual'
    const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', tags: '', labelId: '' });
    const [showGroupsModal, setShowGroupsModal] = useState(false);
    const [availableGroups, setAvailableGroups] = useState([]);
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [contactLimit, setContactLimit] = useState(-1);
    const [editingContact, setEditingContact] = useState(null); // for edit modal
    const navigate = useNavigate();

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalContacts, setTotalContacts] = useState(0);
    const limit = 50;

    // Label & Group Picker States for Slide-over
    const [availableLabels, setAvailableLabels] = useState([]);
    const [showLabelsModal, setShowLabelsModal] = useState(false);
    const [showLabelPickerFor, setShowLabelPickerFor] = useState(null); // contact id
    const [showGroupPickerFor, setShowGroupPickerFor] = useState(null); // contact id
    const [isUpdatingLabel, setIsUpdatingLabel] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSearch, setTempSearch] = useState(''); // debounced search
    const [statusFilter, setStatusFilter] = useState('All');
    const [groupFilter, setGroupFilter] = useState('All');
    const [labelFilter, setLabelFilter] = useState('All');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

    // Filtered Contacts Logic
    // We now filter on backend, so filteredContacts is just contacts
    const filteredContacts = contacts;

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, statusFilter, groupFilter, labelFilter]);

    // Debounce search input
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSearchTerm(tempSearch);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [tempSearch]);

    // Group Management States
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null); // null = none, object = editing
    const [groupForm, setGroupForm] = useState({ name: '', description: '', color: '#3B82F6' });

    const fetchGroups = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/groups`);
            setAvailableGroups(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // CRUD Handlers
    const handleSaveGroup = async () => {
        try {
            if (editingGroup) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/groups/${editingGroup.id}`, groupForm);
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/groups`, groupForm);
            }
            fetchGroups();
            setEditingGroup(null);
            setShowGroupsModal(false);
            setGroupForm({ name: '', description: '', color: '#3B82F6' });
        } catch (err) {
            alert('Error saving group: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteGroup = async (id) => {
        showModal({
            type: 'warning',
            title: 'Delete Group',
            message: 'Are you sure? This will delete the group from the list, but not contacts.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL}/api/groups/${id}`);
                    fetchGroups();
                    showToast({ type: 'success', title: 'Group Deleted', message: 'Group deleted successfully' });
                } catch (err) {
                    showToast({ type: 'error', title: 'Error', message: err.message });
                }
            }
        });
    };

    useEffect(() => {
        if (showGroupsModal) {
            fetchGroups();
        }
    }, [showGroupsModal]);

    // Fetch Contacts, Groups, Labels
    const fetchContacts = async (forcePage) => {
        try {
            setLoading(true);
            const currentPage = forcePage || page;
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/contacts`, {
                params: {
                    page: currentPage,
                    limit: limit,
                    search: searchTerm,
                    status: statusFilter,
                    group: groupFilter,
                    label: labelFilter
                }
            });
            setContacts(res.data.contacts);
            setTotalPages(res.data.totalPages);
            setTotalContacts(res.data.total);
            setPage(res.data.currentPage);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLabels = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/labels`);
            setAvailableLabels(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchBilling = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/billing`);
            setContactLimit(res.data?.usage?.contactLimit ?? -1);
        } catch (err) {
            console.error('Failed to fetch billing info:', err);
        }
    };

    useEffect(() => {
        fetchContacts();
        fetchGroups();
        fetchLabels();
        fetchBilling();
    }, [page, searchTerm, statusFilter, groupFilter, labelFilter]);

    useEffect(() => {
        if (!showLabelsModal) {
            fetchLabels(); // Re-fetch on close
            fetchContacts(); // Get updated labels for contacts
        }
    }, [showLabelsModal]);

    useEffect(() => {
        if (location.state?.openGroupManager) {
            setShowGroupsModal(true);
            window.history.replaceState({}, document.title);
        }
        if (location.state?.openAddContact) {
            setContactModalTab('manual');
            setShowContactModal(true);
            window.history.replaceState({}, document.title);
        }
        if (location.state?.openImportModal) {
            setContactModalTab('file');
            setShowContactModal(true);
            window.history.replaceState({}, document.title);
        }
        // Handle Google OAuth callback redirect
        const params = new URLSearchParams(window.location.search);
        if (params.get('import') === 'google') {
            const count = params.get('count') || 0;
            showToast({ type: 'success', title: 'Google Import Complete', message: `${count} contacts imported from Google Contacts.` });
            fetchContacts();
            window.history.replaceState({}, '', '/contacts');
        }
    }, [location]);

    // Add/Edit Contact Handler
    const handleAddContact = async (e) => {
        e.preventDefault();
        try {
            const tagsArray = typeof newContact.tags === 'string'
                ? newContact.tags.split(',').map(t => t.trim()).filter(t => t)
                : newContact.tags;

            let labelsArray = [];
            if (newContact.labelId) {
                const selectedLabel = availableLabels.find(l => l.id === newContact.labelId);
                if (selectedLabel) {
                    labelsArray = [{ id: selectedLabel.id, name: selectedLabel.name, color: selectedLabel.color }];
                }
            }

            if (editingContact) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/contacts/${editingContact.id}`, {
                    ...newContact,
                    tags: tagsArray,
                    labels: labelsArray
                });
                showToast({ type: 'success', title: 'Contact Updated', message: 'Contact details updated successfully.' });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/contacts`, {
                    ...newContact,
                    tags: tagsArray,
                    labels: labelsArray
                });
                showToast({ type: 'success', title: 'Contact Added', message: 'New contact added successfully.' });
            }

            setShowAddModal(false);
            setShowContactModal(false); // close unified modal if add was triggered from there
            setEditingContact(null);
            setNewContact({ name: '', phone: '', email: '', tags: '', labelId: '' });
            fetchContacts();
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Error saving contact: ' + (err.response?.data?.error || err.message) });
        }
    };

    const handleDeleteContact = async (contact) => {
        showModal({
            type: 'warning',
            title: 'Delete Contact',
            message: `Are you sure you want to delete ${contact.name}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL}/api/contacts/${contact.id}`);
                    setViewingContact(null);
                    fetchContacts();
                    showToast({ type: 'success', title: 'Contact Deleted', message: 'Contact has been removed.' });
                } catch (err) {
                    showToast({ type: 'error', title: 'Error', message: 'Failed to delete contact: ' + (err.message) });
                }
            }
        });
    };

    const [selectedIds, setSelectedIds] = useState([]);
    const [viewingContact, setViewingContact] = useState(null);
    const contactPanelRef = useRef(null);

    // Handle ESC and Click-Outside for Contact details slide-over
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && viewingContact) {
                setViewingContact(null);
            }
        };

        const handleClickOutside = (e) => {
            if (viewingContact && contactPanelRef.current && !contactPanelRef.current.contains(e.target)) {
                // If they clicked on a contact row/card, let the onClick handle it to prevent open/close loops
                if (!e.target.closest('.contact-trigger')) {
                    setViewingContact(null);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [viewingContact]);

    // Individual Contact Update Handlers
    const handleToggleLabel = async (contact, label) => {
        setIsUpdatingLabel(true);
        try {
            const currentLabels = contact.labels || [];
            const hasLabel = currentLabels.some(l => l.id === label.id);
            const updatedLabels = hasLabel ? [] : [{ id: label.id, name: label.name, color: label.color }];

            await axios.put(`${import.meta.env.VITE_API_URL}/api/contacts/${contact.id}`, {
                labels: updatedLabels
            });

            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, labels: updatedLabels } : c));
            if (viewingContact && viewingContact.id === contact.id) {
                setViewingContact({ ...viewingContact, labels: updatedLabels });
            }
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to update label' });
        } finally {
            setIsUpdatingLabel(false);
            setShowLabelPickerFor(null);
        }
    };

    const handleToggleGroup = async (contact, groupName) => {
        try {
            const currentTags = contact.tags || [];
            const hasGroup = currentTags.includes(groupName);
            const updatedTags = hasGroup ? currentTags.filter(t => t !== groupName) : [...currentTags, groupName];

            await axios.put(`${import.meta.env.VITE_API_URL}/api/contacts/${contact.id}`, {
                tags: updatedTags
            });

            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, tags: updatedTags } : c));
            if (viewingContact && viewingContact.id === contact.id) {
                setViewingContact({ ...viewingContact, tags: updatedTags });
            }
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to update group' });
        }
    };

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        showModal({
            type: 'warning',
            title: 'Delete Contacts',
            message: `Are you sure you want to delete ${selectedIds.length} contacts? This cannot be undone.`,
            confirmText: 'Delete All',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.post(`${import.meta.env.VITE_API_URL}/api/contacts/bulk-delete`, { ids: selectedIds });
                    fetchContacts();
                    setSelectedIds([]);
                    showToast({ type: 'success', title: 'Contacts Deleted', message: 'Selected contacts have been deleted.' });
                } catch (err) {
                    showToast({ type: 'error', title: 'Error', message: 'Error deleting contacts: ' + (err.response?.data?.error || err.message) });
                }
            }
        });
    };

    const handleBulkAddToGroup = async (groupName) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/contacts/bulk-tag`, { ids: selectedIds, tag: groupName });
            fetchContacts();
            showToast({ type: 'success', title: 'Group Updated', message: `Added ${selectedIds.length} contacts to "${groupName}"` });
            setShowGroupsModal(false);
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Error adding to group: ' + (err.response?.data?.error || err.message) });
        }
    };

    // Helper to open group picker for bulk action
    const [showBulkGroupPicker, setShowBulkGroupPicker] = useState(false);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(contacts.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };


    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-300">
            {/* Header */}
            <header className="hidden md:flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300 sticky top-0 z-10">
                <div className="flex items-center gap-6 w-full">
                    {/* Search Bar relocated to Filters */}
                    <div></div>
                </div>
                <div className="flex items-center gap-4">

                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 hide-scrollbar">
                <div className="w-full flex flex-col gap-6">

                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-text-secondary mb-1">
                                <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors">Dashboard</span>
                                <span>/</span>
                                <span className="text-slate-900 dark:text-white font-medium">Contacts</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manage Contacts</h1>
                            <p className="text-slate-500 dark:text-text-secondary text-sm">View, filter and manage your subscriber list for campaigns.</p>
                        </div>
                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <button onClick={() => setShowLabelsModal(true)} className="flex-1 md:flex-none items-center justify-center h-10 px-4 rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-surface-dark text-slate-700 dark:text-white text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#2f455a] transition-colors gap-2 shadow-sm flex">
                                <Tags className="w-4 h-4" />
                                <span className="hidden sm:inline">Manage Tags</span>
                                <span className="sm:hidden">Tags</span>
                            </button>
                            <button onClick={() => setShowGroupsModal(true)} className="flex-1 md:flex-none items-center justify-center h-10 px-4 rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-surface-dark text-slate-700 dark:text-white text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#2f455a] transition-colors gap-2 shadow-sm flex">
                                <FolderCog className="w-4 h-4" />
                                <span className="hidden sm:inline">Manage Groups</span>
                                <span className="sm:hidden">Groups</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (contacts.length >= contactLimit && contactLimit !== -1) {
                                        showToast({ type: 'warning', title: 'Limit Reached', message: 'You have reached your contact limit. Upgrade to add more.' });
                                    } else {
                                        setContactModalTab('file');
                                        setShowContactModal(true);
                                    }
                                }}
                                className={`flex-1 md:flex-none justify-center ${contacts.length >= contactLimit && contactLimit !== -1 ? 'opacity-50 cursor-not-allowed shadow-none' : 'shadow-lg shadow-blue-500/20 active:scale-95'} bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all`}
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Contact</span>
                                <span className="sm:hidden">Add</span>
                            </button>
                        </div>
                    </div>

                    {/* Warning Banner */}
                    {contactLimit !== -1 && contacts.length > contactLimit && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                                <div>
                                    <h4 className="text-amber-500 font-bold text-sm">Contact Limit Exceeded</h4>
                                    <p className="text-amber-500/80 text-xs text-left">
                                        You have <strong>{contacts.length}</strong> contacts but your plan allows <strong>{contactLimit}</strong>.
                                        {contacts.length - contactLimit} contacts are currently locked and excluded from campaigns.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/billing')}
                                className="bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors shrink-0"
                            >
                                ⚡ Upgrade Plan
                            </button>
                        </div>
                    )}

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4 shadow-sm transition-colors duration-300">
                            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-500 dark:text-text-secondary text-[10px] sm:text-xs font-medium uppercase tracking-wider leading-tight">Total Contacts</p>
                                <p className="text-slate-900 dark:text-white text-lg sm:text-xl font-bold mt-1 sm:mt-0">{totalContacts}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4 shadow-sm transition-colors duration-300">
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-500 dark:text-red-400">
                                <Ban className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-500 dark:text-text-secondary text-[10px] sm:text-xs font-medium uppercase tracking-wider leading-tight">Invalid</p>
                                <p className="text-slate-900 dark:text-white text-lg sm:text-xl font-bold mt-1 sm:mt-0">{contacts.filter(c => c.status === 'Invalid').length}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4 shadow-sm transition-colors duration-300">
                            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                                <Tags className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-500 dark:text-text-secondary text-[10px] sm:text-xs font-medium uppercase tracking-wider leading-tight">Tags</p>
                                <p className="text-slate-900 dark:text-white text-lg sm:text-xl font-bold mt-1 sm:mt-0">{availableLabels.length}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4 shadow-sm transition-colors duration-300">
                            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500 dark:text-purple-400">
                                <Tag className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-500 dark:text-text-secondary text-[10px] sm:text-xs font-medium uppercase tracking-wider leading-tight">Groups</p>
                                <p className="text-slate-900 dark:text-white text-lg sm:text-xl font-bold mt-1 sm:mt-0">{availableGroups.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors duration-300">
                        {/* Search Bar & View Mode */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex-1 sm:w-64 flex items-center rounded-lg bg-slate-100 dark:bg-background-dark h-10 px-3 border border-transparent focus-within:border-primary transition-colors">
                                <Search className="w-5 h-5 text-slate-400 dark:text-text-secondary shrink-0" />
                                <input
                                    value={tempSearch}
                                    onChange={(e) => setTempSearch(e.target.value)}
                                    className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-secondary text-sm focus:outline-none ml-2 min-w-0"
                                    placeholder="Search contacts..."
                                />
                            </div>
                            
                            <div className="flex items-center bg-slate-100 dark:bg-background-dark rounded-lg p-1 shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-surface-dark shadow-sm text-primary' : 'bg-transparent text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-surface-dark shadow-sm text-primary' : 'bg-transparent text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    <List className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                            <div className="relative shrink-0">
                                <Filter className="absolute left-3 top-2.5 text-slate-400 dark:text-text-secondary w-4 h-4 pointer-events-none" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="appearance-none bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-white text-sm font-medium pl-9 pr-0 py-2 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-white/10 focus:outline-none focus:border-primary focus:ring-0 cursor-pointer transition-colors"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Valid">Valid</option>
                                    <option value="Invalid">Invalid</option>
                                    <option value="Unknown">Pending Check</option>
                                </select>
                            </div>

                            <div className="relative shrink-0">
                                <Tag className="absolute left-3 top-2.5 text-slate-400 dark:text-text-secondary w-4 h-4 pointer-events-none" />
                                <select
                                    value={groupFilter}
                                    onChange={(e) => setGroupFilter(e.target.value)}
                                    className="appearance-none bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-white text-sm font-medium pl-9 pr-0 py-2 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-white/10 focus:outline-none focus:border-primary focus:ring-0 cursor-pointer transition-colors"
                                >
                                    <option value="All">All Groups</option>
                                    {availableGroups.map(g => (
                                        <option key={g.id} value={g.name}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative shrink-0">
                                <Tags className="absolute left-3 top-2.5 text-slate-400 dark:text-text-secondary w-4 h-4 pointer-events-none" />
                                <select
                                    value={labelFilter}
                                    onChange={(e) => setLabelFilter(e.target.value)}
                                    className="appearance-none bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-white text-sm font-medium pl-9 pr-0 py-2 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-white/10 focus:outline-none focus:border-primary focus:ring-0 cursor-pointer transition-colors"
                                >
                                    <option value="All">All Tags</option>
                                    {availableLabels.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact List View */}
                    {viewMode === 'list' ? (
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden shadow-sm transition-colors duration-300">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm table-fixed md:table-auto">
                                    <thead className="bg-slate-50 dark:bg-background-dark/50 text-slate-500 dark:text-text-secondary font-semibold border-b border-slate-200 dark:border-white/5">
                                        <tr>
                                            <th className="px-1 md:px-6 py-4 w-8 md:w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 dark:border-gray-600 bg-white dark:bg-background-dark text-primary focus:ring-0 focus:ring-offset-0 size-4"
                                                    checked={selectedIds.length === contacts.length && contacts.length > 0}
                                                    onChange={handleSelectAll}
                                                />
                                            </th>
                                            <th className="pl-3 pr-1 md:px-6 py-4 w-auto">Name</th>
                                            <th className="hidden md:table-cell px-4 md:px-6 py-4">Phone Number</th>
                                            <th className="px-1 md:px-6 py-4 w-[35%] md:w-auto">Tags</th>
                                            <th className="hidden md:table-cell px-4 md:px-6 py-4">Group</th>
                                            <th className="hidden md:table-cell px-4 md:px-6 py-4">Status</th>
                                            <th className="hidden md:table-cell px-2 md:px-6 py-4 w-8 md:w-12 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-200">
                                        {filteredContacts.map((contact, index) => {
                                            const actualIndex = (page - 1) * limit + index;
                                            const isLocked = contactLimit !== -1 && actualIndex >= contactLimit;
                                            return (
                                                <tr
                                                    key={contact.id}
                                                    onClick={() => {
                                                        if (isLocked) return;
                                                        if (viewingContact?.id === contact.id) setViewingContact(null);
                                                        else setViewingContact(contact);
                                                    }}
                                                    className={`contact-trigger hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group ${isLocked ? 'cursor-default opacity-60 grayscale-[0.5]' : 'cursor-pointer'} ${selectedIds.includes(contact.id) ? 'bg-primary/5' : ''}`}
                                                >
                                                    <td className="px-1 md:px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                        {!isLocked && (
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-slate-300 dark:border-gray-600 bg-white dark:bg-background-dark text-primary focus:ring-0 focus:ring-offset-0 size-4 cursor-pointer"
                                                                checked={selectedIds.includes(contact.id)}
                                                                onChange={() => handleSelectOne(contact.id)}
                                                            />
                                                        )}
                                                        {isLocked && <Lock className="w-4 h-4 text-slate-400 mx-auto" />}
                                                    </td>
                                                    <td className="pl-3 pr-1 md:px-6 py-4">
                                                        <div className="flex items-center gap-2 md:gap-3">
                                                            {contact.avatarImage ? (
                                                                <div
                                                                    className="size-7 md:size-9 rounded-full bg-cover bg-center border border-slate-200 dark:border-white/10 shrink-0"
                                                                    style={{ backgroundImage: `url('${contact.avatarImage}')` }}
                                                                ></div>
                                                            ) : (
                                                                <div className={`size-7 md:size-9 rounded-full ${contact.avatarColor || 'bg-slate-400 dark:bg-slate-600'} flex items-center justify-center text-white font-bold text-[10px] md:text-xs shrink-0`}>
                                                                    {contact.initials || (contact.name ? contact.name.charAt(0).toUpperCase() : '?')}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-medium text-slate-900 dark:text-white truncate">{renderName(contact.name, contact.phone)}</span>
                                                                {contact.email && <span className="hidden md:block text-slate-500 dark:text-text-secondary text-xs truncate">{contact.email}</span>}
                                                                <span className="md:hidden text-slate-500 dark:text-text-secondary text-[10px] font-mono mt-0.5 truncate">{contact.phone}</span>
                                                                {/* Mobile-only Groups */}
                                                                <div className="md:hidden flex flex-wrap gap-1 mt-1.5">
                                                                    {(contact.tags && contact.tags.length > 0) && (
                                                                        <>
                                                                            {contact.tags.slice(0, 1).map((tag, i) => {
                                                                                const groupMeta = availableGroups.find(g => g.name === tag);
                                                                                const tagColor = groupMeta?.color || '#6366F1';
                                                                                return (
                                                                                    <span key={i} className="px-1.5 py-0.5 rounded text-[8px] font-medium flex items-center border shrink-0" style={{ backgroundColor: `${tagColor}15`, borderColor: `${tagColor}30`, color: tagColor }}>
                                                                                        {tag}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                            {contact.tags.length > 1 && (
                                                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-medium border bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shrink-0">
                                                                                    +{contact.tags.length - 1}
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-4 md:px-6 py-4 font-mono text-slate-600 dark:text-gray-300">
                                                        <span className={isSubMember && teamPolicy.phonePrivacy === 'blurred' ? 'blur-sm select-none' : ''}>
                                                            {isSubMember && teamPolicy.phonePrivacy === 'masked'
                                                                ? `****${contact.phone?.slice(-4) || ''}`
                                                                : contact.phone
                                                            }
                                                        </span>
                                                    </td>
                                                    <td className="px-1 md:px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(contact.labels && contact.labels.length > 0) ? (
                                                                <>
                                                                    {contact.labels.slice(0, 1).map(l => (
                                                                        <span key={l.id} className="px-1.5 py-0.5 rounded text-[8px] md:text-xs font-medium border flex items-center gap-1 shrink-0" style={{ backgroundColor: `${l.color}15`, borderColor: `${l.color}30`, color: l.color }}>
                                                                            <div className="hidden md:block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }}></div>
                                                                            {l.name}
                                                                        </span>
                                                                    ))}
                                                                    {contact.labels.length > 1 && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[8px] md:text-xs font-medium border bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shrink-0">
                                                                            +{contact.labels.length - 1}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-400 dark:text-text-secondary text-[10px] md:text-xs italic opacity-60">No tags</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-4 md:px-6 py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(contact.tags && contact.tags.length > 0) ? contact.tags.map((tag, i) => {
                                                                const groupMeta = availableGroups.find(g => g.name === tag);
                                                                const tagColor = groupMeta?.color || '#6366F1';
                                                                return (
                                                                    <span key={i} className="px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 border" style={{ backgroundColor: `${tagColor}15`, borderColor: `${tagColor}30`, color: tagColor }}>
                                                                        <Users className="w-3 h-3" />
                                                                        {tag}
                                                                    </span>
                                                                );
                                                            }) : (
                                                                <span className="text-slate-400 dark:text-text-secondary text-xs">—</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-2 md:px-6 py-4">
                                                        <div className="flex items-center gap-1.5 md:gap-2">
                                                            {contact.status === 'Valid' && (
                                                                <>
                                                                    <div className="size-1.5 md:size-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                    <span className="text-emerald-500 dark:text-emerald-400 font-medium text-[10px] md:text-xs">Valid</span>
                                                                </>
                                                            )}
                                                            {contact.status === 'Unknown' && (
                                                                <>
                                                                    <div className="size-1.5 md:size-2 rounded-full bg-slate-400 dark:bg-gray-500"></div>
                                                                    <span className="text-slate-500 dark:text-gray-400 font-medium text-[10px] md:text-xs leading-tight">Pending</span>
                                                                </>
                                                            )}
                                                            {contact.status === 'Opted Out' && (
                                                                <>
                                                                    <div className="size-1.5 md:size-2 rounded-full bg-rose-500"></div>
                                                                    <span className="text-rose-500 dark:text-rose-400 font-medium text-[10px] md:text-xs leading-tight">Opted Out</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-2 md:px-6 py-4 text-right">
                                                        <button className="text-slate-400 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                                            <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            <div className="bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-white/5 px-4 md:px-6 py-4 flex items-center justify-between">
                                <div className="text-sm text-slate-500 dark:text-text-secondary">
                                    Showing <span className="font-medium text-slate-900 dark:text-white">{Math.min((page - 1) * limit + 1, totalContacts)}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(page * limit, totalContacts)}</span> of <span className="font-medium text-slate-900 dark:text-white">{totalContacts}</span> results
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark text-slate-500 dark:text-text-secondary text-sm hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page === totalPages || totalPages === 0}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark text-slate-500 dark:text-text-secondary text-sm hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {filteredContacts.map((contact, index) => {
                                // We need actual index in the full sorted list for locking
                                const actualIndex = (page - 1) * limit + index;
                                const isLocked = contactLimit !== -1 && actualIndex >= contactLimit;

                                return (
                                    <div
                                        key={contact.id}
                                        onClick={() => {
                                            if (isLocked) return;
                                            if (viewingContact?.id === contact.id) setViewingContact(null);
                                            else setViewingContact(contact);
                                        }}
                                        className={`contact-trigger group bg-white dark:bg-surface-dark border transition-all duration-200 rounded-xl p-4 flex flex-col items-center text-center gap-3 relative overflow-hidden ${isLocked ? 'cursor-default opacity-80 grayscale-[0.2] border-slate-200 dark:border-white/5' : 'cursor-pointer border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-lg'} ${selectedIds.includes(contact.id) ? 'border-primary/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : ''}`}
                                    >
                                        {/* Locked Overlay */}
                                        {isLocked && (
                                            <div className="absolute inset-0 z-20 bg-slate-100/40 dark:bg-background-dark/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4">
                                                <div className="bg-white dark:bg-surface-dark p-2 rounded-full shadow-lg border border-slate-200 dark:border-white/10 mb-2">
                                                    <Lock className="w-5 h-5 text-slate-500" />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-text-secondary uppercase tracking-tighter">Locked</span>
                                            </div>
                                        )}

                                        {/* Selection Overlay/Checkbox */}
                                        {!isLocked && (
                                            <div className="absolute top-3 right-3 z-10">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 dark:border-gray-600 bg-white dark:bg-background-dark text-primary focus:ring-0 focus:ring-offset-0 size-3.5 cursor-pointer"
                                                    checked={selectedIds.includes(contact.id)}
                                                    onChange={() => handleSelectOne(contact.id)}
                                                />
                                            </div>
                                        )}

                                        {/* Action Menu (Hover) */}
                                        <button className="absolute top-3 left-3 z-10 text-text-secondary hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {/* Centered Avatar */}
                                        {contact.avatarImage ? (
                                            <div
                                                className="size-16 rounded-full bg-cover bg-center border-4 border-surface-dark shadow-lg ring-1 ring-white/10"
                                                style={{ backgroundImage: `url('${contact.avatarImage}')` }}
                                            ></div>
                                        ) : (
                                            <div className={`size-16 rounded-full ${contact.avatarColor || 'bg-gradient-to-br from-indigo-500 to-purple-600'} flex items-center justify-center text-white font-bold text-2xl border-4 border-surface-dark shadow-lg ring-1 ring-white/10`}>
                                                {contact.initials || contact.name?.charAt(0) || 'U'}
                                            </div>
                                        )}

                                        {/* Basic Info */}
                                        <div className="flex flex-col gap-0.5 w-full z-0">
                                            <h3 className="font-bold text-white text-base truncate w-full px-2">{renderName(contact.name, contact.phone)}</h3>
                                            <p className="text-gray-300 text-xs font-mono tracking-wide">
                                                <span className={isSubMember && teamPolicy.phonePrivacy === 'blurred' ? 'blur-sm select-none' : ''}>
                                                    {isSubMember && teamPolicy.phonePrivacy === 'masked'
                                                        ? `****${contact.phone?.slice(-4) || ''}`
                                                        : contact.phone
                                                    }
                                                </span>
                                            </p>
                                            {contact.email && <p className="text-text-secondary text-[10px] truncate w-full px-4 text-opacity-80">{contact.email}</p>}
                                        </div>

                                        {/* Labels */}
                                        <div className="flex flex-wrap justify-center gap-1 w-full px-1">
                                            {(contact.labels && contact.labels.length > 0) ? contact.labels.map(l => (
                                                <span key={l.id} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold border flex items-center gap-1" style={{ backgroundColor: `${l.color}15`, borderColor: `${l.color}30`, color: l.color }}>
                                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: l.color }}></div>
                                                    {l.name}
                                                </span>
                                            )) : (
                                                <span className="text-text-secondary text-[10px] italic opacity-40">No labels</span>
                                            )}
                                        </div>

                                        {/* Groups */}
                                        <div className="flex flex-wrap justify-center gap-1 w-full px-1">
                                            {(contact.tags && contact.tags.length > 0) ? contact.tags.map((tag, i) => {
                                                const groupMeta = availableGroups.find(g => g.name === tag);
                                                const tagColor = groupMeta?.color || '#3B82F6';
                                                return (
                                                    <span key={i} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold border flex items-center gap-1" style={{ backgroundColor: `${tagColor}15`, borderColor: `${tagColor}30`, color: tagColor }}>
                                                        <Users className="w-2.5 h-2.5" />
                                                        {tag}
                                                    </span>
                                                );
                                            }) : (
                                                <span className="text-text-secondary text-[10px] italic opacity-40">No group</span>
                                            )}
                                        </div>

                                        <div className="h-px bg-white/5 w-3/4 my-1"></div>

                                        {/* Status Badge */}
                                        <div className="mt-auto">
                                            {contact.status === 'Valid' && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/10">
                                                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wide">Valid Number</span>
                                                </div>
                                            )}
                                            {contact.status === 'Unknown' && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 border border-gray-500/10">
                                                    <div className="size-1.5 rounded-full bg-gray-500"></div>
                                                    <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wide">Pending Check</span>
                                                </div>
                                            )}
                                            {contact.status === 'Invalid' && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/10">
                                                    <div className="size-1.5 rounded-full bg-rose-500"></div>
                                                    <span className="text-rose-400 font-bold text-[10px] uppercase tracking-wide">Invalid Number</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Bar */}
            {
                selectedIds.length > 0 && (
                    <div className="fixed bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 md:px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 md:gap-6 z-50 animate-in slide-in-from-bottom-5 duration-300 w-[95%] md:w-auto justify-center max-w-full overflow-x-auto hide-scrollbar">
                        <div className="flex items-center gap-3 border-r border-white/20 pr-4">
                            <span className="bg-white text-primary font-bold rounded-full size-6 flex items-center justify-center text-xs">{selectedIds.length}</span>
                            <span className="font-medium text-sm">Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleBulkDelete} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Delete">
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => setShowBulkGroupPicker(true)} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Add to Group">
                                <FolderPlus className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Export">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="ml-2 text-xs font-semibold uppercase tracking-wider hover:text-white/80"
                        >
                            Cancel
                        </button>
                    </div>
                )
            }

            {/* Bulk Group Picker Modal */}
            {
                showBulkGroupPicker && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-surface-dark border border-white/10 rounded-2xl p-4 md:p-6 w-full max-w-sm shadow-2xl">
                            <h3 className="text-lg font-bold text-white mb-4">Add selection to group</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar mb-4">
                                {availableGroups.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => { handleBulkAddToGroup(g.name); setShowBulkGroupPicker(false); }}
                                        className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center justify-between group"
                                    >
                                        <span>{g.name}</span>
                                        <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                                {availableGroups.length === 0 && (
                                    <p className="text-text-secondary text-sm text-center py-4">No groups available. Create one first.</p>
                                )}
                            </div>
                            <button onClick={() => setShowBulkGroupPicker(false)} className="w-full py-2 text-text-secondary hover:text-white transition-colors">Cancel</button>
                        </div>
                    </div>
                )
            }

            {/* Contact Details Slide-over Redesign */}
            <div ref={contactPanelRef} className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-50 dark:bg-[#111b21] shadow-[0_0_40px_rgba(0,0,0,0.1)] transform transition-transform duration-300 ease-in-out z-50 ${viewingContact ? 'translate-x-0' : 'translate-x-full'}`}>
                {viewingContact && (
                    <div className="h-full flex flex-col items-stretch overflow-hidden">

                        {/* Clean Close Button (using requested color) */}
                        <div className="flex justify-end p-4 shrink-0 bg-[#233648]">
                            <button onClick={() => setViewingContact(null)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Centered Profile Section (No Banner) */}
                        <div className="px-4 md:px-6 pb-6 flex flex-col items-center bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-white/5 rounded-b-3xl shadow-sm z-10 shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                            {viewingContact.avatarImage ? (
                                <div className="w-24 h-24 rounded-3xl bg-cover bg-center border-4 border-slate-50 dark:border-[#111b21] shadow-md mb-4" style={{ backgroundImage: `url('${viewingContact.avatarImage}')` }}></div>
                            ) : (
                                <div className={`w-24 h-24 rounded-3xl ${viewingContact.avatarColor || 'bg-gradient-to-br from-indigo-500 to-purple-600'} flex items-center justify-center text-white text-3xl font-bold border-4 border-slate-50 dark:border-[#111b21] shadow-md mb-4`}>
                                    {viewingContact.initials || viewingContact.name[0]}
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1 text-center">{renderName(viewingContact.name, viewingContact.phone)}</h2>
                            <p className="text-slate-500 dark:text-text-secondary font-mono flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 px-3 py-1 rounded-lg text-xs">
                                <Phone className="w-3.5 h-3.5" />
                                <span className={isSubMember && teamPolicy.phonePrivacy === 'blurred' ? 'blur-sm select-none' : ''}>
                                    {isSubMember && teamPolicy.phonePrivacy === 'masked'
                                        ? `****${viewingContact.phone?.slice(-4) || ''}`
                                        : viewingContact.phone
                                    }
                                </span>
                            </p>

                            {/* Quick Actions (Functional) */}
                            <div className="flex w-full gap-3 mt-6">
                                <button
                                    onClick={() => navigate('/inbox', { state: { startChatWith: viewingContact } })}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                    Message
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingContact(viewingContact);
                                        setNewContact({
                                            name: viewingContact.name,
                                            phone: viewingContact.phone,
                                            email: viewingContact.email || '',
                                            tags: (viewingContact.tags || []).join(', '),
                                            labelId: viewingContact.labels?.[0]?.id || ''
                                        });
                                        setShowAddModal(true);
                                    }}
                                    className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl transition-colors tooltip" title="Edit Contact"
                                >
                                    <FolderCog className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDeleteContact(viewingContact)}
                                    className="p-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-colors tooltip" title="Delete Contact"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Details Flow */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50 dark:bg-[#111b21]">

                            {/* Contact Info Card */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
                                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-white font-semibold">
                                    <User className="w-4 h-4 text-primary" />
                                    <h3>Information</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider mb-1">Email Address</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-gray-200">
                                            {viewingContact.email ? viewingContact.email : <span className="text-slate-400 italic">Not provided</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider mb-1">Status</p>
                                        {viewingContact.status === 'Valid' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Valid Number
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Pending Check
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Groups Card */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
                                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-white font-semibold">
                                    <Users className="w-4 h-4 text-indigo-500" />
                                    <h3>Groups</h3>
                                </div>

                                {/* Selected Groups Pills */}
                                <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
                                    {(viewingContact.tags && viewingContact.tags.length > 0) ? viewingContact.tags.map((tag, i) => (
                                        <span key={i} className="pl-2.5 pr-1 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 group shadow-sm transition-all hover:border-indigo-300">
                                            {tag}
                                            <button
                                                onClick={() => handleToggleGroup(viewingContact, tag)}
                                                className="p-1 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors opacity-60 hover:opacity-100 text-indigo-800 dark:text-indigo-300"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    )) : (
                                        <span className="text-xs text-slate-400 italic py-2">No groups assigned</span>
                                    )}
                                </div>

                                {/* Group Selector (Inbox Style) */}
                                <div className="relative" tabIndex={0} onBlur={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                        setShowGroupPickerFor(null);
                                    }
                                }}>
                                    <button
                                        onClick={() => setShowGroupPickerFor(showGroupPickerFor === viewingContact.id ? null : viewingContact.id)}
                                        className="w-full text-xs bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-white/20 flex items-center justify-between"
                                    >
                                        <span className="truncate">
                                            {(viewingContact.tags && viewingContact.tags.length > 0) ? viewingContact.tags[0] : "+ Add to group..."}
                                            {(viewingContact.tags && viewingContact.tags.length > 1) && ` (+${viewingContact.tags.length - 1})`}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                    </button>

                                    {showGroupPickerFor === viewingContact.id && (
                                        <div className="absolute top-full left-0 right-0 pt-2 z-50">
                                            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                                                {availableGroups.length === 0 ? (
                                                    <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">No groups found</div>
                                                ) : (
                                                    availableGroups.map((g) => {
                                                        const isSelected = (viewingContact.tags || []).includes(g.name);
                                                        return (
                                                            <button
                                                                key={g.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleToggleGroup(viewingContact, g.name);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between"
                                                            >
                                                                <span className={isSelected ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'font-medium'}>
                                                                    {g.name}
                                                                </span>
                                                                {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Labels Card */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold">
                                        <Tag className="w-4 h-4 text-purple-500" />
                                        <h3>Tags</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowLabelsModal(true)}
                                        className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 px-2 py-1 rounded transition-colors"
                                    >
                                        Manage
                                    </button>
                                </div>

                                {/* Selected Labels Pills */}
                                <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
                                    {(viewingContact.labels && viewingContact.labels.length > 0) ? viewingContact.labels.map(l => (
                                        <span key={l.id} className="pl-3 pr-1.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all" style={{ backgroundColor: `${l.color}15`, borderColor: `${l.color}30`, color: l.color }}>
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }}></div>
                                            {l.name}
                                            <button
                                                onClick={() => handleToggleLabel(viewingContact, l)}
                                                className="p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-1"
                                                style={{ color: l.color }}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    )) : (
                                        <span className="text-xs text-slate-400 italic py-2">No tags assigned</span>
                                    )}
                                </div>

                                {/* Label Selector (Inbox Style) */}
                                <div className="relative" tabIndex={0} onBlur={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                        setShowLabelPickerFor(null);
                                    }
                                }}>
                                    <button
                                        onClick={() => setShowLabelPickerFor(showLabelPickerFor === viewingContact.id ? null : viewingContact.id)}
                                        className="w-full text-xs bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-bold cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-white/20 flex items-center justify-between"
                                        disabled={isUpdatingLabel}
                                    >
                                        <span className="truncate">
                                            {(viewingContact.labels && viewingContact.labels.length > 0) ? viewingContact.labels[0].name : "+ Add tag..."}
                                            {(viewingContact.labels && viewingContact.labels.length > 1) && ` (+${viewingContact.labels.length - 1})`}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                    </button>

                                    {showLabelPickerFor === viewingContact.id && (
                                        <div className="absolute top-full left-0 right-0 pt-2 z-50">
                                            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                                                {availableLabels.length === 0 ? (
                                                    <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic text-center">No tags found</div>
                                                ) : (
                                                    availableLabels.map(label => {
                                                        const isSelected = (viewingContact.labels || []).some(l => l.id === label.id);
                                                        return (
                                                            <button
                                                                key={label.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleToggleLabel(viewingContact, label);
                                                                }}
                                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: label.color }}></div>
                                                                    <span className={`text-sm ${isSelected ? 'font-bold text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-white font-medium'}`}>
                                                                        {label.name}
                                                                    </span>
                                                                </div>
                                                                {isSelected && <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Unified Contact Modal (3 tabs) ─────────────────────────── */}
            {showContactModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[92vh]">

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-primary/10 text-primary">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Contacts</h3>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">Upload a file, sync Google, or add manually</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowContactModal(false); setNewContact({ name: '', phone: '', email: '', tags: '', labelId: '' }); }}
                                className="p-2 rounded-lg text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10 shrink-0">
                            {[
                                { id: 'file', label: 'Upload CSV/VCF', shortLabel: 'Upload', icon: UploadCloud },
                                { id: 'google', label: 'Google Contacts', shortLabel: 'Google', icon: Users },
                                { id: 'manual', label: 'Add Manually', shortLabel: 'Manual', icon: UserPlus },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setContactModalTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold transition-all border-b-2 ${contactModalTab === tab.id
                                            ? 'text-indigo-600 dark:text-white border-indigo-600 dark:border-white bg-indigo-50 dark:bg-white/10'
                                            : 'text-slate-500 dark:text-text-secondary border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden">{tab.shortLabel}</span>
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="overflow-y-auto flex-1 custom-scrollbar">

                            {/* ── Tab 1: Upload CSV / VCF ── */}
                            {contactModalTab === 'file' && (
                                <div className="p-4 md:p-6 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-slate-600 dark:text-text-secondary leading-relaxed">
                                            Upload a <span className="text-slate-900 dark:text-white font-semibold">.csv</span> or{' '}
                                            <span className="text-slate-900 dark:text-white font-semibold">.vcf</span> (vCard) file to bulk-import contacts.
                                        </p>
                                        <button
                                            onClick={() => {
                                                const csv = "Name,Phone,Email\nJohn Doe,+1234567890,john@example.com\nJane Smith,+9876543210,jane@test.com";
                                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url; a.download = 'contacts_template.csv';
                                                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-xs font-medium text-slate-700 dark:text-white transition-colors border border-slate-200 dark:border-white/10 shrink-0"
                                        >
                                            <Download className="w-3.5 h-3.5" /> CSV Template
                                        </button>
                                    </div>

                                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl cursor-pointer bg-slate-50 dark:bg-background-dark/40 hover:bg-slate-100 dark:hover:bg-background-dark hover:border-primary/50 transition-all group">
                                        <UploadCloud className="w-9 h-9 text-slate-400 dark:text-text-secondary group-hover:text-primary mb-2 transition-colors" />
                                        <p className="text-sm text-slate-500 dark:text-text-secondary">
                                            <span className="font-bold text-primary">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-text-secondary mt-1">.csv or .vcf — max 5MB</p>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".csv,.vcf,text/vcard,text/csv,application/vnd.ms-excel"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const ext = file.name.split('.').pop().toLowerCase();

                                                const doImport = (contactsToImport) => {
                                                    if (contactsToImport.length === 0) {
                                                        showToast({ type: 'warning', title: 'No Valid Contacts', message: 'No valid contacts found. Ensure Name and Phone columns are present.' });
                                                        return;
                                                    }
                                                    showModal({
                                                        type: 'info',
                                                        title: 'Confirm Import',
                                                        message: `Found ${contactsToImport.length} valid contact(s). Import them now?`,
                                                        confirmText: 'Import',
                                                        cancelText: 'Cancel',
                                                        onConfirm: () => {
                                                            axios.post(`${import.meta.env.VITE_API_URL}/api/contacts/import`, { contacts: contactsToImport })
                                                                .then(res => {
                                                                    showToast({ type: 'success', title: 'Import Successful', message: `${res.data.count} contacts imported!` });
                                                                    setShowContactModal(false);
                                                                    fetchContacts();
                                                                })
                                                                .catch(err => {
                                                                    showToast({ type: 'error', title: 'Import Failed', message: err.response?.data?.error || err.message });
                                                                });
                                                        }
                                                    });
                                                };

                                                if (ext === 'vcf') {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const parsed = parseVCF(ev.target.result);
                                                        doImport(parsed.filter(c => c.phone).map(c => ({
                                                            name: c.name || c.phone,
                                                            phone: c.phone,
                                                            email: c.email || '',
                                                            tags: ['Apple Contacts']
                                                        })));
                                                    };
                                                    reader.readAsText(file);
                                                } else {
                                                    // CSV (flexible column detection)
                                                    Papa.parse(file, {
                                                        header: true,
                                                        skipEmptyLines: true,
                                                        complete: (results) => {
                                                            const contacts = results.data
                                                                .map(normaliseCSVRow)
                                                                .filter(r => r.name && r.phone);
                                                            doImport(contacts);
                                                        },
                                                        error: (err) => {
                                                            showToast({ type: 'error', title: 'Parse Error', message: 'Could not read file: ' + err.message });
                                                        }
                                                    });
                                                }
                                                e.target.value = ''; // reset input
                                            }}
                                        />
                                    </label>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/5">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">📄 CSV Files</p>
                                            <p className="text-[10px] text-slate-500 dark:text-text-secondary leading-relaxed">Exported from Excel, Google Sheets. Columns: <span className="text-slate-800 dark:text-white font-medium">Name</span>, <span className="text-slate-800 dark:text-white font-medium">Phone</span>, Email.</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/5">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">📱 VCF / vCard</p>
                                            <p className="text-[10px] text-slate-500 dark:text-text-secondary leading-relaxed">From iPhone, Android, iCloud, Mac Address Book, or Google Takeout.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Tab 2: Google Contacts ── */}
                            {contactModalTab === 'google' && (
                                <div className="p-4 md:p-8 flex flex-col items-center text-center gap-5">
                                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                                        <svg width="42" height="42" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V29.0033H37.4434C36.9055 31.983 35.177 34.6127 32.6461 36.3067V42.3007H40.3801C44.9217 38.1454 47.532 31.9387 47.532 24.5528Z" fill="#4285F4" />
                                            <path d="M24.48 48C30.9529 48 36.4116 45.8748 40.3888 42.3007L32.6548 36.3067C30.5031 37.7582 27.7252 38.5741 24.4888 38.5741C18.2275 38.5741 12.9187 34.3785 11.0139 28.748H3.03296V34.9262C7.10718 43.0263 15.4056 48 24.48 48Z" fill="#34A853" />
                                            <path d="M11.0051 28.748C10.5143 27.2965 10.2411 25.7527 10.2411 24.1586C10.2411 22.5645 10.5232 21.0207 11.0051 19.5691V13.3909H3.02413C1.38282 16.6386 0.453125 20.3022 0.453125 24.1586C0.453125 28.015 1.38282 31.6786 3.02413 34.9262L11.0051 28.748Z" fill="#FBBC04" />
                                            <path d="M24.48 9.74337C28.0016 9.74337 31.1716 11.0033 33.6677 13.4552L40.5586 6.56432C36.4027 2.71756 30.9529 0.457275 24.48 0.457275C15.4056 0.457275 7.10718 5.43095 3.03296 13.5228L11.014 19.701C12.9187 14.0706 18.2275 9.74337 24.48 9.74337Z" fill="#EA4335" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Import from Google Contacts</h4>
                                        <p className="text-sm text-slate-500 dark:text-text-secondary max-w-xs leading-relaxed">Connect your Google account to import contacts directly into your list. Read-only access — nothing is stored without your confirmation.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/contacts/google/auth-url`);
                                                window.location.href = res.data.url;
                                            } catch {
                                                showToast({
                                                    type: 'warning',
                                                    title: 'Not Configured',
                                                    message: 'Google Contacts integration is not enabled. Ask your administrator to configure Google OAuth in Admin Settings → Integrations.'
                                                });
                                            }
                                        }}
                                        className="flex items-center gap-3 px-4 md:px-6 py-3 bg-white text-slate-800 font-bold rounded-xl hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V29.0033H37.4434C36.9055 31.983 35.177 34.6127 32.6461 36.3067V42.3007H40.3801C44.9217 38.1454 47.532 31.9387 47.532 24.5528Z" fill="#4285F4" />
                                            <path d="M24.48 48C30.9529 48 36.4116 45.8748 40.3888 42.3007L32.6548 36.3067C30.5031 37.7582 27.7252 38.5741 24.4888 38.5741C18.2275 38.5741 12.9187 34.3785 11.0139 28.748H3.03296V34.9262C7.10718 43.0263 15.4056 48 24.48 48Z" fill="#34A853" />
                                            <path d="M11.0051 28.748C10.5143 27.2965 10.2411 25.7527 10.2411 24.1586C10.2411 22.5645 10.5232 21.0207 11.0051 19.5691V13.3909H3.02413C1.38282 16.6386 0.453125 20.3022 0.453125 24.1586C0.453125 28.015 1.38282 31.6786 3.02413 34.9262L11.0051 28.748Z" fill="#FBBC04" />
                                            <path d="M24.48 9.74337C28.0016 9.74337 31.1716 11.0033 33.6677 13.4552L40.5586 6.56432C36.4027 2.71756 30.9529 0.457275 24.48 0.457275C15.4056 0.457275 7.10718 5.43095 3.03296 13.5228L11.014 19.701C12.9187 14.0706 18.2275 9.74337 24.48 9.74337Z" fill="#EA4335" />
                                        </svg>
                                        Continue with Google
                                    </button>
                                    <div className="flex items-start gap-2 bg-amber-50 dark:bg-white/5 rounded-xl p-4 border border-amber-200 dark:border-white/5 text-left max-w-xs">
                                        <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-slate-600 dark:text-text-secondary leading-relaxed">This requires Google OAuth to be configured by your admin in <span className="text-slate-800 dark:text-white font-medium">Superadmin → System Controls → Integrations</span>.</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Tab 3: Add Manually ── */}
                            {contactModalTab === 'manual' && (
                                <div className="p-4 md:p-6">
                                    <form onSubmit={handleAddContact} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Name <span className="text-red-500 dark:text-red-400">*</span></label>
                                            <input
                                                required
                                                value={newContact.name}
                                                onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                                                className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Phone — with country code <span className="text-red-500 dark:text-red-400">*</span></label>
                                            <input
                                                required
                                                value={newContact.phone}
                                                onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                                                className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                                                placeholder="+91 9876543210"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Email <span className="text-slate-400 dark:text-text-secondary text-xs">(optional)</span></label>
                                            <input
                                                value={newContact.email}
                                                onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                                                className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Group <span className="text-slate-400 dark:text-text-secondary text-xs">(optional)</span></label>
                                            <select
                                                value={newContact.tags}
                                                onChange={e => setNewContact({ ...newContact, tags: e.target.value })}
                                                className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer transition-colors"
                                            >
                                                <option value="">No Group</option>
                                                {availableGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Tag <span className="text-slate-400 dark:text-text-secondary text-xs">(optional)</span></label>
                                            <select
                                                value={newContact.labelId}
                                                onChange={e => setNewContact({ ...newContact, labelId: e.target.value })}
                                                className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer transition-colors"
                                            >
                                                <option value="">No Tag</option>
                                                {availableLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setShowContactModal(false); setNewContact({ name: '', phone: '', email: '', tags: '', labelId: '' }); }}
                                                className="px-4 py-2 rounded-lg text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 md:px-6 py-2.5 bg-primary rounded-lg text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                                            >
                                                Save Contact
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Import CSV Modal (legacy — no longer opened from UI, kept for safety) */}
            {
                showImportModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-surface-dark border border-white/10 rounded-2xl p-4 md:p-6 w-full max-w-lg shadow-2xl">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Import Contacts</h3>
                                    <p className="text-sm text-text-secondary mt-1">Upload a CSV file to bulk import contacts.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const csvContent = "Name,Phone,Email\nJohn Doe,+1234567890,john@example.com\nJane Smith,+9876543210,jane@test.com";
                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                        const link = document.createElement("a");
                                        if (link.download !== undefined) {
                                            const url = URL.createObjectURL(blob);
                                            link.setAttribute("href", url);
                                            link.setAttribute("download", "contacts_template.csv");
                                            link.style.visibility = 'hidden';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors border border-white/10"
                                >
                                    <Download className="w-4 h-4" />
                                    Sample Template
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer bg-background-dark/50 hover:bg-background-dark hover:border-primary/50 transition-all group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 text-text-secondary group-hover:text-primary mb-2 transition-colors" />
                                        <p className="mb-1 text-sm text-text-secondary"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-text-secondary">CSV file (max 5MB)</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".csv"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                Papa.parse(file, {
                                                    header: true,
                                                    skipEmptyLines: true,
                                                    complete: (results) => {
                                                        // Basic validation preview
                                                        console.log("Parsed:", results.data);
                                                        if (results.data.length > 0) {
                                                            const validCount = results.data.filter(r => r.Name && r.Phone).length;

                                                            showModal({
                                                                type: 'info',
                                                                title: 'Confirm Import',
                                                                message: `Found ${results.data.length} rows (${validCount} valid). Do you want to import them now?`,
                                                                confirmText: 'Import',
                                                                cancelText: 'Cancel',
                                                                onConfirm: () => {
                                                                    const contactsToImport = results.data
                                                                        .filter(r => r.Name && r.Phone) // Filter empty rows or missing required
                                                                        .map(r => ({
                                                                            name: r.Name,
                                                                            phone: r.Phone,
                                                                            email: r.Email || '',
                                                                            tags: []
                                                                        }));

                                                                    if (contactsToImport.length === 0) {
                                                                        showModal({
                                                                            type: 'warning',
                                                                            title: 'No Valid Contacts',
                                                                            message: 'No valid contacts found. Please check required fields (Name, Phone).',
                                                                            confirmText: 'Got it'
                                                                        });
                                                                        return;
                                                                    }

                                                                    axios.post(`${import.meta.env.VITE_API_URL}/api/contacts/import`, { contacts: contactsToImport })
                                                                        .then(res => {
                                                                            showModal({
                                                                                type: 'success',
                                                                                title: 'Import Successful',
                                                                                message: `Successfully imported ${res.data.count} contacts!`,
                                                                                confirmText: 'Awesome'
                                                                            });
                                                                            setShowImportModal(false);
                                                                            fetchContacts();
                                                                        })
                                                                        .catch(err => {
                                                                            showModal({
                                                                                type: 'error',
                                                                                title: 'Import Failed',
                                                                                message: err.response?.data?.error || err.message,
                                                                                confirmText: 'Close'
                                                                            });
                                                                        });
                                                                }
                                                            });
                                                        } else {
                                                            showModal({
                                                                type: 'warning',
                                                                title: 'Empty File',
                                                                message: 'The selected CSV file appears to be empty.',
                                                                confirmText: 'Close'
                                                            });
                                                        }
                                                    },
                                                    error: (err) => {
                                                        showModal({
                                                            type: 'error',
                                                            title: 'Parsing Error',
                                                            message: "Could not parse CSV: " + err.message,
                                                            confirmText: 'Close'
                                                        });
                                                    }
                                                });
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-lg text-text-secondary hover:text-white transition-colors">Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add/Edit Contact Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
                        <div className="bg-surface-dark border border-white/10 rounded-2xl p-4 md:p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
                            <h3 className="text-xl font-bold text-white mb-4">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
                            <form onSubmit={handleAddContact} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Name</label>
                                    <input required value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Phone (with Country Code)</label>
                                    <input
                                        required
                                        disabled={editingContact && newContact.phone.toString().startsWith('****')}
                                        value={newContact.phone}
                                        onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                                        className={`w-full bg-background-dark border border-white/10 rounded-lg px-4 py-2 text-white outline-none ${editingContact && newContact.phone.toString().startsWith('****') ? 'opacity-50 cursor-not-allowed' : 'focus:border-primary'}`}
                                        placeholder="+1234567890"
                                    />
                                    {editingContact && newContact.phone.toString().startsWith('****') && (
                                        <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                                            <Lock className="w-3 h-3" /> Phone number modification restricted due to privacy policy.
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Email (Optional)</label>
                                    <input value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none" placeholder="john@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Group (Optional)</label>
                                    <select
                                        value={newContact.tags}
                                        onChange={e => setNewContact({ ...newContact, tags: e.target.value })}
                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Group (None)</option>
                                        {availableGroups.map(group => (
                                            <option key={group.id} value={group.name}>{group.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Label (Optional)</label>
                                    <select
                                        value={newContact.labelId}
                                        onChange={e => setNewContact({ ...newContact, labelId: e.target.value })}
                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Label (None)</option>
                                        {availableLabels.map(label => (
                                            <option key={label.id} value={label.id}>{label.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddModal(false); setEditingContact(null); }}
                                        className="px-4 py-2 rounded-lg text-text-secondary hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-4 md:px-6 py-2 bg-primary rounded-lg text-white font-bold hover:bg-blue-600 transition-colors">
                                        {editingContact ? 'Update Contact' : 'Save Contact'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Manage Groups Modal */}
            {
                showGroupsModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Groups</h3>
                                    <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">Organize contacts into segments.</p>
                                </div>
                                {!isCreatingGroup && !editingGroup && (
                                    <button
                                        onClick={() => { setIsCreatingGroup(true); setGroupForm({ name: '', description: '' }); }}
                                        className="px-3 py-1.5 bg-primary rounded-lg text-white text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        New Group
                                    </button>
                                )}
                            </div>

                            {(isCreatingGroup || editingGroup) ? (
                                <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                                    <div>
                                        <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Group Name</label>
                                        <input
                                            autoFocus
                                            value={groupForm.name}
                                            onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                                            placeholder="e.g. Early Adopters"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Description (Optional)</label>
                                        <input
                                            value={groupForm.description}
                                            onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                                            placeholder="VIP customers from 2024"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 dark:text-text-secondary mb-3">Group Color</label>
                                        <div className="flex flex-wrap gap-2">
                                            {groupColors.map((color) => (
                                                <button
                                                    key={color.value}
                                                    type="button"
                                                    onClick={() => setGroupForm({ ...groupForm, color: color.value })}
                                                    className={`size-8 rounded-full transition-all border-2 ${groupForm.color === color.value ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent hover:scale-105'}`}
                                                    style={{ backgroundColor: color.value }}
                                                    title={color.name}
                                                />
                                            ))}
                                            <input
                                                type="color"
                                                value={groupForm.color}
                                                onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
                                                className="size-8 rounded-full bg-transparent border-none cursor-pointer overflow-hidden p-0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={() => { setIsCreatingGroup(false); setEditingGroup(null); }}
                                            className="px-4 py-2 rounded-lg text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveGroup}
                                            disabled={!groupForm.name}
                                            className="px-4 md:px-6 py-2 bg-primary rounded-lg text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {editingGroup ? 'Update Group' : 'Create Group'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 overflow-hidden">
                                    {/* Search Bar */}
                                    <div className="relative shrink-0">
                                        <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-text-secondary w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search groups..."
                                            value={groupSearchTerm}
                                            onChange={(e) => setGroupSearchTerm(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-white/5 rounded-lg bg-slate-50 dark:bg-background-dark/50 custom-scrollbar min-h-[300px]">
                                        {availableGroups.filter(g => g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())).length > 0 ? (
                                            <ul className="divide-y divide-slate-200 dark:divide-white/5">
                                                {availableGroups
                                                    .filter(g => g.name.toLowerCase().includes(groupSearchTerm.toLowerCase()))
                                                    .map(group => {
                                                        const memberCount = contacts.filter(c => c.tags && c.tags.includes(group.name)).length;
                                                        return (
                                                            <li key={group.id} className="flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="p-2 rounded-lg text-white border border-white/5 mt-0.5" style={{ backgroundColor: `${group.color || '#3B82F6'}20`, color: group.color || '#3B82F6', borderColor: `${group.color || '#3B82F6'}40` }}>
                                                                        <Users className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-slate-900 dark:text-white font-bold text-sm">{group.name}</p>
                                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-text-secondary border border-slate-300 dark:border-white/5">
                                                                                {memberCount} members
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-slate-500 dark:text-text-secondary text-xs mt-0.5 line-clamp-1">{group.description || 'No description'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingGroup(group);
                                                                            setGroupForm({
                                                                                name: group.name,
                                                                                description: group.description || '',
                                                                                color: group.color || '#3B82F6'
                                                                            });
                                                                        }}
                                                                        className="p-1.5 text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <FolderCog className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteGroup(group.id)}
                                                                        className="p-1.5 text-slate-500 dark:text-text-secondary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                            </ul>
                                        ) : (
                                            <div className="p-8 text-center flex flex-col items-center justify-center">
                                                <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-full mb-3">
                                                    <Search className="w-5 h-5 text-slate-400 dark:text-text-secondary" />
                                                </div>
                                                <p className="text-slate-500 dark:text-text-secondary text-sm">No groups found.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end pt-2 shrink-0">
                                        <button onClick={() => { setShowGroupsModal(false); setGroupSearchTerm(''); }} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-white text-sm font-medium hover:bg-slate-200 dark:hover:bg-white/5 transition-colors border border-slate-200 dark:border-white/10">Close</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            {showLabelsModal && (
                <ManageLabelsModal onClose={() => setShowLabelsModal(false)} />
            )}
        </div>
    );
};

export default Contacts;

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Plus, Edit2, Trash2, Check, X, RefreshCw, Calendar, FileText, Star } from 'lucide-react';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import { useUI } from '../context/UIContext';
import { formatDistanceToNow } from 'date-fns';

const AdminVersioning = () => {
    const { showToast, showModal } = useUI();
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null); // null = create, object = edit
    const [form, setForm] = useState({ version: '', title: '', changelog: '', isCurrent: false, releasedAt: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchVersions(); }, []);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/versioning');
            setVersions(res.data);
        } catch (err) {
            console.error('Error fetching versions:', err);
            showToast({ type: 'error', message: 'Failed to load versions.' });
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditing(null);
        setForm({ version: '', title: '', changelog: '', isCurrent: true, releasedAt: new Date().toISOString().split('T')[0] });
        setModalOpen(true);
    };

    const openEditModal = (v) => {
        setEditing(v);
        setForm({
            version: v.version,
            title: v.title,
            changelog: v.changelog || '',
            isCurrent: v.isCurrent,
            releasedAt: v.releasedAt ? new Date(v.releasedAt).toISOString().split('T')[0] : ''
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.version.trim() || !form.title.trim()) {
            showToast({ type: 'error', message: 'Version and title are required.' });
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await axios.put(`http://127.0.0.1:5000/api/versioning/${editing.id}`, {
                    ...form,
                    releasedAt: form.releasedAt ? new Date(form.releasedAt).toISOString() : undefined
                });
                showToast({ type: 'success', message: 'Version updated.' });
            } else {
                await axios.post('http://127.0.0.1:5000/api/versioning', {
                    ...form,
                    releasedAt: form.releasedAt ? new Date(form.releasedAt).toISOString() : undefined
                });
                showToast({ type: 'success', message: 'Version created.' });
            }
            setModalOpen(false);
            fetchVersions();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', message: 'Failed to save version.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (v) => {
        showModal({
            type: 'error',
            title: 'Delete Version?',
            message: `Are you sure you want to delete version ${v.version}? This action cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await axios.delete(`http://127.0.0.1:5000/api/versioning/${v.id}`);
                    showToast({ type: 'success', message: 'Version deleted.' });
                    fetchVersions();
                } catch (err) {
                    console.error(err);
                    showToast({ type: 'error', message: 'Failed to delete version.' });
                }
            }
        });
    };

    const filteredVersions = versions.filter(v =>
        v.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.changelog || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <AdminHeader searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)}>
                <ThemeToggle />
            </AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20">
                <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col min-h-[600px]">

                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Tag className="w-6 h-6 text-purple-500" />
                                App Versioning
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">Manage release versions and changelogs visible to all users.</p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button onClick={fetchVersions} className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-primary transition-colors" title="Refresh">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20">
                                <Plus className="w-4 h-4" /> Add Version
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1 bg-slate-50/30 dark:bg-black/10">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/5 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-text-secondary sticky top-0 backdrop-blur-sm z-10 border-b border-slate-200 dark:border-white/5">
                                <tr>
                                    <th className="px-6 py-4 w-36">Version</th>
                                    <th className="px-6 py-4 w-48">Title</th>
                                    <th className="px-6 py-4">Changelog</th>
                                    <th className="px-6 py-4 w-40">Released</th>
                                    <th className="px-6 py-4 w-28 text-center">Status</th>
                                    <th className="px-6 py-4 w-32 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm bg-white dark:bg-surface-dark">
                                {loading ? (
                                    [...Array(4)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-16"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-32"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-48"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-20"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-16 mx-auto"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-16 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredVersions.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <Tag className="w-12 h-12 mb-3 opacity-20" />
                                                <p className="font-medium">No versions found.</p>
                                                <p className="text-xs mt-1">Click "Add Version" to create your first release.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVersions.map((v) => (
                                        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-mono font-bold border border-purple-200 dark:border-purple-500/20">
                                                    v{v.version}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{v.title}</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs">
                                                <p className="line-clamp-2 text-xs leading-relaxed">{v.changelog || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {v.releasedAt ? new Date(v.releasedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                </div>
                                                {v.releasedAt && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5 pl-5">{formatDistanceToNow(new Date(v.releasedAt), { addSuffix: true })}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {v.isCurrent ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-500/20">
                                                        <Star className="w-3 h-3" /> Current
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Past</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditModal(v)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(v)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* ──── Create / Edit Modal ──── */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editing ? 'Edit Version' : 'Add New Version'}</h3>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 flex flex-col gap-5">
                            {/* Version + Release Date Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Version *</label>
                                    <input
                                        value={form.version}
                                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                                        placeholder="e.g. 1.2.0"
                                        className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Release Date</label>
                                    <input
                                        type="date"
                                        value={form.releasedAt}
                                        onChange={(e) => setForm({ ...form, releasedAt: e.target.value })}
                                        className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                    />
                                </div>
                            </div>

                            {/* Title */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Title *</label>
                                <input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Bug Fixes & New Features"
                                    className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                            </div>

                            {/* Changelog */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Changelog</label>
                                <textarea
                                    value={form.changelog}
                                    onChange={(e) => setForm({ ...form, changelog: e.target.value })}
                                    placeholder="Enter changelog details...&#10;&#10;- Added new feature X&#10;- Fixed bug Y&#10;- Improved performance Z"
                                    rows={6}
                                    className="px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed"
                                />
                            </div>

                            {/* Mark as Current */}
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={form.isCurrent}
                                        onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 rounded-full bg-slate-200 dark:bg-white/10 peer-checked:bg-green-500 transition-colors"></div>
                                    <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-4"></div>
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Mark as Current Version</span>
                            </label>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                            <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-60"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {editing ? 'Save Changes' : 'Create Version'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVersioning;

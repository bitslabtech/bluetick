import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Tag, Trash2, Edit2, Plus, Check } from 'lucide-react';
import { useUI } from '../context/UIContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#64748b', // slate
    '#0ea5e9', // light blue
];

export default function ManageLabelsModal({ onClose }) {
    const { showModal, showToast } = useUI();
    const [labels, setLabels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editingLabel, setEditingLabel] = useState(null); // { id, name, color } or 'new' for creation
    const [formName, setFormName] = useState('');
    const [formColor, setFormColor] = useState(DEFAULT_COLORS[0]);
    const [confirmDelete, setConfirmDelete] = useState(null); // ID of label to delete

    useEffect(() => {
        fetchLabels();
    }, []);

    const fetchLabels = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/labels`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setLabels(res.data);
        } catch (err) {
            console.error('Failed to fetch labels', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingLabel === 'new') {
                const res = await axios.post(`${API_BASE}/api/labels`, { name: formName, color: formColor }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                setLabels([res.data, ...labels]);
            } else {
                const res = await axios.put(`${API_BASE}/api/labels/${editingLabel.id}`, { name: formName, color: formColor }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                setLabels(labels.map(l => l.id === editingLabel.id ? res.data : l));
            }
            setEditingLabel(null);
        } catch (err) {
            console.error('Failed to save label', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_BASE}/api/labels/${id}`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setLabels(labels.filter(l => l.id !== id));
            showToast({ type: 'success', title: 'Label Deleted', message: 'Label removed successfully.' });
        } catch (err) {
            console.error('Failed to delete label', err);
            showToast({ type: 'error', title: 'Error', message: 'Failed to delete label.' });
        } finally {
            setConfirmDelete(null);
        }
    };

    const openEdit = (label) => {
        setEditingLabel(label);
        setFormName(label.name);
        setFormColor(label.color);
    };

    const openCreate = () => {
        setEditingLabel('new');
        setFormName('');
        setFormColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white">Manage Labels</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {editingLabel ? (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. VIP Customer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {DEFAULT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormColor(color)}
                                            className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
                                            style={{
                                                backgroundColor: color,
                                                borderColor: formColor === color ? '#cbd5e1' : 'transparent',
                                                transform: formColor === color ? 'scale(1.1)' : 'scale(1)'
                                            }}
                                        >
                                            {formColor === color && <div className="w-3 h-3 bg-white rounded-full"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingLabel(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving || !formName} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save Label'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8 text-slate-500">Loading labels...</div>
                            ) : labels.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                                    <p className="text-sm">No labels created yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                                    {labels.map(label => (
                                        <div key={label.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 group transition-colors hover:bg-slate-100 dark:hover:bg-white/10 relative overflow-hidden">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: label.color }}></div>
                                                <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{label.name}</span>
                                            </div>

                                            {/* Action Buttons / Confimation */}
                                            {confirmDelete === label.id ? (
                                                <div className="flex items-center gap-1 animate-in slide-in-from-right-4 duration-200">
                                                    <span className="text-xs text-red-500 font-medium mr-2">Sure?</span>
                                                    <button onClick={() => handleDelete(label.id)} className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setConfirmDelete(null)} className="p-1.5 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:text-slate-300 dark:bg-white/10 dark:hover:bg-white/20 rounded-lg transition-colors shadow-sm">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(label)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setConfirmDelete(label.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={openCreate}
                                className="w-full py-3 flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors text-sm"
                            >
                                <Plus className="w-4 h-4" /> Create New Label
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

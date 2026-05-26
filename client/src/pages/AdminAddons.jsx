import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Edit, Trash2, CheckCircle, XCircle,
    UploadCloud, Server, Package, DownloadCloud, Tag, Layers, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const getCurrencySymbol = (c) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' }[c] || c || '$');

const AdminAddons = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchAddons();
    }, []);

    const fetchAddons = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/addons', { headers: { Authorization: `Bearer ${token}` } });
            setAddons(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load add-ons');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) return toast.error('Please select a zip file first.');

        const formData = new FormData();
        formData.append('pluginZip', uploadFile);

        setUploading(true);
        try {
            await axios.post('/api/admin/addons/upload', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Add-on deployed successfully!');
            setUploadModalOpen(false);
            setUploadFile(null);
            fetchAddons();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to deploy add-on');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you extremely sure you want to permanently delete the ${name} add-on? This may break active subscriptions!`)) return;
        try {
            await axios.delete(`/api/admin/addons/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Add-on terminated');
            fetchAddons();
        } catch (error) {
            console.error(error);
            toast.error('Failed to terminate add-on');
        }
    };

    return (
        <div className="p-4 md:p-6 w-[90%] max-w-none mx-auto space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        <Layers className="w-8 h-8 text-indigo-600" />
                        Add-on Marketplace Hub
                    </h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Deploy, manage, and configure premium plugins for your SaaS ecosystem.</p>
                </div>
                <button
                    onClick={() => setUploadModalOpen(true)}
                    className="mt-4 md:mt-0 flex items-center gap-2 px-4 md:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    <UploadCloud className="w-5 h-5" />
                    Deploy New Plugin
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {addons.map((addon) => (
                        <div key={addon.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 flex flex-col overflow-hidden">
                            <div className="flex flex-col flex-grow relative">
                                {addon.bannerUrl ? (
                                    <div className="relative h-40 w-full shrink-0 overflow-hidden">
                                        <img
                                            src={addon.bannerUrl}
                                            alt={addon.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                    </div>
                                ) : (
                                    <div className="relative h-32 w-full shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center overflow-hidden">
                                        <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner border border-white dark:border-gray-600 z-10">
                                            <Package className="w-8 h-8" />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="absolute top-4 right-4 z-20">
                                    {addon.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300 shadow-sm border border-green-200 dark:border-green-800/50 backdrop-blur-md">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-800 dark:bg-gray-800/90 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-600 backdrop-blur-md">
                                            Draft
                                        </span>
                                    )}
                                    {addon.badge && (
                                        <div className="mt-2 flex justify-end">
                                            <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                                                <Tag className="w-3 h-3" /> {addon.badge}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 md:p-6 flex flex-col flex-grow">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{addon.name}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">{addon.description}</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 flex flex-col justify-center border border-gray-100 dark:border-gray-700/50 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                            <Tag className="w-3.5 h-3.5" /> Price
                                        </div>
                                        <div className="flex items-baseline gap-0.5 font-bold text-gray-900 dark:text-white truncate">
                                            {addon.price > 0 ? (
                                                <>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 mr-0.5">{getCurrencySymbol(addon.currency)}</span>
                                                    <span className="text-base tabular-nums">
                                                        {Math.floor(Number(addon.price))}
                                                    </span>
                                                    <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
                                                        {addon.isRecurring ? `/${addon.recurringInterval[0]}` : ''}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-sm">Free</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-3 flex flex-col justify-center border border-indigo-100/50 dark:border-indigo-800/30 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 dark:text-indigo-400 mb-1">
                                            <Users className="w-3.5 h-3.5" /> Subscribers
                                        </div>
                                        <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-baseline gap-1 truncate">
                                            {addon.usersCount || 0}
                                            <span className="text-xs font-normal text-indigo-400/80 dark:text-indigo-500">Active</span>
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 flex items-center justify-between border border-gray-100 dark:border-gray-700/50 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            <Server className="w-3.5 h-3.5" /> Module Key
                                        </div>
                                        <code className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-2.5 py-1 rounded-md text-xs font-mono text-gray-700 dark:text-gray-300 shadow-sm truncate max-w-[50%]">
                                            {addon.module_key}
                                        </code>
                                    </div>
                                </div>
                            </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 md:px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => navigate(`/superadmin/addons/${addon.id}/config`)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleDelete(addon.id, addon.name)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {addons.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">No Add-ons Deployed Yet</h3>
                            <p className="text-gray-500 dark:text-gray-400">Upload a zip plugin to magically extend the platform's capabilities.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 md:p-8 transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <DownloadCloud className="w-6 h-6 text-indigo-600" />
                                Deploy Plugin Payload
                            </h2>
                            <button onClick={() => setUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="space-y-6">
                            <div className="border-2 border-dashed border-indigo-200 dark:border-gray-600 rounded-xl p-4 md:p-8 text-center hover:bg-indigo-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".zip"
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="pointer-events-none">
                                    <Package className="mx-auto h-12 w-12 text-indigo-400" />
                                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                        {uploadFile ? uploadFile.name : 'Click or drag ZIP payload here'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Must contain manifest.json at root level</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setUploadModalOpen(false)} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors">Cancel</button>
                                <button type="submit" disabled={uploading || !uploadFile} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2 transition-all">
                                    {uploading ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Deploying...</>
                                    ) : (
                                        'Deploy Now'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAddons;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, Bell, Globe, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VcardSettings() {
    const [settings, setSettings] = useState({
        emailNotifications: true,
        defaultEnquiryEmail: '',
        appointmentTimezone: 'UTC'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards/data/settings`);
                if (res.data) {
                    setSettings(res.data);
                }
            } catch (error) {
                console.error("Failed to load vcard settings:", error);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/vcards/data/settings`, settings);
            toast.success("Settings saved successfully");
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 animate-pulse text-slate-500">Loading settings...</div>;
    }

    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Settings className="w-6 h-6 text-indigo-600" />
                        veCard Global Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage global preferences for your digital business cards.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">Email Notifications</p>
                            <p className="text-sm text-slate-500">Receive an email when someone submits an enquiry or books an appointment.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={settings.emailNotifications}
                                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {settings.emailNotifications && (
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 animate-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Default Forwarding Email
                            </label>
                            <p className="text-xs text-slate-500 mb-3">If empty, notifications will be sent to your account's primary email address.</p>
                            <input 
                                type="email" 
                                placeholder="e.g. leads@mycompany.com"
                                value={settings.defaultEnquiryEmail || ''}
                                onChange={(e) => setSettings({ ...settings, defaultEnquiryEmail: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden mt-6">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                    <Globe className="w-5 h-5 text-slate-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white">Localization</h3>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Default Appointment Timezone
                    </label>
                    <select 
                        value={settings.appointmentTimezone || 'UTC'}
                        onChange={(e) => setSettings({ ...settings, appointmentTimezone: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    >
                        <option value="UTC">UTC (Universal Coordinated Time)</option>
                        <option value="America/New_York">Eastern Time (US & Canada)</option>
                        <option value="America/Chicago">Central Time (US & Canada)</option>
                        <option value="America/Denver">Mountain Time (US & Canada)</option>
                        <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Central European Time</option>
                        <option value="Asia/Dubai">Dubai</option>
                        <option value="Asia/Kolkata">India Standard Time (IST)</option>
                        <option value="Asia/Singapore">Singapore</option>
                        <option value="Australia/Sydney">Sydney</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                        This timezone is used for recording and displaying appointments requested via your veCard.
                    </p>
                </div>
            </div>
            
        </div>
    );
}

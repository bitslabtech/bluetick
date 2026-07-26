import React, { useState, useEffect } from 'react';
import { FileText, Save, Building2, Calculator, Settings as SettingsIcon, MessageSquare, Plus, Trash2, ShieldCheck, Mail, Phone, Info, X, Check, FileCheck, Receipt, Globe, Shield, Activity, CreditCard, Sparkles, Send } from 'lucide-react';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import MediaPickerModal from './MediaPickerModal';

const INDIAN_STATES_LIST = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
    'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
    'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal'
];

const STATE_CODES = {
    'Jammu and Kashmir': '01', 'Himachal Pradesh': '02', 'Punjab': '03', 'Chandigarh': '04',
    'Uttarakhand': '05', 'Haryana': '06', 'Delhi': '07', 'Rajasthan': '08',
    'Uttar Pradesh': '09', 'Bihar': '10', 'Sikkim': '11', 'Arunachal Pradesh': '12',
    'Nagaland': '13', 'Manipur': '14', 'Mizoram': '15', 'Tripura': '16', 'Meghalaya': '17',
    'Assam': '18', 'West Bengal': '19', 'Jharkhand': '20', 'Odisha': '21',
    'Chhattisgarh': '22', 'Madhya Pradesh': '23', 'Gujarat': '24',
    'Dadra and Nagar Haveli and Daman and Diu': '26', 'Maharashtra': '27',
    'Andhra Pradesh': '28', 'Karnataka': '29', 'Goa': '30', 'Lakshadweep': '31',
    'Kerala': '32', 'Tamil Nadu': '33', 'Puducherry': '34', 'Andaman and Nicobar Islands': '35',
    'Telangana': '36', 'Ladakh': '38'
};

const Toggle = ({ enabled, onChange, danger }) => (
    <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${enabled
            ? (danger ? 'bg-red-500' : 'bg-emerald-500')
            : 'bg-slate-200 dark:bg-slate-700'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

const Label = ({ text }) => (
    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block mb-1.5 ml-1">{text}</label>
);

const Input = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div className="group">
        {label && <Label text={label} />}
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-black/20 dark:hover:bg-black/30 dark:focus:bg-black/40 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-400" />
    </div>
);

const SelectField = ({ label, value, onChange, children }) => (
    <div className="group">
        {label && <Label text={label} />}
        <select value={value || ''} onChange={e => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-black/20 dark:hover:bg-black/30 dark:focus:bg-black/40 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
            {children}
        </select>
    </div>
);

const ToggleRow = ({ label, desc, value, onChange }) => (
    <div className="flex justify-between items-center p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-md transition-all cursor-pointer group" onClick={() => onChange(!value)}>
        <div>
            <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</div>
            {desc && <div className="text-xs font-medium text-slate-500 mt-1 leading-relaxed pr-4">{desc}</div>}
        </div>
        <div onClick={e => e.stopPropagation()}>
            <Toggle enabled={!!value} onChange={onChange} />
        </div>
    </div>
);

const Section = ({ title, icon, children, badge }) => (
    <div className="bg-white dark:bg-surface-dark border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-500/20 dark:to-indigo-500/5 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl shadow-inner border border-indigo-100/50 dark:border-indigo-500/20">
                    {icon}
                </div>
                <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight">{title}</h3>
            </div>
            {badge && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">{badge}</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">{children}</div>
    </div>
);


const InvoiceConfigPanel = () => {
    const { showToast } = useUI();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/system`);
            setConfig(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const onSave = async (payload) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/system/settings`, payload);
            showToast({ type: 'success', title: 'Saved', message: 'Configuration saved successfully' });
            fetchConfig();
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to save configuration' });
            throw err;
        }
    };

    const ic = config?.settings?.invoiceConfig || {};
    const [form, setForm] = useState({ ...ic });
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [newCcNumber, setNewCcNumber] = useState('');
    const [testPhone, setTestPhone] = useState('');
    const [testSending, setTestSending] = useState(false);
    const [saving, setSaving] = useState(false);
    const [waTemplates, setWaTemplates] = useState([]);

    const handlePreviewClick = async () => {
        setShowPreview(true);
        setPreviewLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/invoices/preview`, { invoiceConfig: form }, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            setPreviewUrl(url);
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', message: 'Failed to load PDF preview' });
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        setShowPreview(false);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    useEffect(() => { setForm({ ...(config?.settings?.invoiceConfig || {}) }); }, [config]);

    // Fetch available WA templates from system CRM
    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/api/templates/system`)
            .then(r => setWaTemplates(r.data?.templates || r.data || []))
            .catch(() => {});
    }, []);

    if (loading || !config) return <div className="p-8 text-center text-slate-500">Loading Configuration...</div>;

    const updateIc = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleStateChange = (state) => {
        setForm(f => ({ ...f, sellerState: state, sellerStateCode: STATE_CODES[state] || '' }));
    };

    const handleTemplateChange = (templateName) => {
        updateIc('invoiceWaTemplateName', templateName);
        if (templateName) {
            const selected = waTemplates.find(t => t.name === templateName);
            if (selected && selected.language) {
                updateIc('invoiceWaLanguageCode', selected.language);
            }
        }
    };

    const addCcNumber = () => {
        const cleaned = newCcNumber.replace(/\D/g, '');
        if (!cleaned || cleaned.length < 10) return;
        const current = form.ccNumbers || [];
        if (current.includes(cleaned)) return;
        updateIc('ccNumbers', [...current, cleaned]);
        setNewCcNumber('');
    };

    const removeCcNumber = (num) => updateIc('ccNumbers', (form.ccNumbers || []).filter(n => n !== num));

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                settings: { ...config.settings, invoiceConfig: { ...form } }
            });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleTestInvoice = async () => {
        if (!testPhone) return;
        setTestSending(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/invoices/test-send`, { phone: testPhone });
            showToast && showToast({ type: 'success', message: `Test invoice sent to ${testPhone}!` });
        } catch (err) {
            showToast && showToast({ type: 'error', message: err.response?.data?.error || 'Failed to send test invoice.' });
        } finally {
            setTestSending(false);
        }
    };



    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-12">
            {/* Header Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute -top-12 -right-12 p-12 opacity-5 dark:opacity-10 pointer-events-none transform rotate-12">
                    <Receipt className="w-64 h-64 text-indigo-600 dark:text-white" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-3 tracking-tight mb-2">
                        Taxation & Billing Core
                    </h2>
                    <p className="text-sm font-semibold text-slate-600/80 dark:text-slate-400 max-w-xl leading-relaxed">
                        Establish your enterprise billing identity, configure GST routing logic, and manage automated WhatsApp invoice templates.
                    </p>
                </div>
                <div className="relative z-10 shrink-0 flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={handlePreviewClick}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-indigo-700 bg-white/80 hover:bg-white transition-all shadow-sm hover:shadow-md border border-white/50"
                    >
                        <FileText className="w-5 h-5" /> Preview PDF
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all transform active:scale-95 shadow-lg ${saving ? 'bg-indigo-400 shadow-none cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-500/30 hover:-translate-y-0.5'}`}
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Applying...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            <Section title="Invoice Type & Prefix" icon="🏷️">
                <SelectField label="Invoice Type" value={form.invoiceType} onChange={v => updateIc('invoiceType', v)}>
                    <option value="tax_invoice">Tax Invoice (with GST breakdown)</option>
                    <option value="quotation">Quotation (no GST breakdown)</option>
                </SelectField>
                <div className="flex flex-col justify-between group">
                    <Label text="Invoice Prefix & Counter" />
                    <div className="flex gap-3">
                        <input value={form.invoicePrefix || 'INV'} onChange={e => updateIc('invoicePrefix', e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 focus:bg-white dark:bg-black/20 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-mono font-bold"
                            placeholder="INV" maxLength={10} />
                        <div>
                            <input type="number" value={form.invoiceStartNumber || 1}
                                onChange={e => updateIc('invoiceStartNumber', parseInt(e.target.value))}
                                className="w-24 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 focus:bg-white dark:bg-black/20 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-mono"
                                min="1" placeholder="Start #" />
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mt-2 ml-1">Example: {form.invoicePrefix || 'INV'}-{new Date().getFullYear()}-{String(form.currentInvoiceSequence || 1).padStart(4, '0')}</div>
                </div>
            </Section>

            <Section title="Business Identity" icon="🏢">
                <Input label="Company Name" value={form.sellerName} onChange={v => updateIc('sellerName', v)} placeholder="Your Company Pvt. Ltd." />
                <Input label="GSTIN" value={form.sellerGstin} onChange={v => updateIc('sellerGstin', v)} placeholder="22AABCC1234F1ZV" />
                <Input label="PAN" value={form.sellerPan} onChange={v => updateIc('sellerPan', v)} placeholder="AABCC1234F" />
                <Input label="CIN (optional)" value={form.sellerCin} onChange={v => updateIc('sellerCin', v)} placeholder="U72200TN2022PTC123456" />
                <Input label="Billing Email" value={form.sellerEmail} onChange={v => updateIc('sellerEmail', v)} placeholder="billing@yourcompany.com" />
                <Input label="Billing Phone" value={form.sellerPhone} onChange={v => updateIc('sellerPhone', v)} placeholder="+919876543210" />
                <div className="md:col-span-2 group">
                    <Label text="Registered Address" />
                    <textarea value={form.sellerAddress || ''} onChange={e => updateIc('sellerAddress', e.target.value)} rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-black/20 dark:hover:bg-black/30 dark:focus:bg-black/40 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-400 resize-none"
                        placeholder="Street, City, State - PIN" />
                </div>
                <SelectField label="State" value={form.sellerState} onChange={handleStateChange}>
                    <option value="">Select state…</option>
                    {INDIAN_STATES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </SelectField>
                <Input label="State Code" value={form.sellerStateCode} onChange={v => updateIc('sellerStateCode', v)} placeholder="36" />
            </Section>

            <Section title="Tax / GST Settings" icon="🧾">
                <div className="md:col-span-2 space-y-3">
                    <ToggleRow label="GST Enabled" desc="Enable GST calculation and breakdown on invoices" value={form.gstEnabled} onChange={v => updateIc('gstEnabled', v)} />
                    <ToggleRow label="Always Use IGST" desc="If disabled, auto-detects IGST (inter-state) vs CGST+SGST (intra-state) by comparing buyer/seller state" value={form.useIgstAlways} onChange={v => updateIc('useIgstAlways', v)} />
                </div>
                <SelectField label="GST Type" value={form.gstType} onChange={v => updateIc('gstType', v)}>
                    <option value="exclusive">Exclusive — Price + GST (GST added on top)</option>
                    <option value="inclusive">Inclusive — Price includes GST (GST extracted from price)</option>
                </SelectField>
                <Input label="GST Rate (%)" type="number" value={form.defaultGstRate} onChange={v => updateIc('defaultGstRate', parseFloat(v))} placeholder="18" />
                <Input label="HSN/SAC Code" value={form.hsnSacCode} onChange={v => updateIc('hsnSacCode', v)} placeholder="998314" />
            </Section>

            <Section title="Invoice Customization" icon="📋">
                <Input label="Authorized Signatory Name" value={form.authorizedSignatoryName} onChange={v => updateIc('authorizedSignatoryName', v)} placeholder="Authorized Signatory" />
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <Input label="Signature Image URL" value={form.authorizedSignatureUrl} onChange={v => updateIc('authorizedSignatureUrl', v)} placeholder="https://. or /uploads/signature.png" />
                    </div>
                    <button type="button" onClick={() => setPickerOpen(true)} className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-sm border border-slate-200 dark:border-white/10 transition-colors h-[46px] mb-[-1px]">
                        Upload
                    </button>
                </div>
                <Input label="Payment Terms" value={form.paymentTerms} onChange={v => updateIc('paymentTerms', v)} placeholder="Immediate" />
                <div className="md:col-span-2 group">
                    <Label text="Invoice Footer Notes" />
                    <textarea value={form.invoiceNotes || ''} onChange={e => updateIc('invoiceNotes', e.target.value)} rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-black/20 dark:hover:bg-black/30 dark:focus:bg-black/40 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-400 resize-none"
                        placeholder="Thank you for your business!" />
                </div>
                <Input label="Plan Description Template" value={form.planDescriptionTemplate} onChange={v => updateIc('planDescriptionTemplate', v)} placeholder="{plan_name} Subscription" />
                <Input label="Addon Description Template" value={form.addonDescriptionTemplate} onChange={v => updateIc('addonDescriptionTemplate', v)} placeholder="{addon_name} Add-on" />
                <div className="md:col-span-2">
                    <Input label="Topup Description Template" value={form.topupDescriptionTemplate} onChange={v => updateIc('topupDescriptionTemplate', v)} placeholder="{item_name} Top-up" />
                </div>
            </Section>

            <Section title="WhatsApp Invoice Delivery" icon="📲">
                <SelectField label="Invoice WA Template (from CRM)" value={form.invoiceWaTemplateName} onChange={handleTemplateChange}>
                    <option value="">— Select a template —</option>
                    {waTemplates.map(t => (
                        <option key={t.name || t.id} value={t.name}>{t.name} {t.language ? `(${t.language})` : ''}</option>
                    ))}
                </SelectField>
                <Input label="Template Language Code" value={form.invoiceWaLanguageCode} onChange={v => updateIc('invoiceWaLanguageCode', v)} placeholder="en" />

                {/* Variable guide */}
                <div className="md:col-span-2 p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-2xl border border-blue-100 dark:border-blue-700/30">
                    <div className="text-sm font-black text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" /> WhatsApp Template Variable Guide
                    </div>
                    <p className="text-sm font-medium text-blue-600/80 dark:text-blue-300 mb-4">Create your Meta template with these body variables in order:</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="text-blue-700 dark:text-blue-400 border-b border-blue-200/50 dark:border-blue-800/50"><th className="text-left font-black pb-2 pr-4">Variable</th><th className="text-left font-black pb-2 pr-4">Content</th><th className="text-left font-black pb-2">Example</th></tr></thead>
                            <tbody className="text-blue-800 dark:text-blue-200">
                                {[
                                    ['{{1}}', 'Customer name', 'Rahul Sharma'],
                                ].map(([v, c, e]) => (
                                    <tr key={v} className="border-b border-blue-100/30 dark:border-blue-900/30 last:border-0"><td className="pr-4 py-2 font-mono font-bold bg-blue-100/50 dark:bg-blue-800/30 rounded px-2 my-1 inline-block">{v}</td><td className="pr-4 py-2 font-semibold">{c}</td><td className="py-2 text-blue-500 dark:text-blue-400 font-medium">{e}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-4 flex items-center gap-2">
                        <span className="text-lg">💡</span> Set the Header type to Document. The PDF will be attached to the template's header automatically.
                    </p>
                </div>

                <div className="md:col-span-2 space-y-3">
                    <ToggleRow label="Send CC Copies to Admin Numbers" desc="Send a copy of each invoice to all numbers listed below" value={form.sendCcOnPurchase} onChange={v => updateIc('sendCcOnPurchase', v)} />
                    <div>
                        <Label text="Admin CC WhatsApp Numbers" />
                        <p className="text-xs font-semibold text-slate-400 mb-3">These numbers receive a copy when any user invoice is sent. Separate from admin notification numbers.</p>
                        <div className="flex gap-3 mb-4">
                            <input value={newCcNumber} onChange={e => setNewCcNumber(e.target.value)}
                                placeholder="Country code + number (e.g. 919876543210)"
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 focus:bg-white dark:bg-black/20 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                                onKeyDown={e => e.key === 'Enter' && addCcNumber()} />
                            <button onClick={addCcNumber} className="px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 shadow-sm">Add Number</button>
                        </div>
                        {(form.ccNumbers || []).length === 0 ? (
                            <div className="text-sm font-medium text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/30 dark:bg-black/10">No CC numbers added yet</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(form.ccNumbers || []).map(num => (
                                    <div key={num} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 text-sm font-mono font-bold">
                                        {num}
                                        <button onClick={() => removeCcNumber(num)} className="hover:bg-indigo-200 dark:hover:bg-indigo-500/30 p-1 rounded-md transition-colors text-indigo-500"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2 pt-6 mt-4 border-t border-slate-200 dark:border-white/10">
                    <Label text="Test Invoice Sending" />
                    <p className="text-xs font-semibold text-slate-400 mb-4">Send a sample invoice to a WhatsApp number to verify the PDF layout and Meta template.</p>
                    <div className="flex gap-3">
                        <input value={testPhone} onChange={e => setTestPhone(e.target.value)}
                            placeholder="Recipient Phone (e.g. 919876543210)"
                            className="flex-1 max-w-sm px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 focus:bg-white dark:bg-black/20 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono" />
                        <button onClick={handleTestInvoice} disabled={testSending || !testPhone}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm ${testSending || !testPhone ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20'}`}>
                            {testSending ? <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                            {testSending ? 'Sending...' : 'Send Test Invoice'}
                        </button>
                    </div>
                </div>
            </Section>
            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-100 dark:bg-surface-dark w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative border border-slate-200/50 dark:border-white/10">
                        <div className="sticky top-0 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 p-4 flex justify-between items-center z-20">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500"/> PDF Preview</h3>
                            <button onClick={closePreview} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <div className="p-0 h-[75vh] w-full bg-slate-50 dark:bg-slate-900 rounded-b-3xl overflow-hidden flex flex-col">
                            {previewLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                    <div className="font-semibold animate-pulse">Generating Premium PDF Preview...</div>
                                </div>
                            ) : previewUrl ? (
                                <iframe src={previewUrl} className="w-full h-full border-none" title="PDF Preview" />
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-500">Failed to load preview</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Media Picker Modal */}
            <MediaPickerModal
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={(url) => updateIc('authorizedSignatureUrl', url)}
                accessMode="restricted"
                allowedTypes="image"
                multiple={false}
                title="Select Signature Image"
            />
        </div>
    );
};

export default InvoiceConfigPanel;

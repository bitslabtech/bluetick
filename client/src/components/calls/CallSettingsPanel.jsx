import { useEffect, useState } from 'react';
import axios from 'axios';
import { Smartphone, X, Loader2, Sparkles } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import TemplatePreview from './TemplatePreview';

const card = 'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm';
const errMsg = (e) => e?.response?.data?.msg || e?.response?.data?.error || e?.message || 'Something went wrong';
const same = (a, b) => a.enabled === b.enabled && a.mode === b.mode && a.text === b.text && a.templateId === b.templateId;
const statusLabel = (s) => ({ APPROVED: 'Approved', PENDING: 'In review', REJECTED: 'Rejected' }[s] || s);
const statusTone = (s) => (s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : s === 'PENDING' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300');

function Toggle({ checked, onChange, disabled, label }) {
    return (
        <button
            type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-white/20'}`}
        >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
    );
}

function Row({ title, sub, children }) {
    return (
        <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
                {sub ? <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p> : null}
            </div>
            {children}
        </div>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
            <div className={`${card} w-full sm:max-w-xl max-h-[85vh] flex flex-col rounded-b-none sm:rounded-2xl`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                    <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="overflow-y-auto p-5">{children}</div>
            </div>
        </div>
    );
}

/** One automatic message (missed call or closed): on/off, Text or Template, template picker. */
function AutoMessageField({ which, title, sub, value, selected, editable, onChange, onStatus }) {
    const { showToast } = useUI();
    const [options, setOptions] = useState(null); // { templates, suggestions } | 'error'
    const [picker, setPicker] = useState(false);
    const [suggest, setSuggest] = useState(false);
    const [creating, setCreating] = useState(false);

    const loadOptions = async () => {
        setOptions(null);
        try { setOptions((await axios.get('/api/calls/message-templates')).data); } catch { setOptions('error'); }
    };
    useEffect(() => { if ((picker || suggest) && !options) void loadOptions(); }, [picker, suggest]); // eslint-disable-line react-hooks/exhaustive-deps

    const pickable = options && options !== 'error' ? options.templates.filter((t) => t.usable || t.status === 'PENDING') : [];
    const suggestion = options && options !== 'error' ? options.suggestions.find((s) => s.which === which) : null;

    const createSuggested = async () => {
        setCreating(true);
        try {
            const { data } = await axios.post('/api/calls/message-templates', { which, body: suggestion.body });
            onStatus(data);
            setSuggest(false);
            showToast({ type: 'success', title: 'Submitted to WhatsApp', message: 'The template is in review. It is used once WhatsApp approves it; until then the text message is sent.' });
        } catch (e) {
            showToast({ type: 'error', title: 'Could not submit', message: errMsg(e) });
        } finally {
            setCreating(false);
        }
    };

    const seg = (m, label) => (
        <button
            type="button" disabled={!editable}
            onClick={() => onChange({ ...value, mode: m })}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${value.mode === m ? 'bg-white dark:bg-[#1a2332] text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
        >{label}</button>
    );

    return (
        <div className="border-t border-slate-100 dark:border-white/10 first:border-t-0">
            <Row title={title} sub={sub}>
                <Toggle label={title} checked={value.enabled} disabled={!editable} onChange={(enabled) => onChange({ ...value, enabled })} />
            </Row>
            {value.enabled ? (
                <div className="px-5 pb-5 space-y-3">
                    <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 max-w-xs">{seg('text', 'Text')}{seg('template', 'Template')}</div>
                    {value.mode === 'text' ? (
                        <>
                            <textarea
                                value={value.text} disabled={!editable} maxLength={1000} rows={3}
                                onChange={(e) => onChange({ ...value, text: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Text can only reach customers who messaged you in the last 24 hours. Use a template to reach everyone.</p>
                        </>
                    ) : (
                        <div className="space-y-3">
                            {selected ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{selected.name}</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusTone(selected.status)}`}>{statusLabel(selected.status)}</span>
                                    </div>
                                    <TemplatePreview content={selected.content} headerText={selected.headerText} footer={selected.footer} buttons={selected.buttons} />
                                    {!selected.usable && selected.status === 'APPROVED' ? <p className="text-xs text-red-600">This template can’t be used for call messages. Choose another.</p> : null}
                                    {selected.status === 'PENDING' ? <p className="text-xs text-amber-600">In review at WhatsApp. Until it is approved, the text message is sent where possible.</p> : null}
                                </div>
                            ) : value.templateId ? (
                                <p className="text-xs text-slate-500">Template selected. Save to see its preview.</p>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No template selected yet.</p>
                            )}
                            {editable ? (
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setPicker(true)} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">Choose template</button>
                                    <button onClick={() => setSuggest(true)} className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" />Use suggested</button>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            ) : null}

            {picker ? (
                <Modal title="Choose a template" onClose={() => setPicker(false)}>
                    {!options ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                        : options === 'error' ? (
                            <div className="space-y-3"><p className="text-sm text-slate-500">Could not load your templates.</p><button onClick={loadOptions} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10">Try again</button></div>
                        ) : (
                            <div className="space-y-3">
                                {pickable.length === 0 ? <p className="text-sm text-slate-500">None of your templates can be used here (they need a simple message with at most one variable). Use the suggested one.</p> : null}
                                {pickable.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => { onChange({ ...value, enabled: true, mode: 'template', templateId: t.id }); setPicker(false); }}
                                        className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-indigo-400 space-y-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{t.name}</span>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusTone(t.status)}`}>{statusLabel(t.status)}</span>
                                        </div>
                                        <TemplatePreview content={t.content} headerText={t.headerText} footer={t.footer} buttons={t.buttons} />
                                    </button>
                                ))}
                            </div>
                        )}
                </Modal>
            ) : null}

            {suggest ? (
                <Modal title="Suggested template" onClose={() => !creating && setSuggest(false)}>
                    {!options ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                        : options === 'error' || !suggestion ? (
                            <div className="space-y-3"><p className="text-sm text-slate-500">Could not load the suggested template.</p><button onClick={loadOptions} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10">Try again</button></div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-300">We submit this to WhatsApp for approval (usually minutes, sometimes up to a day). It is selected for this message automatically.</p>
                                <TemplatePreview content={suggestion.body} sample={suggestion.sample} />
                                <button disabled={creating} onClick={createSuggested} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Submit to WhatsApp
                                </button>
                            </div>
                        )}
                </Modal>
            ) : null}
        </div>
    );
}

/** Voice calling settings (owner/admin edit; others read-only). Same endpoints as the mobile app. */
export default function CallSettingsPanel({ status, onStatus }) {
    const { showToast } = useUI();
    const [draft, setDraft] = useState(status.callSettings);
    const [saving, setSaving] = useState(false);
    useEffect(() => { setDraft(status.callSettings); }, [status]);

    const editable = !!status.canManage && !saving;
    const dirty = !same(draft.missedCallMessage, status.callSettings.missedCallMessage) || !same(draft.closedMessage, status.callSettings.closedMessage);

    const save = async (patch) => {
        setSaving(true);
        try {
            const { data } = await axios.put('/api/calls/settings', patch);
            onStatus(data);
            showToast({ type: 'success', title: 'Saved' });
        } catch (e) {
            setDraft(status.callSettings);
            showToast({ type: 'error', title: 'Could not save', message: errMsg(e) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 p-4 text-sm text-indigo-900 dark:text-indigo-200">
                <Smartphone className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Calls are answered in the <strong>OneDash mobile app</strong>. Install it and sign in on the phones that should ring. The website shows call history and settings only.</p>
            </div>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Calling</h3>
                <div className={`${card} divide-y divide-slate-100 dark:divide-white/10`}>
                    <Row title="Accept WhatsApp calls" sub={status.canManage ? 'Customers see a call button in your WhatsApp chat.' : 'Only the owner or an admin can change this.'}>
                        <Toggle label="Accept WhatsApp calls" checked={status.callSettings.enabled} disabled={!editable} onChange={(v) => save({ enabled: v })} />
                    </Row>
                    <Row title="Also take calls outside business hours" sub="Off: calls outside your business hours are refused and the caller gets the closed message.">
                        <Toggle label="Also take calls outside business hours" checked={status.callSettings.allowOutsideHours} disabled={!editable} onChange={(v) => save({ allowOutsideHours: v })} />
                    </Row>
                </div>
                {status.callSettings.suspended ? (
                    <p className="text-xs text-amber-600 mt-2 px-1">Calling is paused at WhatsApp because your account no longer qualifies. It switches back on automatically when it does.</p>
                ) : null}
            </section>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Automatic messages</h3>
                <div className={card}>
                    <AutoMessageField
                        which="missedCallMessage" title="Missed call message" sub="Sent when nobody answers."
                        value={draft.missedCallMessage} selected={status.messageTemplates?.missedCallMessage}
                        editable={editable} onChange={(missedCallMessage) => setDraft({ ...draft, missedCallMessage })} onStatus={onStatus}
                    />
                    <AutoMessageField
                        which="closedMessage" title="Closed message" sub="Sent when a call comes in outside business hours."
                        value={draft.closedMessage} selected={status.messageTemplates?.closedMessage}
                        editable={editable} onChange={(closedMessage) => setDraft({ ...draft, closedMessage })} onStatus={onStatus}
                    />
                </div>
                {dirty && status.canManage ? (
                    <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => setDraft(status.callSettings)} className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">Discard</button>
                        <button disabled={saving} onClick={() => save({ missedCallMessage: draft.missedCallMessage, closedMessage: draft.closedMessage })} className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white disabled:opacity-60 inline-flex items-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save messages
                        </button>
                    </div>
                ) : null}
            </section>
        </div>
    );
}

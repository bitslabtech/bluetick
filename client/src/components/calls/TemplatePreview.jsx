// WhatsApp-style bubble preview of a template (header, body with {{1}} filled, footer, buttons).
export default function TemplatePreview({ content, headerText, footer, buttons, sample = 'Asha' }) {
    const body = String(content || '').replace(/\{\{\s*1\s*\}\}/g, sample);
    return (
        <div className="rounded-2xl bg-[#e7ffdb] dark:bg-[#1f3a2c] p-3 text-sm text-slate-800 dark:text-slate-100 max-w-md shadow-sm">
            {headerText ? <p className="font-semibold mb-1">{headerText}</p> : null}
            <p className="whitespace-pre-wrap leading-relaxed">{body}</p>
            {footer ? <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{footer}</p> : null}
            {buttons?.length ? (
                <div className="mt-2 border-t border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10">
                    {buttons.map((b, i) => (
                        <p key={i} className="py-1.5 text-center text-sky-600 dark:text-sky-400 font-medium">{b.text}</p>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

import React, { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { AlertTriangle } from 'lucide-react';
import { unsupportedHtmlFeatures } from '../utils/richContent';

// Alignment is saved as an inline style (text-align), so it shows on every page that displays the
// content, and pasted HTML that already uses text-align keeps it. Colour and highlight are inline
// styles by default.
Quill.register(Quill.import('attributors/style/align'), true);

const DEFAULT_TOOLBAR = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['blockquote', 'link', 'image'],
    ['clean'],
];
const DEFAULT_MODULES = { toolbar: DEFAULT_TOOLBAR };

/**
 * The visual page editor. It saves only what the person actually changes: when a page is opened,
 * the editor converts the HTML into its own format, and before this wrapper that conversion was
 * saved straight away, silently dropping anything it can't show (alignment, CSS classes, tables…).
 * If the page has such formatting, a warning says so and points to HTML Source.
 */
export default function RichTextEditor({ value, onChange, modules = DEFAULT_MODULES, warn = true, article = false, ...rest }) {
    const lost = useMemo(() => (warn ? unsupportedHtmlFeatures(value) : []), [value, warn]);
    return (
        // rich-editor (index.css): same spacing and heading sizes as the published page
        <div className={article ? 'rich-editor is-article' : 'rich-editor'}>
            {lost.length > 0 && (
                <div role="note" className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        This page uses formatting the visual editor can't keep: {lost.join(', ')}. Edit it in <strong>HTML Source</strong>; typing here will remove that formatting.
                    </span>
                </div>
            )}
            <ReactQuill
                theme="snow"
                value={value || ''}
                onChange={(html, _delta, source) => {
                    if (source === 'user') onChange(html);
                }}
                modules={modules}
                {...rest}
            />
        </div>
    );
}

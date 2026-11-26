/**
 * HTML written in the page editors (superadmin pages, blog, store pages) before it is shown.
 *
 * The visual editor (Quill 2) saves every space as a non-breaking space (&nbsp;), so published
 * paragraphs could not wrap and ran off the side of the page while they looked fine in the editor.
 * Turning them back into normal spaces fixes pages that were already saved, too.
 */
export function normalizeEditorHtml(html) {
    if (typeof html !== 'string') return '';
    return html.replace(/&nbsp;|\u00a0/g, ' ');
}

// What the visual editor (Quill) can show and keep. Anything else survives only in HTML Source.
const VISUAL_TAGS = new Set([
    'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'a', 'ol', 'ul', 'li', 'img', 'blockquote', 'pre', 'code', 'sub', 'sup', 'span', 'iframe',
]);
const VISUAL_ATTRS = new Set(['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'frameborder', 'allowfullscreen', 'class', 'style']);
const VISUAL_STYLES = new Set(['color', 'background-color', 'text-align']);
const TAG_LABELS = {
    div: 'layout blocks (<div>)', section: 'layout blocks (<section>)', table: 'tables', mark: 'highlights (<mark>)',
    del: 'deleted text (<del>)', ins: 'inserted text (<ins>)', hr: 'divider lines (<hr>)', small: 'small text (<small>)',
    style: '<style> blocks', script: 'scripts', button: 'buttons', form: 'forms', video: 'video tags',
};

/**
 * Formatting in this HTML that the visual editor would remove as soon as someone types in it,
 * as short labels for a warning ("tables", "CSS class names"…). Empty when the visual editor is safe.
 */
export function unsupportedHtmlFeatures(html) {
    if (typeof html !== 'string' || !html.trim() || typeof DOMParser === 'undefined') return [];
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const found = new Set();
    for (const el of doc.body.querySelectorAll('*')) {
        const tag = el.tagName.toLowerCase();
        if (['thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col'].includes(tag)) { found.add('tables'); continue; }
        if (!VISUAL_TAGS.has(tag)) { found.add(TAG_LABELS[tag] || `<${tag}> tags`); continue; }
        for (const { name } of el.attributes) {
            if (name === 'class') {
                if (el.className.split(/\s+/).some(c => c && !c.startsWith('ql-'))) found.add('CSS class names');
            } else if (name === 'style') {
                const props = [...el.style].filter(p => !VISUAL_STYLES.has(p));
                if (props.length) found.add(`inline styles (${props.slice(0, 3).join(', ')})`);
            } else if (!VISUAL_ATTRS.has(name) && !name.startsWith('data-')) {
                found.add(`"${name}" attributes`);
            }
        }
    }
    return [...found];
}

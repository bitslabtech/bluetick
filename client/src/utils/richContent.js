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

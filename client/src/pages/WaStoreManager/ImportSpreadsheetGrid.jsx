import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Trash2, RotateCcw } from 'lucide-react';

// ─── Validation helpers ────────────────────────────────────────────────────────
function validateRow(row, existingSkuSet, fileSkuMap, rowId) {
    const errors = {};
    const warnings = {};

    const name = String(row.name || '').trim();
    if (!name) errors.name = 'Required';
    else if (name.length > 200) errors.name = `Too long (${name.length}/200)`;

    const priceRaw = String(row.price ?? '').trim();
    const price = parseFloat(priceRaw);
    if (!priceRaw) errors.price = 'Required';
    else if (isNaN(price)) errors.price = 'Must be a number';
    else if (price < 0) errors.price = 'Cannot be negative';

    const capRaw = String(row.salePrice ?? '').trim();
    if (capRaw !== '') { const cap = parseFloat(capRaw); if (isNaN(cap)) errors.salePrice = 'Must be a number'; }

    const sku = String(row.sku || '').trim();
    if (sku) {
        const skuLower = sku.toLowerCase();
        if (existingSkuSet.has(skuLower)) errors.sku = 'Already exists in store';
        else {
            let dupeCount = 0;
            fileSkuMap.forEach((id, s) => { if (s === skuLower && id !== rowId) dupeCount++; });
            if (dupeCount > 0) errors.sku = 'Duplicate in this file';
        }
    }

    const taxRaw = String(row.taxRate ?? '').trim();
    if (taxRaw !== '') { const tr = parseFloat(taxRaw); if (isNaN(tr) || tr < 0 || tr > 100) errors.taxRate = '0–100 only'; }

    if (row.metaTitle && String(row.metaTitle).length > 160) errors.metaTitle = `Too long (${String(row.metaTitle).length}/160)`;
    if (row.description && String(row.description).length > 5000) errors.description = 'Too long (max 5000)';

    if (row.imageUrls) {
        const parts = String(row.imageUrls).split(',').map(u => u.trim()).filter(Boolean);
        const bad = parts.filter(u => { try { new URL(u); return false; } catch { return true; } });
        if (bad.length > 0) warnings.imageUrls = `${bad.length} invalid URL(s)`;
    }

    const inStockRaw = String(row.inStock ?? '').trim().toLowerCase();
    if (inStockRaw && !['yes', 'no', 'true', 'false', '1', '0', ''].includes(inStockRaw)) {
        warnings.inStock = 'Use yes/no';
    }

    const hasErrors = Object.keys(errors).length > 0;
    return { errors, warnings, status: hasErrors ? 'error' : Object.keys(warnings).length > 0 ? 'warning' : 'valid' };
}

// ─── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
    { key: 'name',            label: 'Name *',       width: 180 },
    { key: 'price',           label: 'Price *',      width: 88 },
    { key: 'salePrice',       label: 'Sale Price',   width: 100 },
    { key: 'category',        label: 'Category',     width: 130 },
    { key: 'sku',             label: 'SKU',          width: 120 },
    { key: 'inStock',         label: 'In Stock',     width: 80 },
    { key: 'stockQuantity',   label: 'Qty',          width: 68 },
    { key: 'trackQuantity',   label: 'Track Qty',    width: 85 },
    { key: 'taxRate',         label: 'Tax %',        width: 68 },
    { key: 'imageUrls',       label: 'Image URLs',   width: 200 },
    { key: 'description',     label: 'Description',  width: 200 },
    { key: 'metaTitle',       label: 'Meta Title',   width: 160 },
    { key: 'metaDescription', label: 'Meta Desc',    width: 160 },
];

// ─── Single Cell ───────────────────────────────────────────────────────────────
function Cell({ value, colKey, error, warning, isEditing, onStartEdit, onCommit, onCancel, colWidth }) {
    const [draft, setDraft] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing) {
            setDraft(String(value ?? ''));
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isEditing]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(draft); }
        else if (e.key === 'Escape') { onCancel(); }
        else if (e.key === 'Tab') { e.preventDefault(); onCommit(draft, e.shiftKey ? 'prev' : 'next'); }
    };

    const hasErr = !!error;
    const hasWarn = !hasErr && !!warning;

    return (
        <td
            className={`relative border-r text-[11px] group cursor-text select-none ${
                hasErr
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    : hasWarn
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-700'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/8'
            }`}
            style={{ minWidth: colWidth, maxWidth: colWidth, width: colWidth }}
            onClick={onStartEdit}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => onCommit(draft)}
                    className="w-full px-2 py-[5px] text-[11px] bg-white dark:bg-zinc-800 outline-none ring-2 ring-inset ring-indigo-500 text-slate-900 dark:text-white"
                    style={{ width: colWidth }}
                />
            ) : (
                <div className="px-2 py-[5px] truncate text-slate-700 dark:text-slate-300" title={String(value ?? '')}>
                    {String(value ?? '') || <span className="text-slate-300 dark:text-slate-600">—</span>}
                </div>
            )}

            {(hasErr || hasWarn) && !isEditing && (
                <div className="absolute left-1 top-full mt-0.5 z-50 hidden group-hover:block pointer-events-none" style={{ minWidth: 180 }}>
                    <div className={`text-[11px] px-2 py-1 rounded-lg shadow-xl font-medium ${hasErr ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                        {hasErr ? `❌ ${error}` : `⚠️ ${warning}`}
                    </div>
                </div>
            )}

            {hasErr && <div className="absolute top-0 right-0 w-0 h-0 border-t-[5px] border-r-[5px] border-t-transparent border-r-red-500 pointer-events-none" />}
            {hasWarn && <div className="absolute top-0 right-0 w-0 h-0 border-t-[5px] border-r-[5px] border-t-transparent border-r-amber-400 pointer-events-none" />}
        </td>
    );
}

// ─── Main Grid ─────────────────────────────────────────────────────────────────
export default function ImportSpreadsheetGrid({ initialRows, existingSkus = [], onRowsChange }) {
    const existingSkuSet = new Set((existingSkus || []).map(s => String(s).toLowerCase()));

    const buildFileSkuMap = (rows) => {
        const m = new Map();
        rows.forEach(r => { if (r.sku && !r._deleted) m.set(r._id, String(r.sku).toLowerCase()); });
        return m;
    };

    const runValidation = (rows) => {
        const skuMap = buildFileSkuMap(rows);
        return rows.map(r => {
            const { errors, warnings, status } = validateRow(r, existingSkuSet, skuMap, r._id);
            return { ...r, _errors: errors, _warnings: warnings, _status: status };
        });
    };

    const [rows, setRows] = useState(() =>
        runValidation(initialRows.map((r, i) => ({ ...r, _id: `row-${i}`, _deleted: false })))
    );
    const [editCell, setEditCell] = useState(null);
    const [undoStack, setUndoStack] = useState([]);

    const activeRows = rows.filter(r => !r._deleted);
    const validCount = activeRows.filter(r => r._status !== 'error').length;
    const errorCount = activeRows.filter(r => r._status === 'error').length;
    const warnCount = activeRows.filter(r => r._status === 'warning').length;
    const deletedCount = rows.filter(r => r._deleted).length;

    useEffect(() => {
        onRowsChange?.(activeRows);
    }, [rows]);

    const commitEdit = (rowIdx, colKey, newValue, direction) => {
        setRows(prev => {
            const updated = prev.map((r, i) => i === rowIdx ? { ...r, [colKey]: newValue } : r);
            return runValidation(updated);
        });
        if (direction) {
            const colIdx = COLUMNS.findIndex(c => c.key === colKey);
            if (direction === 'next') {
                if (colIdx < COLUMNS.length - 1) setEditCell({ rowIdx, colKey: COLUMNS[colIdx + 1].key });
                else {
                    const nextActiveIdx = rows.findIndex((r, i) => i > rowIdx && !r._deleted);
                    if (nextActiveIdx >= 0) setEditCell({ rowIdx: nextActiveIdx, colKey: COLUMNS[0].key });
                    else setEditCell(null);
                }
            } else {
                if (colIdx > 0) setEditCell({ rowIdx, colKey: COLUMNS[colIdx - 1].key });
                else {
                    const prevActiveIdx = [...rows].slice(0, rowIdx).reverse().findIndex(r => !r._deleted);
                    if (prevActiveIdx >= 0) setEditCell({ rowIdx: rowIdx - 1 - prevActiveIdx, colKey: COLUMNS[COLUMNS.length - 1].key });
                    else setEditCell(null);
                }
            }
        } else {
            setEditCell(null);
        }
    };

    const deleteRow = (rowId) => {
        setUndoStack(s => [...s, rowId]);
        setRows(prev => runValidation(prev.map(r => r._id === rowId ? { ...r, _deleted: true } : r)));
        setEditCell(null);
    };

    const undoDelete = () => {
        const lastId = undoStack[undoStack.length - 1];
        if (!lastId) return;
        setUndoStack(s => s.slice(0, -1));
        setRows(prev => runValidation(prev.map(r => r._id === lastId ? { ...r, _deleted: false } : r)));
    };

    return (
        <div className="flex flex-col gap-2">
            {/* Summary bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{validCount} Ready</span>
                </div>
                {warnCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{warnCount} Warnings</span>
                    </div>
                )}
                {errorCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="text-[11px] font-bold text-red-700 dark:text-red-300">{errorCount} Errors — click red cell to fix</span>
                    </div>
                )}
                {deletedCount > 0 && (
                    <button onClick={undoDelete} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-500">Undo ({deletedCount})</span>
                    </button>
                )}
                <span className="text-[10px] text-slate-400 ml-auto hidden sm:block">Click to edit · Tab/Enter to navigate · Esc to cancel</span>
            </div>

            {/* Spreadsheet table */}
            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto overflow-y-auto max-h-[400px]" style={{ scrollbarWidth: 'thin' }}>
                    <table className="border-collapse w-max" style={{ minWidth: '100%' }}>
                        <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800">
                            <tr>
                                {/* Row # — sticky */}
                                <th className="sticky left-0 z-30 bg-slate-100 dark:bg-zinc-800 w-9 text-center text-[10px] font-semibold text-slate-400 border-b border-r border-slate-200 dark:border-white/10 py-2">
                                    #
                                </th>
                                {/* Status icon — sticky */}
                                <th className="sticky left-9 z-30 bg-slate-100 dark:bg-zinc-800 w-7 border-b border-r border-slate-200 dark:border-white/10 py-2"></th>
                                {/* Column headers */}
                                {COLUMNS.map(col => (
                                    <th
                                        key={col.key}
                                        className="px-2 py-2 text-left text-[11px] font-semibold text-slate-600 dark:text-slate-400 border-b border-r border-slate-200 dark:border-white/10 whitespace-nowrap"
                                        style={{ minWidth: col.width, width: col.width }}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                                {/* Delete col */}
                                <th className="w-9 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-800"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => {
                                if (row._deleted) return null;
                                const status = row._status || 'valid';
                                const rowAccent = status === 'error'
                                    ? 'bg-red-50/50 dark:bg-red-950/10'
                                    : status === 'warning'
                                        ? 'bg-amber-50/40 dark:bg-amber-950/10'
                                        : '';

                                return (
                                    <tr
                                        key={row._id}
                                        className={`border-b border-slate-100 dark:border-white/5 group/row ${rowAccent}`}
                                    >
                                        {/* Row # — sticky */}
                                        <td className="sticky left-0 z-10 text-center text-[10px] text-slate-400 border-r border-slate-200 dark:border-white/8 bg-white dark:bg-zinc-900 py-[5px] w-9">
                                            {row._rowNum}
                                        </td>
                                        {/* Status icon — sticky */}
                                        <td className="sticky left-9 z-10 text-center border-r border-slate-200 dark:border-white/8 bg-white dark:bg-zinc-900 w-7 py-[5px]">
                                            {status === 'valid'   && <CheckCircle2   className="w-3.5 h-3.5 text-emerald-500 mx-auto" />}
                                            {status === 'warning' && <AlertTriangle   className="w-3.5 h-3.5 text-amber-500 mx-auto" />}
                                            {status === 'error'   && <AlertCircle     className="w-3.5 h-3.5 text-red-500 mx-auto" />}
                                        </td>
                                        {/* Data cells */}
                                        {COLUMNS.map(col => (
                                            <Cell
                                                key={col.key}
                                                value={Array.isArray(row[col.key]) ? row[col.key].join(',') : (row[col.key] ?? '')}
                                                colKey={col.key}
                                                colWidth={col.width}
                                                error={row._errors?.[col.key]}
                                                warning={row._warnings?.[col.key]}
                                                isEditing={editCell?.rowIdx === rowIdx && editCell?.colKey === col.key}
                                                onStartEdit={() => setEditCell({ rowIdx, colKey: col.key })}
                                                onCommit={(val, dir) => commitEdit(rowIdx, col.key, val, dir)}
                                                onCancel={() => setEditCell(null)}
                                            />
                                        ))}
                                        {/* Delete */}
                                        <td className="text-center w-9 border-r border-slate-200 dark:border-white/8 bg-white dark:bg-zinc-900">
                                            <button
                                                onClick={() => deleteRow(row._id)}
                                                title="Remove row"
                                                className="p-1 text-slate-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover/row:opacity-100 rounded"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


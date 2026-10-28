// frontend/src/components/CalendarTab.jsx

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Plus, Printer, Share2, X, Palette } from 'lucide-react';
import { api } from '../api/client.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316'];

// ── Print helpers (pure, module-level) ──────────────────────────────

function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildCoverHTML(config) {
    return `<div class="page cover">
    <div class="cover-overlay">
    <div class="cover-title">${escapeHtml(config.coverTitle || String(config.year))}</div>
    ${config.coverVerseText ? `<div class="cover-verse">${escapeHtml(config.coverVerseText)}</div>` : ''}
    ${config.coverVerseRef ? `<div class="cover-ref">${escapeHtml(config.coverVerseRef)}</div>` : ''}
    </div>
    </div>`;
}

function buildMonthHTML({ monthNum, year, config, activeLayers, entries, hebrewDates }) {
    const firstDay = new Date(year, monthNum - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNum, 1).getDate();
    const monthName = MONTH_NAMES[monthNum - 1];



    // Index entries by day
    const entriesByDay = {};
    for (const e of entries) {
        if (!e.day) continue;
        (entriesByDay[e.day] ??= []).push(e);
    }

    let cellsHTML = '';
    for (let i = 0; i < 35; i++) {
        const dayNum = i - firstDay + 1;
        const isOverflow = i >= 28 && dayNum >= 1 && dayNum <= daysInMonth;
        if (dayNum >= 1 && dayNum <= daysInMonth) {
            const cls = isOverflow ? 'cell cell-overflow' : 'cell';
            const dayEntries = (entriesByDay[dayNum] || [])
            .filter((e) => activeLayers.some((l) => l.id === e.layerId));

            // 2. Entry titles in layer color (replaces dots)
            const titlesHTML = dayEntries.slice(0, 3).map((e) =>
            `<span class="entry-title" style="color:${escapeHtml(e.layer?.color || '#888')}">${escapeHtml(e.icon ? e.icon + ' ' : '')}${escapeHtml(e.title)}</span>`
            ).join('');
            const moreHTML = dayEntries.length > 3
            ? `<span class="entry-more">+${dayEntries.length - 3} more</span>`
            : '';

            // 3. Hebrew date at bottom
            const hebHTML = (hebrewLayerVisible && hebrewDates?.[dayNum])
            ? `<span class="cell-heb">${escapeHtml(hebrewDates[dayNum])}</span>`
            : '';

            cellsHTML += `<div class="${cls}"><span class="cell-day">${dayNum}</span><div class="cell-entries">${titlesHTML}${moreHTML}</div>${hebHTML}</div>`;
        } else {
            cellsHTML += `<div class="cell cell-empty"></div>`;
        }
    }

    const headerHTML = config.showWeekdayHeaders
    ? `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#ccc;">${DAY_LABELS.map((d) => `<div class="day-header">${d}</div>`).join('')}</div>`
    : '';

    const gridStyle = 'display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(5,1fr);gap:1px;background:#ccc;flex:1;';
    const gridHTML = `${headerHTML}<div style="${gridStyle}">${cellsHTML}</div>`;

    return `<div class="page month-page">
    <div class="month-header">
    <span class="month-title">${monthName} ${year}</span>
    <span class="hebrew-date"></span>
    </div>
    ${gridHTML}
    </div>`;
}
function buildPrintHTML({ config, activeLayers, monthNum, entries, hebrewDates }) {
    const coverHTML = (config.coverTitle || config.coverVerseRef)
    ? buildCoverHTML(config)
    : '';
    const monthHTML = buildMonthHTML({ monthNum, year: config.year, config, activeLayers, entries, hebrewDates });

    const gridStyle = 'display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:auto repeat(5,1fr);gap:1px;background:#ccc;flex:1;';
    return `<!DOCTYPE html>
    <html>
    <head>
    <title>Gssparks ${config.year} Calendar</title>
    <style>
    @page { size: ${config.paper} ${config.orientation}; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important; }
        html, body { height: 100%; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        .page { width: 100%; height: 100%; page-break-after: always; overflow: hidden; }
        .page:last-child { page-break-after: avoid; }
        .cover { position: relative; width: 100%; height: 100%; background: #1a1a2e; }
        .cover-overlay { position: absolute; inset: 0; display: flex;
            flex-direction: column; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.4); }
            .cover-title { font-size: 64px; color: #fff; font-weight: 700; letter-spacing: 2px; }
            .cover-verse { font-size: 18px; color: #e0e0e0; margin-top: 24px;
                max-width: 70%; text-align: center; font-style: italic; line-height: 1.6; }
                .cover-ref { font-size: 14px; color: #aaa; margin-top: 12px; }
                .month-page { display: flex; flex-direction: column; height: 100%; padding: 16px; }
                .month-header { display: flex; justify-content: space-between; align-items: baseline;
                    padding-bottom: 8px; border-bottom: 2px solid #333; margin-bottom: 8px; }
                    .month-title { font-size: 22px; font-weight: 700; color: #222; }
                    .hebrew-date { font-size: 12px; color: #666; }
                    .day-header { text-align: center; font-size: 10px; font-weight: 700;
                        padding: 6px 2px; background: #f0f0f0; color: #444; }
                        .cell { position: relative; background: #fff; padding: 3px; display: flex;
                            flex-direction: column; min-height: 0; }
                            .cell-empty { background: #f7f7f7; }
                            .cell-day { font-size: 10px; text-align: left; color: #555; font-weight: 500; }
                            .cell-entries { margin-top: 2px; display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
                            .entry-title { font-size: 7px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
                            .entry-more { font-size: 6px; color: #999; }
                            .cell-heb { margin-top: auto; font-size: 7px; color: #888; }
                            .cell-overflow { overflow: hidden; }
                            .cell-overflow::after { content: ''; position: absolute; inset: 0;
                                background: linear-gradient(to bottom right, transparent calc(50% - 0.5px),
                                                            #ccc calc(50% - 0.5px), #ccc calc(50% + 0.5px), transparent calc(50% + 0.5px)); }
                                                            </style>
                                                            </head>
                                                            <body>
                                                            ${coverHTML}
                                                            ${monthHTML}
                                                            </body>
                                                            </html>`;
}

// ── Component ────────────────────────────────────────────────────────

export default function CalendarTab({ isLoggedIn }) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [layers, setLayers] = useState([]);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [printConfig, setPrintConfig] = useState(null);
    const [showPrintConfig, setShowPrintConfig] = useState(false);
    const [showNewLayer, setShowNewLayer] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);

    // ── State (add to CalendarTab) ──
    const [newLayerName, setNewLayerName] = useState('');
    const [newLayerColor, setNewLayerColor] = useState('#6366f1');
    const [newLayerSystem, setNewLayerSystem] = useState('gregorian');   ;
    // State
    // ── State (replace the old entry state) ──
    const [selectedLayerId, setSelectedLayerId] = useState(null);
    const [layerEntries, setLayerEntries] = useState([]);
    const [showAddEntry, setShowAddEntry] = useState(false);
    const [entryTitle, setEntryTitle] = useState('');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryYear, setEntryYear] = useState(year);
    const [entryMonth, setEntryMonth] = useState(month);
    const [entryDay, setEntryDay] = useState(1);
    const [entryRecurrence, setEntryRecurrence] = useState('');
    const [entryIcon, setEntryIcon] = useState('');
    const [entryReference, setEntryReference] = useState('');
    const [entryModule, setEntryModule] = useState('');

    const RECURRENCE_OPTIONS = [
        { value: '', label: 'One-time' },
        { value: 'FREQ=DAILY', label: 'Daily' },
        { value: 'FREQ=WEEKLY', label: 'Weekly' },
        { value: 'FREQ=MONTHLY;BYMONTHDAY={day}', label: 'Monthly (same day)' },
        { value: 'FREQ=YEARLY;BYMONTH={month};BYMONTHDAY={day}', label: 'Yearly (same date)' },
    ];

    const ICONS = ['', '🎂', '🎉', '✝️', '🕎', '📖', '🌙', '⭐', '🔥', '📅', '❤️', '🙏'];
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [editingLayerId, setEditingLayerId] = useState(null);
    const [editLayerName, setEditLayerName] = useState('');
    const [editLayerColor, setEditLayerColor] = useState('');
    const [editLayerSystem, setEditLayerSystem] = useState('gregorian');
    const [hebrewDates, setHebrewDates] = useState({});
    // Group: non-recurring shown individually, recurring shown as one row each
    const recurringMap = {};
    const nonRecurring = [];
    for (const e of layerEntries) {
        if (e._isRecurring || e.recurrence) {
            (recurringMap[e.id] ??= { ...e, count: 0 });
            recurringMap[e.id].count++;
        } else {
            nonRecurring.push(e);
        }
    }
    const recurringList = Object.values(recurringMap);
    const displayEntries = [...nonRecurring, ...recurringList].sort((a, b) =>
    (a.year * 12 + a.month + (a.day || 0)) - (b.year * 12 + b.month + (b.day || 0))
    );

    function startEditLayer(layer) {
        setEditingLayerId(layer.id);
        setEditLayerName(layer.name);
        setEditLayerColor(layer.color);
        setEditLayerSystem(layer.calendarSystem || 'gregorian');
    }

    async function handleSaveLayer() {
        if (!editingLayerId || !editLayerName.trim()) return;
        await api.updateCalendarLayer(editingLayerId, {
            name: editLayerName.trim(),
                                      color: editLayerColor,
                                      calendarSystem: editLayerSystem,
        });
        setEditingLayerId(null);
        await loadLayers();
    }

    async function handleDeleteEntry(entryId) {
        if (!confirm('Delete this entry?')) return;
        await api.deleteCalendarEntry(entryId);
        const { startYear, startMonth, endYear, endMonth } = getEntryRange();
        setLayerEntries(await api.listLayerEntries(selectedLayerId, startYear, startMonth, endYear, endMonth));
        await loadEntries();
    }

    function startEditEntry(e) {
        setEditingEntryId(e.id);
        setEntryTitle(e.title);
        setEntryDescription(e.description || '');
        setEntryYear(e.year);
        setEntryMonth(e.month);
        setEntryDay(e.day || 1);
        setEntryRecurrence(e.recurrence || '');
        setEntryIcon(e.icon || '');
        setEntryReference(e.reference || '');
        setEntryModule(e.module || '');
        setShowAddEntry(true);
    }

    async function handleAddEntry() {
        if (!entryTitle.trim() || !selectedLayerId) return;

        let recurrence = entryRecurrence || null;
        if (recurrence?.includes('{day}')) recurrence = recurrence.replace('{day}', entryDay);
        if (recurrence?.includes('{month}')) recurrence = recurrence.replace('{month}', entryMonth);

        const payload = {
            layerId: selectedLayerId,
            title: entryTitle.trim(),
            description: entryDescription.trim() || null,
            year: entryYear,
            month: entryMonth,
            day: entryDay,
            recurrence,
            icon: entryIcon || null,
            reference: entryReference.trim() || null,
            module: entryModule.trim() || null,
        };

        if (editingEntryId) {
            await api.updateCalendarEntry(editingEntryId, payload);
        } else {
            await api.createCalendarEntry(payload);
        }

        setEntryTitle('');
        setEntryDescription('');
        setEntryRecurrence('');
        setEntryIcon('');
        setEntryReference('');
        setEntryModule('');
        setEditingEntryId(null);
        setShowAddEntry(false);
        await loadEntries();
        const { startYear, startMonth, endYear, endMonth } = getEntryRange();
        setLayerEntries(await api.listLayerEntries(selectedLayerId, startYear, startMonth, endYear, endMonth));
    }
    // Compute the 12-month range
    function getEntryRange() {
        const startYear = year;
        const startMonth = month;
        const endYear = startYear + 1;
        const endMonth = startMonth;
        return { startYear, startMonth, endYear, endMonth };
    }

    // Load entries when a layer is selected
    async function selectLayer(layerId) {
        if (selectedLayerId === layerId) {
            setSelectedLayerId(null);
            setLayerEntries([]);
            return;
        }
        setSelectedLayerId(layerId);
        const { startYear, startMonth, endYear, endMonth } = getEntryRange();
        const result = await api.listLayerEntries(layerId, startYear, startMonth, endYear, endMonth);
        setLayerEntries(result);
    }


    async function handleCreateLayer() {
        if (!newLayerName.trim()) return;
        await api.createLayer({
            name: newLayerName.trim(),
                              color: newLayerColor,
                              calendarSystem: newLayerSystem,
                              isBuiltIn: false,
        });
        setNewLayerName('');
        setShowNewLayer(false);
        await loadLayers();
    }

    async function handleDeleteLayer(layerId) {
        if (!confirm('Delete this layer and all its entries?')) return;
        await api.deleteLayer(layerId);
        await loadLayers();
    }

    useEffect(() => { loadLayers(); }, []);
    useEffect(() => { loadEntries(); }, [year, month, layers]);

    async function loadLayers() {
        try { setLayers(await api.listCalendarLayers()); } catch {}
    }

    async function loadEntries() {
        setLoading(true);
        try {
            const data = await api.listCalendarEntries(year, month);
            // Handle both old (flat array) and new ({entries, hebrewDates}) shapes
            if (Array.isArray(data)) {
                setEntries(data);
                setHebrewDates({});
            } else {
                setEntries(data.entries || []);
                setHebrewDates(data.hebrewDates || {});
            }
        } catch {
            setEntries([]);
            setHebrewDates({});
        } finally {
            setLoading(false);
        }
    }

    function prevMonth() {
        if (month === 1) { setMonth(12); setYear((y) => y - 1); }
        else setMonth((m) => m - 1);
    }

    function nextMonth() {
        if (month === 12) { setMonth(1); setYear((y) => y + 1); }
        else setMonth((m) => m + 1);
    }

    async function toggleLayer(id, visible) {
        await api.updateCalendarLayer(id, { visible });
        setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible } : l)));
    }

    async function handlePrintClick() {
        setShowPrintConfig(true);
        try {
            const config = await api.getPrintConfig(year);
            setPrintConfig(config || {
                year,
                layout: 'single-month',
                paper: 'letter',
                orientation: 'portrait',
                layerIds: layers.filter((l) => l.visible).map((l) => l.id),
                           coverTitle: String(year),
                           coverVerseRef: null,
                           coverVerseText: null,
                           overlayOpacity: 0.65,
                           showWeekdayHeaders: true,
            });
        } catch {
            setPrintConfig({
                year,
                layout: 'single-month',
                paper: 'letter',
                orientation: 'portrait',
                layerIds: layers.filter((l) => l.visible).map((l) => l.id),
                           coverTitle: String(year),
                           overlayOpacity: 0.65,
                           showWeekdayHeaders: true,
            });
        }
    }

    async function handleGeneratePrint() {
        try { await api.savePrintConfig(year, printConfig); } catch {}
        setShowPrintConfig(false);

        const activeLayers = layers.filter((l) => printConfig.layerIds.includes(l.id));
        const html = buildPrintHTML({
            config: printConfig,
            activeLayers,
            monthNum: month,
            entries,
            hebrewDates,
        });
        const win = window.open('', '_blank', 'width=800,height=600');
        win.document.write(html);
        win.document.close();
    }

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const overflowDays = Math.max(0, firstDay + daysInMonth - 35);
    const cells = [];
    for (let i = 0; i < 35; i++) {
        const dayNum = i - firstDay + 1;
        if (dayNum >= 1 && dayNum <= daysInMonth) {
            const overflowDay = (i >= 28 && i - 28 < overflowDays)
            ? 36 - firstDay + (i - 28)
            : null;
            cells.push({ day: dayNum, overflowDay });
        } else {
            cells.push({ day: null, overflowDay: null });
        }
    }
    const hebrewLayerVisible = layers.some(l => l.visible && l.calendarSystem === 'hebrew');
    const entriesByDay = {};
    for (const e of entries) {
        const d = e.day;
        if (!d) continue;
        if (!entriesByDay[d]) entriesByDay[d] = [];
        entriesByDay[d].push(e);
    }

    return (
        <div className="flex h-full min-h-0">

        {sidebarOpen && (
            <div className="flex w-56 shrink-0 flex-col border-r border-rule bg-panel">
            <div className="flex shrink-0 items-center justify-between border-b border-rule px-3 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Layers</span>
            <div className="flex items-center gap-1">
            {isLoggedIn && (
                <button onClick={() => setShowNewLayer(true)} className="rounded p-1 text-muted hover:text-parchment" title="New layer">
                <Plus size={13} />
                </button>
            )}
            </div>
            </div>

            {/* ── Inline create form ── */}
            {showNewLayer && (
                <div className="shrink-0 border-b border-rule px-3 py-2">
                <input
                value={newLayerName}
                onChange={e => setNewLayerName(e.target.value)}
                placeholder="Layer name"
                className="mb-1.5 w-full rounded border border-rule bg-ink/30 px-2 py-1 text-xs text-parchment placeholder:text-muted/50"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateLayer()}
                />
                <div className="mb-1.5 flex gap-1">
                {COLORS.map(c => (
                    <button
                    key={c}
                    onClick={() => setNewLayerColor(c)}
                    className={`h-4 w-4 rounded-full ${newLayerColor === c ? 'ring-2 ring-parchment' : ''}`}
                    style={{ backgroundColor: c }}
                    />
                ))}
                </div>
                <select
                value={newLayerSystem}
                onChange={e => setNewLayerSystem(e.target.value)}
                className="mb-1.5 w-full rounded border border-rule bg-ink/30 px-1 py-0.5 text-xs text-parchment"
                >
                <option value="civil">Civil</option>
                <option value="christian">Christian</option>
                <option value="hebrew">Hebrew</option>
                </select>
                <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewLayer(false)} className="text-xs text-muted hover:text-parchment">
                Cancel
                </button>
                <button onClick={handleCreateLayer} className="text-xs text-parchment hover:underline">
                Create
                </button>
                </div>
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {layers.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted">No layers yet.</p>
            ) : (
                layers.map((layer) => (
                    <div key={layer.id}>
                    {/* ── Edit mode (non-built-in only) ── */}
                    {editingLayerId === layer.id ? (
                        <div className="border-l-2 ml-3 pl-3 my-1.5 flex flex-col gap-1.5" style={{ borderColor: layer.color }}>
                        <input
                        value={editLayerName}
                        onChange={e => setEditLayerName(e.target.value)}
                        className="w-full rounded border border-rule bg-ink/30 px-2 py-1 text-xs text-parchment"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSaveLayer()}
                        />
                        <div className="flex gap-1">
                        {COLORS.map(c => (
                            <button
                            key={c}
                            onClick={() => setEditLayerColor(c)}
                            className={`h-4 w-4 rounded-full ${editLayerColor === c ? 'ring-2 ring-parchment' : ''}`}
                            style={{ backgroundColor: c }}
                            />
                        ))}
                        </div>
                        <select
                        value={editLayerSystem}
                        onChange={e => setEditLayerSystem(e.target.value)}
                        className="w-full rounded border border-rule bg-ink/30 px-1 py-0.5 text-xs text-parchment"
                        >
                        <option value="gregorian">Gregorian</option>
                        <option value="julian">Julian</option>
                        <option value="hebrew">Hebrew</option>
                        </select>
                        <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingLayerId(null)} className="text-[11px] text-muted hover:text-parchment">
                        Cancel
                        </button>
                        <button onClick={handleSaveLayer} className="text-[11px] text-brass hover:underline">
                        Save
                        </button>
                        </div>
                        </div>
                    ) : (
                        /* ── Normal row ── */
                        <div
                        onClick={() => isLoggedIn && selectLayer(layer.id)}
                        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer ${selectedLayerId === layer.id ? 'bg-ink/40' : 'hover:bg-ink/30'}`}
                        >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
                        <span className={`flex-1 truncate text-xs ${selectedLayerId === layer.id ? 'text-parchment font-semibold' : 'text-parchment'}`}>
                        {layer.name}
                        </span>
                        {layer.shared && <Share2 size={10} className="shrink-0 text-muted/40" />}

                        {/* Visibility toggle — all layers */}
                        <button
                        onClick={(e) => { e.stopPropagation(); toggleLayer(layer.id, !layer.visible); }}
                        className={`shrink-0 text-muted/70 hover:text-parchment ${layer.isBuiltIn ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title={layer.visible ? 'Hide' : 'Show'}
                        >
                        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>

                        {/* Non-built-in: edit + delete */}
                        {!layer.isBuiltIn && !layer.shared && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                            <button
                            onClick={(e) => { e.stopPropagation(); startEditLayer(layer); }}
                            className="text-muted/70 hover:text-parchment"
                            title="Edit layer"
                            >
                            ✎
                            </button>
                            <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id); }}
                            className="text-muted/70 hover:text-red-400"
                            title="Delete layer"
                            >
                            <X size={12} />
                            </button>
                            </div>
                        )}
                        </div>
                    )}

                    {/* Entries list — shown when this layer is selected */}
                    {selectedLayerId === layer.id && (
                        <div className="border-l-2 ml-3 pl-3 pr-3 my-1.5 flex flex-col gap-2" style={{ borderColor: layer.color }}>

                        {/* Add Event toggle */}
                        <button
                        onClick={() => { setShowAddEntry(v => !v); setEditingEntryId(null); }}
                        className="self-start rounded border border-rule px-2 py-0.5 text-[11px] text-muted hover:border-brass hover:text-parchment"
                        >
                        {showAddEntry ? '× Close' : '+ Add Event'}
                        </button>

                        {/* ── Entry form ── */}
                        {showAddEntry && (
                            <div className="flex flex-col gap-2 rounded border border-rule bg-ink/20 p-2.5">
                            <input
                            value={entryTitle}
                            onChange={e => setEntryTitle(e.target.value)}
                            placeholder="Title *"
                            className="w-full rounded border border-rule bg-ink/40 px-2 py-1 text-xs text-parchment placeholder:text-muted/50"
                            autoFocus
                            />
                            <textarea
                            value={entryDescription}
                            onChange={e => setEntryDescription(e.target.value)}
                            placeholder="Description (optional)"
                            rows={2}
                            className="w-full resize-none rounded border border-rule bg-ink/40 px-2 py-1 text-xs text-parchment placeholder:text-muted/50"
                            />
                            <div className="flex items-center gap-1">
                            <input
                            type="number" min="1" max="31"
                            value={entryDay}
                            onChange={e => setEntryDay(parseInt(e.target.value) || 1)}
                            className="w-11 rounded border border-rule bg-ink/40 px-1 py-0.5 text-xs text-parchment"
                            title="Day"
                            />
                            <select
                            value={entryMonth}
                            onChange={e => setEntryMonth(parseInt(e.target.value))}
                            className="flex-1 rounded border border-rule bg-ink/40 px-1 py-0.5 text-xs text-parchment"
                            >
                            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                            </select>
                            <input
                            type="number" min="2000" max="2100"
                            value={entryYear}
                            onChange={e => setEntryYear(parseInt(e.target.value) || year)}
                            className="w-14 rounded border border-rule bg-ink/40 px-1 py-0.5 text-xs text-parchment"
                            title="Year"
                            />
                            </div>
                            <select
                            value={entryRecurrence}
                            onChange={e => setEntryRecurrence(e.target.value)}
                            className="w-full rounded border border-rule bg-ink/40 px-1 py-0.5 text-xs text-parchment"
                            >
                            {RECURRENCE_OPTIONS.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                            </select>
                            <div className="flex flex-wrap gap-1">
                            {ICONS.map(ic => (
                                <button
                                key={ic}
                                onClick={() => setEntryIcon(ic)}
                                className={`rounded px-1 py-0.5 text-sm ${entryIcon === ic ? 'bg-brass/30 ring-1 ring-brass' : 'hover:bg-ink/40'}`}
                                >
                                {ic || '∅'}
                                </button>
                            ))}
                            </div>
                            <input
                            value={entryReference}
                            onChange={e => setEntryReference(e.target.value)}
                            placeholder="Scripture ref (e.g. Ps 23:1)"
                            className="w-full rounded border border-rule bg-ink/40 px-2 py-1 text-xs text-parchment placeholder:text-muted/50"
                            />
                            <input
                            value={entryModule}
                            onChange={e => setEntryModule(e.target.value)}
                            placeholder="Module (e.g. KJV, Clarke)"
                            className="w-full rounded border border-rule bg-ink/40 px-2 py-1 text-xs text-parchment placeholder:text-muted/50"
                            />
                            <button
                            onClick={handleAddEntry}
                            className="mt-1 self-end rounded border border-brass bg-brass/10 px-3 py-1 text-xs text-brass hover:bg-brass/20"
                            >
                            {editingEntryId ? 'Update' : 'Save'}
                            </button>
                            </div>
                        )}

                        {/* ── Entries list ── */}
                        {displayEntries.length === 0 ? (
                            <span className="text-[11px] text-muted/60 py-1">No entries in this range.</span>
                        ) : (
                            displayEntries.map((e) => (
                                <div key={e.id} className="group/entry flex items-start gap-1.5 py-0.5">
                                {e.icon && <span className="text-xs leading-none shrink-0">{e.icon}</span>}
                                <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-baseline gap-1.5">
                                <span className="font-mono text-[10px] text-muted shrink-0">
                                {MONTH_NAMES[(e.month - 1) % 12].slice(0, 3)} {e.day}, {e.year}
                                </span>
                                <span className="text-[11px] text-parchment truncate">{e.title}</span>
                                {(e._isRecurring || e.recurrence) && (
                                    <span className="text-[9px] text-muted/60 shrink-0" title={e.recurrence}>
                                    ↻{e.count > 1 ? ` ×${e.count}` : ''}
                                    </span>
                                )}
                                </div>
                                {e.reference && (
                                    <span className="text-[10px] text-brass/70 ml-4">{e.reference}</span>
                                )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/entry:opacity-100 shrink-0">
                                <button
                                onClick={() => startEditEntry(e)}
                                className="text-muted/70 hover:text-parchment text-xs px-0.5"
                                title="Edit"
                                >
                                ✎
                                </button>
                                <button
                                onClick={() => handleDeleteEntry(e.id)}
                                className="text-muted/70 hover:text-red-400 text-xs px-0.5"
                                title="Delete"
                                >
                                ×
                                </button>
                                </div>
                                </div>
                            ))
                        )}
                        </div>
                    )}
                    </div>
                ))
            )}
            </div>
            </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center border-b border-rule bg-panel px-4 py-3">
        <div className="flex items-center gap-1">
        {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="rounded p-1 text-muted hover:text-parchment" title="Show layers">
            <ChevronRight size={14} />
            </button>
        )}
        </div>
        <h2 className="text-center font-display text-lg text-parchment">{MONTH_NAMES[month - 1]} {year}</h2>
        <div className="flex items-center gap-1 justify-self-end">
        <button onClick={prevMonth} className="rounded border border-rule p-1.5 text-muted hover:border-brass hover:text-parchment">
        <ChevronLeft size={14} />
        </button>
        <button onClick={nextMonth} className="rounded border border-rule p-1.5 text-muted hover:border-brass hover:text-parchment">
        <ChevronRight size={14} />
        </button>
        <button onClick={handlePrintClick} className="ml-2 flex items-center gap-1 rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment">
        <Printer size={11} /> Print
        </button>
        </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map((d, i) => (
            <div key={i} className="py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-muted">{d}</div>
        ))}
        </div>
        <div className="grid grid-cols-7 gap-px rounded border border-rule bg-rule">
        {cells.map((cell, i) => (
            <div
            key={i}
            onClick={() => { if (cell.day !== null && isLoggedIn) setSelectedDay(cell.day); }}
            className={`relative flex aspect-square flex-col bg-panel p-1.5 ${cell.day === null ? 'bg-ink/20' : ''} ${cell.day !== null ? 'cursor-pointer hover:bg-ink/30' : ''}`}
            >
            {cell.day !== null && (
                <>
                {/* Primary day — top left */}
                <span className="text-left font-mono text-[11px] text-muted">{cell.day}</span>

                {/* Entry titles */}
                <div className="mt-0.5 flex flex-col gap-px overflow-hidden">
                {(entriesByDay[cell.day] || [])
                    .filter(e => e.layer?.visible !== false)
                    .slice(0, 2)
                    .map(e => (
                        <span
                        key={e.id}
                        className="truncate text-[9px] leading-tight font-medium"
                        style={{ color: e.layer?.color || '#888' }}
                        title={e.title}
                        >
                        {e.icon ? `${e.icon} ` : ''}{e.title}
                        </span>
                    ))}
                    </div>

                    {/* Hebrew date — bottom */}
                    {hebrewLayerVisible && hebrewDates[cell.day] && (
                        <span className="mt-auto text-[8px] text-muted/60 truncate">
                        {hebrewDates[cell.day]}
                        </span>
                    )}

                    {/* Overflow day — bottom right */}
                    {cell.overflowDay && (
                        <span className="absolute bottom-1 right-1.5 font-mono text-[11px] text-muted">
                        {cell.overflowDay}
                        </span>
                    )}
                    </>
            )}

            {/* Diagonal slash — only on cells with 2 days */}
            {cell.overflowDay && (
                <div className="pointer-events-none absolute inset-0" style={{
                    background: 'linear-gradient(to bottom right, transparent calc(50% - 0.5px), var(--color-rule, #333) calc(50% - 0.5px), var(--color-rule, #333) calc(50% + 0.5px), transparent calc(50% + 0.5px))',
                }} />
            )}
            </div>
        ))}
        </div>
        </div>
        </div>
        </div>

        {showPrintConfig && printConfig && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-lg border border-rule bg-panel p-6">
            <h3 className="mb-4 font-display text-lg text-parchment">Print Calendar</h3>
            <div className="flex flex-col gap-4">
            <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Cover Title</label>
            <input value={printConfig.coverTitle || ''} onChange={(e) => setPrintConfig((c) => ({ ...c, coverTitle: e.target.value }))} className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment focus:border-brass focus:outline-none" />
            </div>
            <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Cover Verse (reference)</label>
            <input value={printConfig.coverVerseRef || ''} onChange={(e) => setPrintConfig((c) => ({ ...c, coverVerseRef: e.target.value }))} placeholder="e.g. Joshua 1:9" className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none" />
            </div>
            <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Paper</label>
            <select value={printConfig.paper} onChange={(e) => setPrintConfig((c) => ({ ...c, paper: e.target.value }))} className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment focus:border-brass focus:outline-none">
            <option value="letter">Letter (8.5×11")</option>
            <option value="a4">A4</option>
            </select>
            </div>
            <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Orientation</label>
            <select value={printConfig.orientation} onChange={(e) => setPrintConfig((c) => ({ ...c, orientation: e.target.value }))} className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment focus:border-brass focus:outline-none">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
            </select>
            </div>
            <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Layers to include</label>
            <div className="flex flex-col gap-1.5">
            {layers.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm text-parchment">
                <input type="checkbox" checked={printConfig.layerIds.includes(l.id)} onChange={(e) => { const ids = e.target.checked ? [...printConfig.layerIds, l.id] : printConfig.layerIds.filter((id) => id !== l.id); setPrintConfig((c) => ({ ...c, layerIds: ids })); }} className="accent-brass" />
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name}
                </label>
            ))}
            </div>
            </div>
            <div className="flex items-center gap-3">
            <button onClick={handleGeneratePrint} className="rounded border border-brass bg-brass/10 px-4 py-1.5 text-sm text-brass hover:bg-brass/20">Generate & Print</button>
            <button onClick={() => setShowPrintConfig(false)} className="rounded border border-rule px-4 py-1.5 text-sm text-muted hover:border-brass hover:text-parchment">Cancel</button>
            </div>
            </div>
            </div>
            </div>
        )}

        </div>
    );
}

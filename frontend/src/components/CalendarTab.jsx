// frontend/src/components/CalendarTab.jsx

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Plus, Printer, Share2 } from 'lucide-react';
import { api } from '../api/client.js';
// import NewLayerDialog from './NewLayerDialog';
// import AddEntryDialog from './AddEntryDialog';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function buildMonthHTML({ monthNum, year, config, activeLayers, entries }) {
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
            const dots = (entriesByDay[dayNum] || [])
            .filter((e) => activeLayers.some((l) => l.id === e.layerId))
            .map((e) => `<span class="dot" style="background:${escapeHtml(e.layer?.color || '#888')}"></span>`)
            .join('');
            cellsHTML += `<div class="${cls}"><span class="cell-day">${dayNum}</span><div class="cell-entries">${dots}</div></div>`;
        } else {
            cellsHTML += `<div class="cell cell-empty"></div>`;
        }
    }

    const dayHeaders = config.showWeekdayHeaders
    ? DAY_LABELS.map((d) => `<div class="day-header">${d}</div>`).join('')
    : '';

    const gridStyle = 'display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#ccc;flex:1;';
    const gridHTML = `<div style="${gridStyle}">${dayHeaders}${cellsHTML}</div>`;

    return `<div class="page month-page">
    <div class="month-header">
    <span class="month-title">${monthName} ${year}</span>
    <span class="hebrew-date"></span>
    </div>
    ${gridHTML}
    </div>`;
}

function buildPrintHTML({ config, activeLayers, monthNum, entries }) {
    const coverHTML = (config.coverTitle || config.coverVerseRef)
    ? buildCoverHTML(config)
    : '';
    const monthHTML = buildMonthHTML({ monthNum, year: config.year, config, activeLayers, entries });

    return `<!DOCTYPE html>
    <html>
    <head>
    <title>Gssparks ${config.year} Calendar</title>
    <style>
    @page { size: ${config.paper} ${config.orientation}; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        .page { width: 100%; height: 100vh; page-break-after: always; overflow: hidden; }
        .page:last-child { page-break-after: avoid; }
        .cover { position: relative; width: 100%; height: 100vh; background: #1a1a2e; }
        .cover-overlay { position: absolute; inset: 0; display: flex;
            flex-direction: column; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.4); }
            .cover-title { font-size: 64px; color: #fff; font-weight: 700; letter-spacing: 2px; }
            .cover-verse { font-size: 18px; color: #e0e0e0; margin-top: 24px;
                max-width: 70%; text-align: center; font-style: italic; line-height: 1.6; }
                .cover-ref { font-size: 14px; color: #aaa; margin-top: 12px; }
                .month-page { display: flex; flex-direction: column; height: 100vh; padding: 16px; }
                .month-header { display: flex; justify-content: space-between; align-items: baseline;
                    padding-bottom: 8px; border-bottom: 2px solid #333; margin-bottom: 8px; }
                    .month-title { font-size: 22px; font-weight: 700; color: #222; }
                    .hebrew-date { font-size: 12px; color: #666; }
                    .day-header { text-align: center; font-size: 10px; font-weight: 700;
                        padding: 4px 2px; background: #f0f0f0; color: #444; }
                        .cell { position: relative; background: #fff; padding: 3px; display: flex;
                            flex-direction: column; min-height: 0; }
                            .cell-empty { background: #f7f7f7; }
                            .cell-day { font-size: 10px; text-align: right; color: #555; font-weight: 500; }
                            .cell-entries { margin-top: auto; display: flex; flex-wrap: wrap; gap: 2px; }
                            .dot { width: 5px; height: 5px; border-radius: 50%; }
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
    console.log('selectedDay scope check:', typeof selectedDay);

    useEffect(() => { loadLayers(); }, []);
    useEffect(() => { loadEntries(); }, [year, month, layers]);

    async function loadLayers() {
        try { setLayers(await api.listCalendarLayers()); } catch {}
    }

    async function loadEntries() {
        setLoading(true);
        try { setEntries(await api.listCalendarEntries(year, month)); }
        catch { setEntries([]); }
        finally { setLoading(false); }
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
        });
        const win = window.open('', '_blank', 'width=800,height=600');
        win.document.write(html);
        win.document.close();
    }

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 1).getDate();
    const cells = [];
    for (let i = 0; i < 35; i++) {
        const dayNum = i - firstDay + 1;
        if (dayNum >= 1 && dayNum <= daysInMonth) {
            cells.push({ day: dayNum, overflow: i >= 28 });
        } else {
            cells.push({ day: null });
        }
    }

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
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {layers.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted">No layers yet.</p>
            ) : (
                layers.map((layer) => (
                    <div key={layer.id} className="group flex items-center gap-2 px-3 py-2 hover:bg-ink/30">
                    <button onClick={() => isLoggedIn && toggleLayer(layer.id, !layer.visible)} className="shrink-0" title={layer.visible ? 'Hide' : 'Show'}>
                    {layer.visible
                        ? <Eye size={13} style={{ color: layer.color }} />
                        : <EyeOff size={13} className="text-muted/50" />}
                        </button>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: layer.color, opacity: layer.visible ? 1 : 0.3 }} />
                        <span className={`flex-1 truncate text-xs ${layer.visible ? 'text-parchment' : 'text-muted/50'}`}>{layer.name}</span>
                        {layer.shared && <Share2 size={10} className="shrink-0 text-muted/40" />}
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
            className={`relative flex min-h-[60px] flex-col bg-panel p-1.5 ${cell.day === null ? 'bg-ink/20' : ''} ${cell.overflow ? 'overflow-hidden' : ''} ${cell.day !== null ? 'cursor-pointer hover:bg-ink/30' : ''}`}
            >
            {cell.day !== null && (
                <>
                <span className={`text-right font-mono text-[11px] ${cell.overflow ? 'text-muted/60' : 'text-muted'}`}>{cell.day}</span>
                <div className="mt-auto flex flex-wrap gap-0.5">
                {(entriesByDay[cell.day] || []).map((e) => (
                    <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.layer?.color || '#888' }} title={e.title} />
                ))}
                </div>
                </>
            )}
            {cell.overflow && cell.day !== null && (
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

        {/* {showNewLayer && (
            <NewLayerDialog onClose={() => setShowNewLayer(false)} onCreated={() => loadLayers()} />
    )} */}

    {/* {selectedDay !== null && (
        <AddEntryDialog
        year={year}
        month={month}
        day={selectedDay}
        layers={layers.filter((l) => !l.shared || l.myShareRole === 'editor')}
        onClose={() => setSelectedDay(null)}
        onSaved={loadEntries}
        />
    )} */}
        </div>
    );
}

// frontend/src/components/CalendarTab.jsx

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, Plus, Printer, Share2, X, Upload} from 'lucide-react';
import { api } from '../api/client.js';
import ShareDialog from './ShareDialog.jsx';
import { HDate } from '@hebcal/core';
import PrintEditor from './PrintEditor';
import { resizeImage } from '../utils/imageUtils';

const HEB_MONTH_NAMES_LEAP = [
    { value: 1, label: 'Tishrei' },
{ value: 2, label: 'Cheshvan' },
{ value: 3, label: 'Kislev' },
{ value: 4, label: 'Tevet' },
{ value: 5, label: 'Shevat' },
{ value: 6, label: 'Adar I' },
{ value: 7, label: 'Adar II' },
{ value: 8, label: 'Nisan' },
{ value: 9, label: 'Iyar' },
{ value: 10, label: 'Sivan' },
{ value: 11, label: 'Tamuz' },
{ value: 12, label: 'Av' },
{ value: 13, label: 'Elul' },
];

const HEBREW_MONTHS = [
    { value: 1, label: 'Tishrei' },
{ value: 2, label: 'Cheshvan' },
{ value: 3, label: 'Kislev' },
{ value: 4, label: 'Tevet' },
{ value: 5, label: 'Shevat' },
{ value: 6, label: 'Adar' },
{ value: 7, label: 'Nisan' },
{ value: 8, label: 'Iyar' },
{ value: 9, label: 'Sivan' },
{ value: 10, label: 'Tamuz' },
{ value: 11, label: 'Av' },
{ value: 12, label: 'Elul' },
];


export function getHebMonthName(month, hebYear) {
    const isLeap = new HDate(1, 1, hebYear).isLeapYear();
    const names = isLeap ? HEB_MONTH_NAMES_LEAP : HEBREW_MONTHS;
    return names[month - 1]?.label || String(month);
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316'];


function currentHebrewYear() {
  const now = new Date();
  // Tishrei (Hebrew New Year) falls ~Sep 25–30
  const beforeRoshHashanah = now.getMonth() < 8 || (now.getMonth() === 8 && now.getDate() < 25);
  return now.getFullYear() + (beforeRoshHashanah ? 3760 : 3761);
}

function getCellHebrewDate(system, day, year, month, hebYear) {
    if (system === 'hebrew') return null;

    let gregDate;
    if (system === 'gregorian') {
        gregDate = new Date(year, month - 1, day);
    } else if (system === 'julian') {
        gregDate = new Date(year, month - 1, day + 13);
    } else {
        return null;
    }

    try {
        const hd = new HDate(gregDate);
        return `${hd.getMonthName()} ${hd.getDate()}, ${hd.getFullYear()}`;
    } catch {
        return null;
    }
}

// ── DayCellContentt ────────────────────────────────────────────────────────
function DayCellContent({ day, entries, hebrewDate, hebrewLayerVisible, compact, image }) {
    return (
        <div className={`relative w-full h-full ${image ? '' : ''}`}>
        {image && (
            <>
            <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover rounded" />
            <div className="absolute inset-0 bg-black/40 rounded" />
            </>
        )}
        <div className={`relative flex flex-col h-full ${compact ? 'p-0.5' : 'p-1'}`}>
        <span className={`text-left font-mono ${compact ? 'text-[9px]' : 'text-[11px]'} ${image ? 'text-white' : 'text-muted'}`}>
        {day}
        </span>
        <div className={`flex flex-col gap-px overflow-hidden ${compact ? 'mt-px' : 'mt-0.5'}`}>
        {(entries || [])
            .filter(e => e.layer?.visible !== false)
            .slice(0, compact ? 1 : 2)
            .map(e => (
                <span
                key={e.id}
                className={`truncate leading-tight font-medium ${compact ? 'text-[7px]' : 'text-[9px]'}`}
                style={{ color: image ? '#fff' : (e.layer?.color || '#888') }}
                title={e.title}
                >
                {e.icon ? `${e.icon} ` : ''}{e.title}
                </span>
            ))}
            </div>
            {hebrewLayerVisible && hebrewDate && (
                <span className={`mt-auto truncate ${compact ? 'text-[6px]' : 'text-[8px]'} ${image ? 'text-white/80' : 'text-muted/60'}`}>
                {hebrewDate}
                </span>
            )}
            </div>
            </div>
    );
}

function DayImagePicker({ year, month, day, calSystem, hebYear, currentImage, onImageChange, layers, defaultLayerId }) {
    const [images, setImages] = useState([]);
    const [showSelect, setShowSelect] = useState(false);
    const [selectedLayerId, setSelectedLayerId] = useState(defaultLayerId || layers[0]?.id || '');
    const fileRef = useRef(null);

    useEffect(() => {
        api.listDayBgImages().then(setImages).catch(() => {});
    }, []);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const resized = await resizeImage(file, 1200);
            const { url } = await api.uploadCalendarImage('day-bg', resized);
            await api.setDayImage(year, month, day, url, selectedLayerId);
            onImageChange();
        } catch (err) {
            alert(err.message);
        }
        e.target.value = '';
    };

    const handleSelect = async (url) => {
        await api.setDayImage(year, month, day, url, selectedLayerId);
        setShowSelect(false);
        onImageChange();
    };

    const handleRemove = async () => {
        await api.removeDayImage(year, month, day, selectedLayerId);
        onImageChange();
    };

    return (
        <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Day Image</span>

        <select
        value={selectedLayerId}
        onChange={(e) => setSelectedLayerId(e.target.value)}
        className="w-full rounded border border-rule bg-ink/30 px-1 py-0.5 text-[10px] text-parchment"
        >
        {layers.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
        ))}
        </select>

        {currentImage ? (
            <div className="relative w-24 aspect-square rounded overflow-hidden">
            <img src={currentImage} alt="" className="w-full h-full object-cover" />
            <button
            onClick={handleRemove}
            className="absolute top-1 right-1 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
            title="Remove image"
            >
            <X size={10} />
            </button>
            </div>
        ) : (
            <div className="flex w-24 aspect-square items-center justify-center rounded border border-dashed border-rule text-[10px] text-muted/50">
            No image
            </div>
        )}

        <div className="flex gap-2">
        <button
        onClick={() => setShowSelect(v => !v)}
        className="flex-1 rounded border border-rule px-2 py-1 text-[10px] text-muted hover:border-brass hover:text-parchment"
        >
        Select existing
        </button>
        <button
        onClick={() => fileRef.current?.click()}
        className="flex-1 rounded border border-rule px-2 py-1 text-[10px] text-muted hover:border-brass hover:text-parchment"
        >
        Upload new
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>

        {showSelect && (
            <div className="max-h-32 overflow-y-auto rounded border border-rule bg-ink/20 p-1">
            {images.length === 0 ? (
                <span className="text-[10px] text-muted/60 px-1">No images available.</span>
            ) : (
                <div className="grid grid-cols-4 gap-1">
                {images.map((url) => (
                    <div key={url} className="relative aspect-square rounded overflow-hidden">
                    <button
                    onClick={() => handleSelect(url)}
                    className="w-full h-full"
                    >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                    <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm('Delete this image?')) return;
                        const filename = url.split('/').pop();
                        await api.deleteDayBgImage(filename);
                        setImages(prev => prev.filter(i => i !== url));
                    }}
                    className="absolute top-0.5 left-0.5 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
                    title="Delete image"
                    >
                    <X size={8} />
                    </button>
                    </div>
                ))}
                </div>
            )}
            </div>
        )}
        </div>
    );
}

function LayerConfigPopover({ layer, open, onClose, onGenerated, currentYear }) {
    const [countries, setCountries] = useState([]);
    const [country, setCountry] = useState('');
    const [enabledHolidays, setEnabledHolidays] = useState([]);
    const [allFeasts, setAllFeasts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const isCivil = layer.name === 'Civil';
    const isHebrew = layer.name === 'Hebrew';
    const isChristian = layer.name === 'Western Christian' || layer.name === 'Eastern Christian';
    const tradition = layer.name === 'Western Christian' ? 'western' : 'eastern';

    useEffect(() => {
        if (!open) return;
        api.getLayerConfig(layer.id).then(cfg => {
            if (cfg?.country) setCountry(cfg.country);
            if (cfg?.enabledHolidays) setEnabledHolidays(cfg.enabledHolidays);
        });
            if (isCivil) {
                api.listCountries().then(setCountries).catch(() => {});
            }
            if (isChristian) {
                api.listFeasts(tradition, currentYear).then(setAllFeasts).catch(() => {});
            }
    }, [open, layer.id, currentYear]);

    if (!open) return null;

    const applyPreset = async (presetName) => {
        const keys = await api.getPresetKeys(presetName, tradition, currentYear);
        setEnabledHolidays(keys);
    };

    const handleRegenerate = async () => {
        setGenerating(true);
        try {
            const body = { year: currentYear };
            if (isCivil) body.country = country;
            if (isChristian) body.enabledHolidays = enabledHolidays;
            await api.generateLayer(layer.id, body);
            const config = {};
            if (isCivil) config.country = country;
            if (isChristian) config.enabledHolidays = enabledHolidays;
            await api.saveLayerConfig(layer.id, config);
            onGenerated?.();
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
        <div className="w-full max-w-sm bg-panel border border-rule rounded-lg p-6 text-parchment shadow-2xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg">{layer.name} Settings</h3>
        <button onClick={onClose} className="text-xs text-muted hover:text-parchment">✕</button>
        </div>

        {/* Civil: country picker */}
        {isCivil && (
            <div className="mb-4">
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Country</label>
            <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
            >
            <option value="">Select country…</option>
            {countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
            ))}
            </select>
            </div>
        )}

        {/* Christian: presets + checkboxes */}
        {isChristian && (
            <div className="mb-4">
            <label className="mb-2 block text-xs uppercase tracking-wide text-muted">Quick Select</label>
            <div className="flex flex-wrap gap-1 mb-3">
            {[
                ['all', 'All'],
                ['protestant', 'Protestant'],
                ['catholic', 'Catholic'],
                ['eastern_orthodox', 'Eastern Orthodox'],
                ['christmas_easter', 'Christmas + Easter'],
            ].map(([key, label]) => (
                <button
                key={key}
                onClick={() => applyPreset(key)}
                className="text-xs px-2 py-1 border border-rule rounded text-parchment hover:bg-brass/20"
                >
                {label}
                </button>
            ))}
            </div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Holidays ({enabledHolidays.length}/{allFeasts.length})</label>
            <div className="max-h-48 overflow-y-auto border border-rule rounded p-2 space-y-1">
            {allFeasts.map(f => (
                <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer text-parchment">
                <input
                type="checkbox"
                checked={enabledHolidays.includes(f.key)}
                onChange={e => {
                    setEnabledHolidays(prev =>
                    e.target.checked ? [...prev, f.key] : prev.filter(k => k !== f.key)
                    );
                }}
                />
                <span>{f.title}</span>
                </label>
            ))}
            </div>
            </div>
        )}

        {/* Hebrew: no config, just info */}
        {isHebrew && (
            <p className="text-xs text-muted mb-4">Generates all Hebrew holidays (Diaspora) for the current year.</p>
        )}

        {/* Regenerate button */}
        <button
        onClick={handleRegenerate}
        disabled={generating || (isCivil && !country)}
        className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
        >
        {generating ? 'Generating…' : 'Regenerate'}
        </button>
        </div>
        </div>
    );
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
    const [showPrintEditor, setShowPrintEditor] = useState(false);
    const [showNewLayer, setShowNewLayer] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [popoverPos, setPopoverPos] = useState(null); // { x, y }
    const [configLayer, setConfigLayer] = useState(null); // layer object or null
    const gridRef = useRef(null);
    const justOpened = useRef(false);

    // ── State (add to CalendarTab) ──
    const [newLayerName, setNewLayerName] = useState('');
    const [newLayerColor, setNewLayerColor] = useState('#6366f1');
    const [newLayerSystem, setNewLayerSystem] = useState('gregorian');
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
    const [calSystem, setCalSystem] = useState('gregorian');
    const [hebYear, setHebYear] = useState(() => {
        const now = new Date();
        return now.getFullYear() + (now.getMonth() < 8 || (now.getMonth() === 8 && now.getDate() < 25) ? 3760 : 3761);
    });

    useEffect(() => {
        if (selectedDay === null) return;
        const handler = (e) => {
            if (justOpened.current) {
                justOpened.current = false;
                return;
            }
            if (!e.target.closest('[data-day-popover]')) {
                setSelectedDay(null);
                setPopoverPos(null);
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [selectedDay]);



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

    const [shareLayer, setShareLayer] = useState(null);

    const importInputRef = useRef(null);

    // Determine which layer is selected (for Hebrew month options)
    const selectedLayer = layers.find(l => l.id === selectedLayerId);
    const isHebrewLayer = selectedLayer?.calendarSystem === 'hebrew';
    const monthOptions = isHebrewLayer
    ? (new HDate(1, 1, entryYear).isLeapYear() ? HEB_MONTH_NAMES_LEAP : HEBREW_MONTHS)
    : MONTH_NAMES.map((m, i) => ({ value: i + 1, label: m }));

    const handleRemoveSharedLayer = async (layer) => {
        try {
            await api.removeSharedLayer(layer.id, layer.sharedBy);
            await loadLayers();
            await loadEntries();
        } catch (err) {
            alert(err.message);
        }
    };
    const [dayImages, setDayImages] = useState({});
    const getDayImage = (displayDay) => {
        let gregDate;
        if (calSystem === 'gregorian') {
            gregDate = new Date(year, month - 1, displayDay);
        } else if (calSystem === 'julian') {
            gregDate = new Date(year, month - 1, displayDay + 13);
        } else {
            try { gregDate = new HDate(displayDay, month, hebYear).greg(); } catch { return null; }
        }
        const key = `${gregDate.getFullYear()}-${String(gregDate.getMonth() + 1).padStart(2, '0')}-${String(gregDate.getDate()).padStart(2, '0')}`;
        return dayImages[key] || null;
    };

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
        await api.createCalendarLayer({
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
        await api.deleteCalendarLayer(layerId);
        await loadLayers();
    }

    // Export
    function exportLayer(layer) {
        async function doExport() {
            const entries = await api.listLayerEntries(
                layer.id,
                2000, 1, 2099, 12
            );
            const data = {
                type: 'gssparks-calendar-layer',
                version: 1,
                layer: {
                    name: layer.name,
                    color: layer.color,
                    calendarSystem: layer.calendarSystem,
                },
                entries: entries.map(e => ({
                    title: e.title,
                    description: e.description,
                    year: e.year,
                    month: e.month,
                    day: e.day,
                    recurrence: e.recurrence,
                    icon: e.icon,
                    reference: e.reference,
                    module: e.module,
                })),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${layer.name.replace(/\s+/g, '-').toLowerCase()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        doExport();
    }

    // Import
    async function importLayer(file) {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.type !== 'gssparks-calendar-layer') {
            throw new Error('Not a valid layer export file.');
        }

        const newLayer = await api.createCalendarLayer({
            name: data.layer.name,
            color: data.layer.color,
            calendarSystem: data.layer.calendarSystem,
        });

        for (const entry of data.entries) {
            await api.createCalendarEntry({
                layerId: newLayer.id,
                ...entry,
            });
        }
    }
    useEffect(() => { loadLayers(); }, []);
    useEffect(() => { loadEntries(); }, [year, month, calSystem, hebYear, layers]);

    function getGridInfo(system, year, month, hebYear) {
        if (system === 'gregorian') {
            const firstDay = new Date(year, month - 1, 1).getDay();
            const daysInMonth = new Date(year, month, 0).getDate();
            return { firstDay, daysInMonth };
        }

        if (system === 'julian') {
            const gregDate = new Date(year, month - 1, 14); // Julian day 1 = Gregorian day 14
            const firstDay = gregDate.getDay();
            const daysInMonth = new Date(year, month, 0).getDate();
            return { firstDay, daysInMonth };
        }

        if (system === 'hebrew') {
            const hebDate = new HDate(1, month, hebYear);
            const greg = hebDate.greg(); // JS Date
            const firstDay = greg.getDay();
            const daysInMonth = hebDate.daysInMonth(); // instance method, returns 29 or 30
            return { firstDay, daysInMonth };
        }

        return { firstDay: 0, daysInMonth: 30 };
    }

    function getGregorianRange(system, year, month, hebYear) {
        // Returns { start: Date, end: Date } — inclusive Gregorian bounds of the visible month
        if (system === 'gregorian') {
            return {
                start: new Date(year, month - 1, 1),
                end: new Date(year, month - 1, new Date(year, month, 0).getDate()),
            };
        }
        if (system === 'julian') {
            // Julian day 1 of month M = Gregorian day 14 of month M
            const start = new Date(year, month - 1, 14);
            const daysInMonth = new Date(year, month, 0).getDate();
            const end = new Date(year, month - 1, 14 + daysInMonth - 1); // auto-rolls into next month
            return { start, end };
        }
        if (system === 'hebrew') {
            const start = new HDate(1, month, hebYear).greg();
            const daysInMonth = new HDate(1, month, hebYear).daysInMonth();
            const end = new Date(start);
            end.setDate(end.getDate() + daysInMonth - 1);
            return { start, end };
        }
        return { start: new Date(year, month - 1, 1), end: new Date(year, month - 1, 28) };
    }

    function getOverlappingGregorianMonths(start, end) {
        // Returns [{ year, month }] for each Gregorian month that overlaps [start, end]
        const months = [];
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cursor <= end) {
            months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return months;
    }

    async function loadLayers() {
        try { setLayers(await api.listCalendarLayers()); } catch {}
    }

    async function loadEntries() {
        setLoading(true);
        try {
            const { start, end } = getGregorianRange(calSystem, year, month, hebYear);
            const gregMonths = getOverlappingGregorianMonths(start, end);

            // Fetch entries for each overlapping Gregorian month
            const results = await Promise.all(
                gregMonths.map(({ year: y, month: m }) =>
                api.listCalendarEntries(y, m).catch(() => ({ entries: [], hebrewDates: {} }))
                )
            );

            // Merge entries, dedupe by id, filter to range
            const seen = new Set();
            let allEntries = [];
            let hebrewDates = {};
            for (const data of results) {
                const entries = Array.isArray(data) ? data : (data.entries || []);
                if (!Array.isArray(hebrewDates) && data.hebrewDates) hebrewDates = { ...hebrewDates, ...data.hebrewDates };
                for (const e of entries) {
                    if (seen.has(e.id)) continue;
                    seen.add(e.id);
                    const d = new Date(e.year, e.month - 1, e.day || 1);
                    if (d >= start && d <= end) allEntries.push(e);
                }
            }

            setEntries(allEntries);
            setHebrewDates(hebrewDates);

            // Load day images for the current Gregorian month(s)
            try {
                const imgResults = await Promise.all(
                    gregMonths.map(({ year: y, month: m }) =>
                    api.listDayImages(y, m).catch(() => ({}))
                    )
                );
                const merged = {};
                for (const r of imgResults) Object.assign(merged, r);
                setDayImages(merged);
            } catch {
                setDayImages({});
            }
        } catch {
            setEntries([]);
            setHebrewDates({});
        } finally {
            setLoading(false);
        }
    }

    function getHebMonthsInYear(hy) {
        return new HDate(1, 1, hy).isLeapYear() ? 13 : 12;
    }

    function switchCalSystem(newSystem) {
        if (newSystem === calSystem) return;

        if (newSystem === 'hebrew') {
            let gregDate;
            if (calSystem === 'gregorian') {
                gregDate = new Date(year, month - 1, 1);
            } else {
                gregDate = new Date(year, month - 1, 14);
            }
            const hd = new HDate(gregDate);
            setMonth(hd.getMonth());
            setHebYear(hd.getFullYear());
        } else if (calSystem === 'hebrew') {
            const greg = new HDate(1, month, hebYear).greg();
            setYear(greg.getFullYear());
            setMonth(greg.getMonth() + 1);
        }
        // Gregorian ↔ Julian: same month number, no conversion needed

        setCalSystem(newSystem);
    }

    function prevMonth() {
        if (calSystem === 'hebrew') {
            if (month === 1) {
                setMonth(getHebMonthsInYear(hebYear - 1));
                setHebYear((y) => y - 1);
            } else {
                setMonth((m) => m - 1);
            }
        } else {
            if (month === 1) { setMonth(12); setYear((y) => y - 1); }
            else setMonth((m) => m - 1);
        }
    }

    function nextMonth() {
        if (calSystem === 'hebrew') {
            const maxMonth = getHebMonthsInYear(hebYear);
            if (month === maxMonth) {
                setMonth(1);
                setHebYear((y) => y + 1);
            } else {
                setMonth((m) => m + 1);
            }
        } else {
            if (month === 12) { setMonth(1); setYear((y) => y + 1); }
            else setMonth((m) => m + 1);
        }
    }

    async function toggleLayer(id, visible) {
        await api.updateCalendarLayer(id, { visible });
        setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible } : l)));
    }

    const { firstDay, daysInMonth } = getGridInfo(calSystem, year, month, hebYear);
    const overflowDays = Math.max(0, firstDay + daysInMonth - 35);
    const cells = [];

    function getDisplayDay(e, system, year, month, hebYear) {
        // Returns the display-system day number for this entry, or null if not in view
        if (!e.day) return null;
        const gregDate = new Date(e.year, e.month - 1, e.day);

        if (system === 'gregorian') {
            return e.day;
        }

        if (system === 'julian') {
            const julianDate = new Date(gregDate);
            julianDate.setDate(julianDate.getDate() - 13);
            if (julianDate.getFullYear() === year && julianDate.getMonth() + 1 === month) {
                return julianDate.getDate();
            }
            return null;
        }

        if (system === 'hebrew') {
            const hd = new HDate(gregDate);
            if (hd.getFullYear() === hebYear && hd.getMonth() === month) {
                return hd.getDate();
            }
            return null;
        }

        return null;
    }

    function getCellHebrewDate(system, day, year, month, hebYear) {
        // Returns Hebrew date string for a cell, or null (Hebrew view = primary date already)
        if (system === 'hebrew') return null;

        let gregDate;
        if (system === 'gregorian') {
            gregDate = new Date(year, month - 1, day);
        } else if (system === 'julian') {
            gregDate = new Date(year, month - 1, day + 13);
        } else {
            return null;
        }

        try {
            const hd = new HDate(gregDate);
            return `${hd.getMonthName()} ${hd.getDate()}, ${hd.getFullYear()}`;
        } catch {
            return null;
        }
    }


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
    const cellHebrewDate = (day) => getCellHebrewDate(calSystem, day, year, month, hebYear);
    const entriesByDay = {};
    for (const e of entries) {
        const d = getDisplayDay(e, calSystem, year, month, hebYear);
        if (!d) continue;
        if (!entriesByDay[d]) entriesByDay[d] = [];
        entriesByDay[d].push(e);
    }

    const entryDateHint = (() => {
        if (!entryDay || !selectedLayer) return null;
        const layerSystem = selectedLayer.calendarSystem;
        if (calSystem === layerSystem) return null;

        // Convert entered date (in layer's system) → current viewing system
        let gregDate; // always resolve to Gregorian first

        if (layerSystem === 'gregorian') {
            gregDate = new Date(entryYear, entryMonth - 1, entryDay);
        } else if (layerSystem === 'julian') {
            gregDate = new Date(entryYear, entryMonth - 1, entryDay + 13);
        } else if (layerSystem === 'hebrew') {
            try { gregDate = new HDate(entryDay, entryMonth, entryYear).greg(); } catch { return null; }
        } else return null;

        // Now format in the viewing system
        if (calSystem === 'gregorian') {
            return `${MONTH_NAMES[gregDate.getMonth()]} ${gregDate.getDate()}, ${gregDate.getFullYear()}`;
        }
        if (calSystem === 'julian') {
            const jd = new Date(gregDate);
            jd.setDate(jd.getDate() - 13);
            return `${MONTH_NAMES[jd.getMonth()]} ${jd.getDate()}, ${jd.getFullYear()} (Julian)`;
        }
        if (calSystem === 'hebrew') {
            try {
                const hd = new HDate(gregDate);
                return `${hd.getMonthName()} ${hd.getDate()}, ${hd.getFullYear()}`;
            } catch { return null; }
        }
        return null;
    })();

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
            <button
            onClick={() => importInputRef.current?.click()}
            className="text-xs text-muted hover:text-brass"
            >
            <Upload size={14} />
            </button>
            </div>
            </div>



            <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                    await importLayer(file);
                    loadLayers();
                    loadEntries();
                } catch (err) {
                    alert(err.message);
                }
                e.target.value = '';
            }}
            />
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
                <option value="gregorian">Civil</option>
                <option value="gregorian">Christian</option>
                <option value="hebrew">Hebrew</option>
                <option value="julian">Eastern Christian</option>
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
                        <option value="gregorian">Civil</option>
                        <option value="hebrew">Hebrew</option>
                        <option value="julian">Eastern Christian</option>
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
                        {layer.sharedBy && (
                            <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveSharedLayer(layer); }}
                            className="opacity-0 group-hover:opacity-100 text-muted/70 hover:text-red-400 shrink-0"
                            title="Remove shared layer"
                            >
                            <X size={12} />
                            </button>
                        )}
                        {layer.isBuiltIn && (
                            <button
                            onClick={(e) => { e.stopPropagation(); setConfigLayer(layer); }}
                            className="shrink-0 text-muted/70 hover:text-parchment"
                            title="Layer settings"
                            >
                            ⚙
                            </button>
                        )}

                        <button
                        onClick={(e) => { e.stopPropagation(); toggleLayer(layer.id, !layer.visible); }}
                        className={`shrink-0 text-muted/70 hover:text-parchment ${layer.isBuiltIn ? 'opacity-100' : 'opacity-100 group-hover:opacity-100'}`}
                        title={layer.visible ? 'Hide' : 'Show'}
                        >
                        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        {!layer.isBuiltIn && (
                            <button
                            onClick={(e) => { e.stopPropagation(); exportLayer(layer); }}
                            className="text-muted hover:text-brass"
                            title="Export layer"
                            >
                            <Download size={14} />
                            </button>
                        )}
                        {!layer.isBuiltIn && (
                            <button
                            onClick={(e) => { e.stopPropagation(); setShareLayer(layer); }}
                            className="text-gray-400 hover:text-blue-500"
                            title="Share layer"
                            >
                            <Share2 size={14} />
                            </button>
                        )}
                        </div>
                    )}

                    {/* Entries list — shown when this layer is selected */}
                    {selectedLayerId === layer.id && (
                        <div className="border-l-2 ml-3 pl-3 pr-3 my-1.5 flex flex-col gap-2" style={{ borderColor: layer.color }}>

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
                            {/* Month — full width, own row */}
                            <select
                            value={entryMonth}
                            onChange={e => setEntryMonth(parseInt(e.target.value))}
                            className="w-full rounded border border-rule bg-ink/40 px-1 py-0.5 text-xs text-parchment"
                            >
                            {monthOptions.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                            </select>
                            </div>

                            {/* Day + Year */}
                            <div className="flex items-center gap-1">
                            <input
                            type="number" min="1" max={isHebrewLayer ? 30 : 31}
                            value={entryDay}
                            onChange={e => setEntryDay(parseInt(e.target.value) || 1)}
                            className="w-14 rounded border border-rule bg-ink/40 px-1 py-0.5 text-xs text-parchment"
                            title="Day"
                            />
                            <input
                            type="number" min={isHebrewLayer ? 5760 : 2000} max={isHebrewLayer ? 5860 : 2100}
                            value={entryYear}
                            onChange={e => setEntryYear(parseInt(e.target.value) || (isHebrewLayer ? currentHebrewYear() : year))}
                            className="flex-1 rounded border border-rule bg-ink/40 px-1 py-0.5 text-xs text-parchment"
                            title={isHebrewLayer ? 'Hebrew Year' : 'Year'}
                            />
                            </div>
                            {entryDateHint && (
                                <span className="text-[10px] text-muted/70 -mt-1">= {entryDateHint}</span>
                            )}
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
                                {isHebrewLayer
                                    ? `${HEBREW_MONTHS.find(h => h.value === e.month)?.label || e.month} ${e.day}, ${e.year}`
                                    : `${MONTH_NAMES[(e.month - 1) % 12].slice(0, 3)} ${e.day}, ${e.year}`}
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
        {/* ShareDialog rendered once, outside the layer map */}
        <ShareDialog
        layer={shareLayer}
        open={!!shareLayer}
        onClose={() => setShareLayer(null)}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center border-b border-rule bg-panel px-4 py-3">
        <div className="flex items-center gap-1">
        {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="rounded p-1 text-muted hover:text-parchment" title="Show layers">
            <ChevronRight size={14} />
            </button>
        )}
        </div>
        <div className="flex items-center gap-3">
        <div className="flex items-center justify-center gap-3">
        <div className="flex rounded border border-rule overflow-hidden">
        {[
            { key: 'gregorian', label: 'Greg' },
            { key: 'julian', label: 'Jul' },
            { key: 'hebrew', label: 'Heb' },
        ].map(({ key, label }) => (
            <button
            key={key}
            onClick={() => switchCalSystem(key)}
            className={`px-2 py-0.5 text-[10px] font-mono uppercase transition-colors ${
                calSystem === key
                ? 'bg-brass/20 text-brass'
                : 'text-muted hover:text-parchment'
            }`}
            >
            {label}
            </button>
        ))}
        </div>
        <h2 className="font-display text-lg text-parchment whitespace-nowrap">
        {calSystem === 'gregorian' && `${MONTH_NAMES[month - 1]} ${year}`}
        {calSystem === 'julian' && `${MONTH_NAMES[month - 1]} ${year}`}
        {calSystem === 'hebrew' && `${new HDate(1, month, hebYear).getMonthName()} ${hebYear}`}
        </h2>
        </div>
        <div className="flex rounded border border-rule overflow-hidden">
        </div>
        </div>
        <div className="flex items-center gap-1 justify-self-end">
        <button onClick={prevMonth} className="rounded border border-rule p-1.5 text-muted hover:border-brass hover:text-parchment">
        <ChevronLeft size={14} />
        </button>
        <button onClick={nextMonth} className="rounded border border-rule p-1.5 text-muted hover:border-brass hover:text-parchment">
        <ChevronRight size={14} />
        </button>
        <button onClick={() => setShowPrintEditor(true)} className="rounded border border-rule p-1.5 text-muted hover:border-brass hover:text-parchment" title="Print">
        <Printer size={14} />
        </button>
        {showPrintEditor && (
            <PrintEditor
            year={year}
            calSystem={calSystem}
            hebYear={hebYear}
            layers={layers}
            month={month}
            onClose={() => setShowPrintEditor(false)}
            />
        )}
        </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map((d, i) => (
            <div key={i} className="py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-muted">{d}</div>
        ))}
        </div>
        <div ref={gridRef} className="relative grid grid-cols-7 gap-px rounded border border-rule bg-rule">
        {cells.map((cell, i) => (
            <div
            key={i}
            className={`relative flex aspect-square flex-col bg-panel ${cell.day === null ? 'bg-ink/20' : ''}`}
            >
            {cell.day === null ? null : cell.overflowDay ? (
                <>
                <div
                className="flex flex-1 flex-col p-1 min-h-0 cursor-pointer hover:bg-ink/30"
                onClick={(e) => {
                    if (!isLoggedIn) return;
                    justOpened.current = true;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const POPOVER_H = 300;
                    const top = rect.bottom + POPOVER_H > window.innerHeight
                    ? rect.top - POPOVER_H
                    : rect.bottom;
                    setPopoverPos({ x: rect.left, y: top, day: cell.day });
                    setSelectedDay(cell.day);
                }}
                >
                <DayCellContent
                image={getDayImage(cell.day)}
                day={cell.day}
                entries={entriesByDay[cell.day]}
                hebrewDate={cellHebrewDate(cell.day)}
                hebrewLayerVisible={hebrewLayerVisible}
                compact
                />
                </div>
                <div className="h-px w-full bg-rule shrink-0" />
                <div
                className="flex flex-1 flex-col p-1 min-h-0 cursor-pointer hover:bg-ink/30"
                onClick={(e) => {
                    if (!isLoggedIn) return;
                    justOpened.current = true;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const POPOVER_H = 300;
                    const top = rect.bottom + POPOVER_H > window.innerHeight
                    ? rect.top - POPOVER_H
                    : rect.bottom;
                    setPopoverPos({ x: rect.left, y: top, day: cell.day });
                    setSelectedDay(cell.day);
                }}
                >
                <DayCellContent
                image={getDayImage(cell.overflowDay)}
                day={cell.overflowDay}
                entries={entriesByDay[cell.overflowDay]}
                hebrewDate={cellHebrewDate(cell.overflowDay)}
                hebrewLayerVisible={hebrewLayerVisible}
                compact
                />
                </div>
                </>
            ) : (
                <div
                className="flex flex-1 flex-col p-1.5 cursor-pointer hover:bg-ink/30"
                onClick={(e) => {
                    if (!isLoggedIn) return;
                    justOpened.current = true;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const POPOVER_H = 300;
                    const top = rect.bottom + POPOVER_H > window.innerHeight
                    ? rect.top - POPOVER_H
                    : rect.bottom;
                    setPopoverPos({ x: rect.left, y: top, day: cell.day });
                    setSelectedDay(cell.day);
                }}
                >
                <DayCellContent
                image={getDayImage(cell.day)}
                day={cell.day}
                entries={entriesByDay[cell.day]}
                hebrewDate={cellHebrewDate(cell.day)}
                hebrewLayerVisible={hebrewLayerVisible}
                />
                </div>
            )}
            </div>
        ))}
        </div>
        </div>
        </div>
        </div>
        {selectedDay !== null && popoverPos && (
            <div
            data-day-popover
            className="fixed z-50 w-64 rounded border border-rule bg-panel shadow-lg"
            style={{ left: popoverPos.x, top: popoverPos.y }}
            onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rule px-3 py-2">
            <span className="text-xs font-semibold text-parchment">
            {calSystem === 'hebrew'
                ? `${new HDate(1, month, hebYear).getMonthName()} ${selectedDay}, ${hebYear}`
                : `${MONTH_NAMES[month - 1]} ${selectedDay}, ${year}`}
                </span>
                <button onClick={() => { setSelectedDay(null); setPopoverPos(null); }} className="text-muted hover:text-parchment">
                <X size={12} />
                </button>
                </div>

                {/* Entries */}
                <div className="max-h-40 overflow-y-auto px-3 py-2">
                {(entriesByDay[selectedDay] || []).length === 0 ? (
                    <span className="text-[11px] text-muted/60">No entries.</span>
                ) : (
                    (entriesByDay[selectedDay] || []).map((e) => (
                        <div key={e.id} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-1.5">
                        {e.icon && <span className="text-xs">{e.icon}</span>}
                        <span className="text-xs font-medium text-parchment">{e.title}</span>
                        </div>
                        {e.description && (
                            <p className="mt-0.5 text-[10px] text-muted leading-snug">{e.description}</p>
                        )}
                        {e.reference && (
                            <span className="text-[10px] text-brass/70">{e.reference}</span>
                        )}
                        </div>
                    ))
                )}
                </div>

                {/* Image section */}
                <div className="border-t border-rule px-3 py-2">
                <DayImagePicker
                year={year}
                month={month}
                day={selectedDay}
                calSystem={calSystem}
                hebYear={hebYear}
                currentImage={getDayImage(selectedDay)}
                onImageChange={() => loadEntries()}
                layers={layers}
                defaultLayerId={selectedLayerId}
                />
                </div>
                </div>
        )}
        {configLayer && (
            <LayerConfigPopover
            layer={configLayer}
            open={!!configLayer}
            onClose={() => setConfigLayer(null)}
            onGenerated={() => loadEntries(year, month)}
            currentYear={year}
            />
        )}
        </div>
    );
}

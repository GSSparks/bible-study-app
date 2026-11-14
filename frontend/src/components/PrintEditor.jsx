// frontend/src/components/PrintEditor.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { api } from '../api/client';
import { HDate } from '@hebcal/core';
import {
    buildPrintDocument,
    getHebMonthName,
    MONTH_NAMES,
} from '../utils/printUtils';
import PrintPreview from './PrintPreview';
import { resizeImage } from '../utils/imageUtils';
import { pdf } from '@react-pdf/renderer';
import PrintPDF from './PrintPDF';

const FONT_OPTIONS = [
    { value: 'Helvetica', label: 'Helvetica' },
{ value: 'Times-Roman', label: 'Times' },
{ value: 'Courier', label: 'Courier' },
];

const DEFAULT_MONTH_SETTING = {
    headerBgImageUrl: null,
    verseImageUrl: null,
    verseRef: '',
    verseText: '',
    verseCorner: 'top-right',
};

export default function PrintEditor({ year, calSystem, hebYear, layers, month, onClose }) {
    // ── Config state ──
    const [config, setConfig] = useState({
        layout: 'single-month',
        paper: 'letter',
        orientation: 'landscape',
        margin: 0.5,
        layerIds: layers.filter(l => l.visible).map(l => l.id),
                                         showWeekdayHeaders: true,
                                         showHebrewDates: true,
                                         showEntryTitles: true,
                                         showDayImages: true,
                                         showEntryIcons: true,
                                         // Typography
                                         fontFamily: 'Helvetica',
                                         titleFontFamily: 'Helvetica',
                                         verseTextFontFamily: 'Helvetica',
                                         verseRefFontFamily: 'Helvetica',
                                         fontSize: 6,
                                         titleFontSize: 18,
                                         fontColor: '#555555',
                                         titleColor: '#222222',
                                         verseTextFontSize: 5,
                                         verseTextColor: '#ffffff',
                                         verseRefFontSize: 4,
                                         verseRefColor: '#b3b3b3',
                                         // Header / Verse
                                         overlayOpacity: 0.65,
                                         verseFillHeight: false,
                                         // Per-layer
                                         layerFontSizes: {},
                                         layerFontColors: {},
                                         // Per-month
                                         monthSettings: {},
                                         // Custom font
                                         customFontSrc: null,
                                         customFontFamily: null,
                                         // Cover
                                         coverTitle: String(year),
                                         coverVerseRef: '',
                                         coverVerseText: '',
                                         coverImageUrl: null,
    });

    // ── Data state ──
    const [entriesByMonth, setEntriesByMonth] = useState({});
    const [hebrewDatesByMonth, setHebrewDatesByMonth] = useState({});
    const [dayImagesByMonth, setDayImagesByMonth] = useState({});
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState([month]);
    const [printYear, setPrintYear] = useState(year);
    const [availableFonts, setAvailableFonts] = useState([]);
    const [coverModules, setCoverModules] = useState([]);
    const [coverModule, setCoverModule] = useState('');
    const [fetchingVerse, setFetchingVerse] = useState(false);
    const fontFileRef = useRef(null);
    const headerBgRefs = useRef({});
    const verseImgRefs = useRef({});
    const imageCache = useRef(new Map());

    // ── Load fonts + saved config + modules ──
    useEffect(() => {
        api.listFonts().then(setAvailableFonts).catch(() => {});
        api.listInstalledModules('BIBLE').then(mods => {
            setCoverModules(mods);
            if (mods.length > 0) setCoverModule(mods[0].name);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        api.getPrintConfig(year).then(cfg => {
            if (cfg) setConfig(prev => ({ ...prev, ...cfg }));
        }).catch(() => {});
    }, [year]);

    // ── Fetch data ──
    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        async function fetchAll() {
            const eByM = {};
            const hByM = {};
            const dByM = {};

            for (const m of selectedMonths) {
                try {
                    const res = await api.listCalendarEntries(printYear, m);
                    eByM[`${printYear}-${m}`] = res.entries || [];
                    hByM[`${printYear}-${m}`] = res.hebrewDates || null;
                } catch { eByM[`${printYear}-${m}`] = []; }

                try {
                    dByM[`${printYear}-${m}`] = await api.listDayImages(printYear, m);
                } catch { dByM[`${printYear}-${m}`] = {}; }
            }

            if (!cancelled) {
                setEntriesByMonth(eByM);
                setHebrewDatesByMonth(hByM);
                setDayImagesByMonth(dByM);
                setLoading(false);
            }
        }

        fetchAll();
        return () => { cancelled = true; };
    }, [selectedMonths, printYear, calSystem]);

    // ── Font options ──
    const fontOptions = [
        ...FONT_OPTIONS,
        ...availableFonts.map(f => ({
            value: f.family,
            label: f.family,
            url: f.url,
        })),
    ];

    // ── Build doc data ──
    const docData = useMemo(() => {
        if (loading) return null;
        return buildPrintDocument({
            calSystem, year: printYear, hebYear, config, layers,
            entriesByMonth, hebrewDatesByMonth, dayImagesByMonth,
            coverImageUrl: config.coverImageUrl,
            selectedMonths,
        });
    }, [loading, calSystem, printYear, hebYear, config, layers, entriesByMonth, hebrewDatesByMonth, dayImagesByMonth, selectedMonths]);

    // ── Pre-fetch images to data URIs ──
    async function resolveImages(doc) {
        const urls = new Set();

        if (doc.coverImageUrl) urls.add(doc.coverImageUrl);
        for (const page of doc.pages) {
            for (const month of page) {
                if (month.headerBgImageUrl) urls.add(month.headerBgImageUrl);
                if (month.verseImageUrl) urls.add(month.verseImageUrl);
                for (const cell of month.cells) {
                    if (cell.image) urls.add(cell.image);
                }
            }
        }

        for (const url of urls) {
            if (imageCache.current.has(url)) continue;
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                imageCache.current.set(url, blob);
            } catch {
                imageCache.current.set(url, null);
            }
        }

        const replaceUrl = (url) => {
            if (!url) return url;
            return imageCache.current.get(url) || null; // returns Blob or null
        };

        return {
            ...doc,
            coverImageUrl: replaceUrl(doc.coverImageUrl),
            pages: doc.pages.map(page =>
            page.map(mo => ({
                ...mo,
                headerBgImageUrl: replaceUrl(mo.headerBgImageUrl),
                            verseImageUrl: replaceUrl(mo.verseImageUrl),
                            cells: mo.cells.map(cell => ({
                                ...cell,
                                image: replaceUrl(cell.image),
                            })),
            }))
            ),
        };
    }

    // ── Download PDF ──
    const handleDownload = useCallback(async () => {
        if (!docData) return;
        setGenerating(true);
        try {
            const resolvedDoc = await resolveImages(docData);

            // Register custom fonts
            if (availableFonts.length) {
                const { Font } = await import('@react-pdf/renderer');
                for (const font of availableFonts) {
                    try {
                        Font.register({
                            family: font.family,
                            fonts: [
                                { src: font.url, fontWeight: 'normal' },
                                { src: font.url, fontWeight: 'bold' },
                            ],
                        });
                    } catch { }
                }
            }

            // Yield to let the "Generating…" UI paint before the blocking call
            await new Promise(r => setTimeout(r, 50));

            const blob = await pdf(<PrintPDF docData={resolvedDoc} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scriptorium-calendar-${selectedMonths.join(',')}-${printYear}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF generation failed:', err);
            alert('PDF generation failed: ' + err.message);
        } finally {
            setGenerating(false);
        }
    }, [docData, selectedMonths, printYear, availableFonts]);

    // ── Save config ──
    const handleSave = useCallback(async () => {
        try {
            await api.savePrintConfig(year, config);
        } catch (err) {
            console.error('Failed to save config:', err);
        }
    }, [year, config]);

    // ── Helpers ──
    const set = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));
    const toggleLayer = (id) => setConfig(prev => ({
        ...prev,
        layerIds: prev.layerIds.includes(id)
        ? prev.layerIds.filter(i => i !== id)
        : [...prev.layerIds, id],
    }));

    const getMonthSetting = (m, key) => config.monthSettings?.[String(m)]?.[key] ?? DEFAULT_MONTH_SETTING[key];
    const setMonthSetting = (m, key, value) => setConfig(prev => ({
        ...prev,
        monthSettings: {
            ...prev.monthSettings,
            [String(m)]: { ...DEFAULT_MONTH_SETTING, ...(prev.monthSettings?.[String(m)] || {}), [key]: value },
        },
    }));

    const handleFontSelect = (key, value) => {
        const selected = fontOptions.find(f => f.value === value);
        if (selected?.url) {
            set('customFontFamily', selected.value);
            set('customFontSrc', selected.url);
            set(key, selected.value);
        } else {
            set(key, value);
            set('customFontFamily', null);
            set('customFontSrc', null);
        }
    };

    const monthLabel = (m) => calSystem === 'hebrew'
    ? getHebMonthName(m, hebYear)
    : (MONTH_NAMES[m - 1] || m);

    const numMonths = calSystem === 'hebrew'
    ? (new HDate(1, 1, hebYear).isLeapYear() ? 13 : 12)
    : 12;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-ink border-b border-rule">
        <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-muted hover:text-parchment">
        <X size={20} />
        </button>
        <h2 className="text-sm font-semibold text-parchment">Print Editor</h2>
        </div>
        <button
        onClick={handleDownload}
        disabled={generating || !docData || selectedMonths.length === 0}
        className="flex items-center gap-2 rounded bg-brass/20 border border-brass px-4 py-1.5 text-xs font-medium text-brass hover:bg-brass/30 disabled:opacity-50"
        >
        <Printer size={14} />
        {generating ? 'Generating…' : 'Download PDF'}
        </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
        {/* Options panel */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-rule bg-ink/50 p-4 flex flex-col gap-5">

        {/* Layout */}
        <Section title="Layout">
        <Row label="Paper">
        <select value={config.paper} onChange={e => set('paper', e.target.value)} className={selectCls}>
        <option value="letter">Letter</option>
        <option value="a4">A4</option>
        </select>
        </Row>
        <Row label="Orientation">
        <select value={config.orientation} onChange={e => set('orientation', e.target.value)} className={selectCls}>
        <option value="portrait">Portrait</option>
        <option value="landscape">Landscape</option>
        </select>
        </Row>
        <Row label="Year">
        <select value={printYear} onChange={e => setPrintYear(parseInt(e.target.value))} className={selectCls}>
        {Array.from({ length: 11 }, (_, i) => year - 5 + i).map(y => (
            <option key={y} value={y}>{y}</option>
        ))}
        </select>
        </Row>
        <Row label={`Margin: ${config.margin.toFixed(2)}"`}>
        <input
        type="range" min="0" max="1" step="0.05"
        value={config.margin}
        onChange={e => set('margin', parseFloat(e.target.value))}
        className="w-full accent-brass"
        />
        </Row>
        </Section>

        {/* Typography */}
        <Section title="Typography">
        <Row label="Day numbers">
        <select value={config.fontFamily} onChange={e => handleFontSelect('fontFamily', e.target.value)} className={selectCls}>
        {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        </Row>
        <Row label="Month title">
        <select value={config.titleFontFamily} onChange={e => handleFontSelect('titleFontFamily', e.target.value)} className={selectCls}>
        {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        </Row>
        <Row label="Verse text">
        <select value={config.verseTextFontFamily} onChange={e => handleFontSelect('verseTextFontFamily', e.target.value)} className={selectCls}>
        {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        </Row>
        <Row label="Verse ref">
        <select value={config.verseRefFontFamily} onChange={e => handleFontSelect('verseRefFontFamily', e.target.value)} className={selectCls}>
        {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        </Row>
        <Row label={`Day size: ${config.fontSize}pt`}>
        <input type="range" min="4" max="12" step="1" value={config.fontSize} onChange={e => set('fontSize', parseInt(e.target.value))} className="w-full accent-brass" />
        </Row>
        <Row label={`Title size: ${config.titleFontSize}pt`}>
        <input type="range" min="10" max="36" step="1" value={config.titleFontSize} onChange={e => set('titleFontSize', parseInt(e.target.value))} className="w-full accent-brass" />
        </Row>
        <Row label="Text color">
        <input type="color" value={config.fontColor} onChange={e => set('fontColor', e.target.value)} className="w-8 h-6 rounded border border-rule cursor-pointer" />
        </Row>
        <Row label="Title color">
        <input type="color" value={config.titleColor} onChange={e => set('titleColor', e.target.value)} className="w-8 h-6 rounded border border-rule cursor-pointer" />
        </Row>
        <Row label="Upload TTF">
        <button onClick={() => fontFileRef.current?.click()} className="text-label text-brass hover:underline">
        Upload
        </button>
        </Row>
        <input
        ref={fontFileRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const res = await api.uploadFont(file);
            setAvailableFonts(prev => [...prev, res]);
            e.target.value = '';
        }}
        />
        </Section>

        {/* Header */}
        <Section title="Header">
        <Row label={`Overlay: ${Math.round(config.overlayOpacity * 100)}%`}>
        <input
        type="range" min="0" max="1" step="0.05"
        value={config.overlayOpacity}
        onChange={e => set('overlayOpacity', parseFloat(e.target.value))}
        className="w-full accent-brass"
        />
        </Row>
        <Toggle label="Verse fills header height" checked={config.verseFillHeight || false} onChange={v => set('verseFillHeight', v)} />
        <p className="text-micro text-muted">Recommended: Header 1200×300px · Verse 400×400px</p>
        </Section>

        {/* Visual */}
        <Section title="Visual">
        <Toggle label="Weekday headers" checked={config.showWeekdayHeaders} onChange={v => set('showWeekdayHeaders', v)} />
        <Toggle label="Hebrew dates" checked={config.showHebrewDates} onChange={v => set('showHebrewDates', v)} />
        <Toggle label="Entry titles" checked={config.showEntryTitles} onChange={v => set('showEntryTitles', v)} />
        <Toggle label="Entry icons" checked={config.showEntryIcons} onChange={v => set('showEntryIcons', v)} />
        <Toggle label="Day images" checked={config.showDayImages} onChange={v => set('showDayImages', v)} />
        </Section>

        {/* Month Settings (per-month) */}
        <Section title="Month Settings">
        <p className="text-micro text-muted">Per-month header &amp; verse. Recommended: Header 1200×300px · Verse 400×400px</p>
        {selectedMonths.sort((a, b) => a - b).map(m => (
            <div key={m} className="border border-rule rounded p-2 flex flex-col gap-2">
            <h4 className="text-label font-semibold text-parchment">{monthLabel(m)}</h4>

            {/* Header image */}
            <Row label="Header img">
            <div className="flex gap-2">
            <button onClick={() => headerBgRefs.current[m]?.click()} className="text-label text-brass hover:underline">
            {getMonthSetting(m, 'headerBgImageUrl') ? 'Change' : 'Upload'}
            </button>
            {getMonthSetting(m, 'headerBgImageUrl') && (
                <button onClick={() => setMonthSetting(m, 'headerBgImageUrl', null)} className="text-label text-red-400 hover:underline">Remove</button>
            )}
            </div>
            </Row>
            <input
            ref={el => { headerBgRefs.current[m] = el; }}
            type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const resized = await resizeImage(file, 1200);
                const { url } = await api.uploadCalendarImage('day-bg', resized);
                setMonthSetting(m, 'headerBgImageUrl', url);
                e.target.value = '';
            }}
            />

            {/* Verse image */}
            <Row label="Verse img">
            <div className="flex gap-2">
            <button onClick={() => verseImgRefs.current[m]?.click()} className="text-label text-brass hover:underline">
            {getMonthSetting(m, 'verseImageUrl') ? 'Change' : 'Upload'}
            </button>
            {getMonthSetting(m, 'verseImageUrl') && (
                <button onClick={() => setMonthSetting(m, 'verseImageUrl', null)} className="text-label text-red-400 hover:underline">Remove</button>
            )}
            </div>
            </Row>
            <input
            ref={el => { verseImgRefs.current[m] = el; }}
            type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const resized = await resizeImage(file, 1200);
                const { url } = await api.uploadCalendarImage('day-bg', resized);
                setMonthSetting(m, 'verseImageUrl', url);
                e.target.value = '';
            }}
            />

            {/* Verse corner */}
            <Row label="Corner">
            <select value={getMonthSetting(m, 'verseCorner')} onChange={e => setMonthSetting(m, 'verseCorner', e.target.value)} className={selectCls}>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
            </select>
            </Row>

            {/* Verse ref */}
            <div className="flex flex-col gap-1">
            <label className="text-micro text-muted font-medium">Verse ref</label>
            <input
            value={getMonthSetting(m, 'verseRef')}
            onChange={e => setMonthSetting(m, 'verseRef', e.target.value)}
            placeholder="e.g. Psalm 90:12"
            className={inputCls}
            />
            <div className="flex items-center gap-2">
            <input
            type="color"
            value={config.verseRefColor}
            onChange={e => set('verseRefColor', e.target.value)}
            className="w-5 h-5 rounded border border-rule cursor-pointer"
            title="Verse ref color"
            />
            <input
            type="range" min="2" max="8" step="1"
            value={config.verseRefFontSize}
            onChange={e => set('verseRefFontSize', parseInt(e.target.value))}
            className="flex-1 accent-brass"
            />
            <span className="text-micro text-muted w-8 text-right">{config.verseRefFontSize}pt</span>
            </div>
            </div>

            {/* Verse text */}
            <div className="flex flex-col gap-1">
            <label className="text-micro text-muted font-medium">Verse text</label>
            <textarea
            value={getMonthSetting(m, 'verseText')}
            onChange={e => setMonthSetting(m, 'verseText', e.target.value)}
            rows={2}
            className={inputCls + ' resize-none'}
            placeholder="Type or paste verse"
            />
            <div className="flex items-center gap-2">
            <input
            type="color"
            value={config.verseTextColor}
            onChange={e => set('verseTextColor', e.target.value)}
            className="w-5 h-5 rounded border border-rule cursor-pointer"
            title="Verse text color"
            />
            <input
            type="range" min="3" max="10" step="1"
            value={config.verseTextFontSize}
            onChange={e => set('verseTextFontSize', parseInt(e.target.value))}
            className="flex-1 accent-brass"
            />
            <span className="text-micro text-muted w-8 text-right">{config.verseTextFontSize}pt</span>
            </div>
            {/* Generate verse */}
            <div className="flex items-center gap-1">
            <select
            value={coverModule}
            onChange={e => setCoverModule(e.target.value)}
            className={selectCls + ' flex-1'}
            >
            {coverModules.map(mod => <option key={mod.name} value={mod.name}>{mod.name}</option>)}
            </select>
            <button
            onClick={async () => {
                const ref = getMonthSetting(m, 'verseRef');
                if (!ref || !coverModule) return;
                try {
                    const res = await api.getPassage(coverModule, ref);
                    const verses = res?.verses || [];
                    const text = verses.map(v => (v.content || '')).join(' ').replace(/<[^>]*>/g, '').trim();
                    if (text) setMonthSetting(m, 'verseText', text);
                } catch (err) {
                    console.error('Verse fetch failed:', err);
                }
            }}
            disabled={!getMonthSetting(m, 'verseRef')}
            className="text-micro px-2 py-1 rounded border border-brass text-brass hover:bg-brass/20 disabled:opacity-40 shrink-0"
            >
            Generate
            </button>
            </div>
            </div>
            </div>
        ))}
        </Section>

        {/* Months */}
        <Section title="Months">
        {Array.from({ length: numMonths }, (_, i) => i + 1).map(m => (
            <label key={m} className="flex items-center gap-2 text-xs text-parchment/80 cursor-pointer">
            <input
            type="checkbox"
            checked={selectedMonths.includes(m)}
            onChange={() => setSelectedMonths(prev =>
                prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b)
            )}
            className="accent-brass"
            />
            {monthLabel(m)}
            </label>
        ))}
        </Section>

        {/* Layers */}
        <Section title="Layers">
        {layers.map(l => {
            const ls = config.layerFontSizes?.[l.id];
            const lc = config.layerFontColors?.[l.id];
            return (
                <div key={l.id} className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-xs text-parchment/80 cursor-pointer">
                <input
                type="checkbox"
                checked={config.layerIds.includes(l.id)}
                onChange={() => toggleLayer(l.id)}
                className="accent-brass"
                />
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                <span className="flex-1 truncate">{l.name}</span>
                <input
                type="number"
                min="4" max="12"
                value={ls ?? config.fontSize}
                onChange={e => {
                    const v = parseInt(e.target.value);
                    setConfig(prev => ({
                        ...prev,
                        layerFontSizes: { ...prev.layerFontSizes, [l.id]: v },
                    }));
                }}
                className="w-10 rounded border border-rule bg-ink/30 px-1 py-0.5 text-micro text-parchment text-center"
                title="Font size (pt)"
                />
                <input
                type="color"
                value={lc ?? l.color}
                onChange={e => {
                    setConfig(prev => ({
                        ...prev,
                        layerFontColors: { ...prev.layerFontColors, [l.id]: e.target.value },
                    }));
                }}
                className="w-5 h-5 rounded border border-rule cursor-pointer"
                title="Text color"
                />
                </label>
                </div>
            );
        })}
        </Section>

        {/* Cover */}
        <Section title="Cover Page">
        <Toggle label="Show cover" checked={!!(config.coverTitle || config.coverVerseRef || config.coverImageUrl)} onChange={v => {
            if (v) set('coverTitle', String(printYear));
            else { set('coverTitle', ''); set('coverVerseRef', ''); set('coverVerseText', ''); set('coverImageUrl', null); }
        }} />
        {config.coverTitle && (
            <>
            <Row label="Title">
            <input value={config.coverTitle} onChange={e => set('coverTitle', e.target.value)} className={inputCls} />
            </Row>

            {/* Verse picker */}
            <div className="flex flex-col gap-1">
            <label className="text-micro text-muted">Verse</label>
            <div className="flex gap-1">
            <select
            value={coverModule}
            onChange={e => setCoverModule(e.target.value)}
            className={selectCls + ' flex-1'}
            >
            {coverModules.map(mod => <option key={mod.name} value={mod.name}>{mod.name}</option>)}
            </select>
            <input
            value={config.coverVerseRef}
            onChange={e => set('coverVerseRef', e.target.value)}
            placeholder="Psalm 90:12"
            className={inputCls + ' flex-[2]'}
            />
            <button
            onClick={async () => {
                if (!config.coverVerseRef || !coverModule) return;
                setFetchingVerse(true);
                try {
                    const res = await api.getPassage(coverModule, config.coverVerseRef);
                    const verses = res?.verses || [];
                    const text = verses.map(v => (v.content || '')).join(' ').replace(/<[^>]*>/g, '').trim();
                    if (text) set('coverVerseText', text);
                } catch (err) {
                    console.error('Verse fetch failed:', err);
                } finally {
                    setFetchingVerse(false);
                }
            }}
            disabled={fetchingVerse || !config.coverVerseRef}
            className="text-label px-2 py-1 rounded border border-brass text-brass hover:bg-brass/20 disabled:opacity-40 shrink-0"
            >
            {fetchingVerse ? '…' : 'Fetch'}
            </button>
            </div>
            <textarea
            value={config.coverVerseText}
            onChange={e => set('coverVerseText', e.target.value)}
            rows={3}
            className={inputCls + ' resize-none'}
            placeholder="Auto-fills from Fetch, or type manually"
            />
            </div>
            </>
        )}
        </Section>

        {/* Save */}
        <button
        onClick={handleSave}
        className="mt-auto rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
        >
        Save Config
        </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto bg-black/40">
        {loading ? (
            <div className="flex items-center justify-center h-full text-muted text-sm">Loading…</div>
        ) : docData ? (
            <PrintPreview docData={docData} availableFonts={availableFonts} />
        ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">No data</div>
        )}
        </div>
        </div>
        </div>
    );
}

// ─── Small helper components ─────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="flex flex-col">
        <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
        >
        <h3 className="text-micro font-semibold uppercase tracking-wide text-muted">{title}</h3>
        <span className={`text-micro text-muted transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        </button>
        {open && <div className="flex flex-col gap-2 mt-2">{children}</div>}
        </div>
    );
}

function Row({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-2">
        <span className="text-label text-muted shrink-0">{label}</span>
        {children}
        </div>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex items-center justify-between cursor-pointer">
        <span className="text-label text-parchment/80">{label}</span>
        <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="accent-brass"
        />
        </label>
    );
}

const selectCls = 'rounded border border-rule bg-ink/30 px-1.5 py-0.5 text-label text-parchment';
const inputCls = 'w-full rounded border border-rule bg-ink/30 px-2 py-1 text-label text-parchment placeholder:text-muted/50';

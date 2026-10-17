import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Map, SlidersHorizontal, X } from 'lucide-react';
import BibleMapView from './BibleMapView.jsx';
import { api } from '../api/client.js';

function Attribution() {
  return (
    <div className="shrink-0 border-t border-rule bg-panel/60 px-3 py-1.5">
      <p className="font-ui text-[9px] leading-relaxed text-muted/70">
        Biblica Open Bible Maps © 2023–2026 Biblica, Inc.{' '}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-muted"
        >
          CC BY-SA 4.0
        </a>
      </p>
    </div>
  );
}

function PassageMapView({ passageRef }) {
  const [maps, setMaps] = useState(null);
  const [idx, setIdx] = useState(0);
  const [ref, setRef] = useState(passageRef || '');
  const [submitted, setSubmitted] = useState(passageRef || '');

  useEffect(() => {
    if (passageRef) {
      setRef(passageRef);
      setSubmitted(passageRef);
    }
  }, [passageRef]);

  useEffect(() => {
    if (!submitted) return;
    setMaps(null);
    setIdx(0);
    api.getMapsForReference(submitted)
      .then(setMaps)
      .catch(() => setMaps([]));
  }, [submitted]);

  const current = maps?.[idx] ?? null;
  const imageUrl = current?.imageUrl ?? null;

  return (
    <div className="flex h-full flex-col bg-ink">
      <div className="shrink-0 border-b border-rule bg-panel px-3 py-2">
        <form
          onSubmit={(e) => { e.preventDefault(); setSubmitted(ref.trim()); }}
          className="flex gap-2"
        >
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. Genesis 4:1"
            className="min-w-0 flex-1 rounded border border-rule bg-ink/60 px-2 py-1 font-ui text-xs text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
          />
          <button type="submit" className="rounded bg-brass/20 px-3 py-1 font-ui text-xs text-brass hover:bg-brass/30">
            Find
          </button>
        </form>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {!submitted && (
          <div className="flex h-full items-center justify-center">
            <p className="font-ui text-sm text-muted">Enter a reference to find a map.</p>
          </div>
        )}
        {submitted && maps === null && (
          <div className="flex h-full items-center justify-center">
            <p className="font-ui text-sm text-muted">Loading…</p>
          </div>
        )}
        {submitted && maps?.length === 0 && (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="font-ui text-sm text-muted">No map available for this passage.</p>
          </div>
        )}
        {imageUrl && (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={current.title || 'Bible map'}
            className="h-full w-full object-contain"
          />
        )}
        {maps?.length > 1 && (
          <div className="absolute bottom-10 right-3 flex items-center gap-1">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded bg-panel/80 p-1 text-muted hover:text-parchment disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-ui text-[10px] text-muted">{idx + 1}/{maps.length}</span>
            <button
              onClick={() => setIdx((i) => Math.min(maps.length - 1, i + 1))}
              disabled={idx === maps.length - 1}
              className="rounded bg-panel/80 p-1 text-muted hover:text-parchment disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
      <Attribution />
    </div>
  );
}

function BrowseView({ maps }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = (maps ?? [])
    .filter((m) => m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title));

  if (selected) {
    return (
      <div className="flex h-full flex-col bg-ink">
        <div className="flex shrink-0 items-center gap-2 border-b border-rule bg-panel px-3 py-2">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 font-ui text-xs text-muted hover:text-parchment"
          >
            <ChevronLeft size={13} />
            All Maps
          </button>
          <span className="min-w-0 flex-1 truncate font-ui text-xs text-parchment">{selected.title}</span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {selected.imageUrl ? (
            <img src={selected.imageUrl} alt={selected.title} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="font-ui text-sm text-muted">Image not available.</p>
            </div>
          )}
        </div>
        <Attribution />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ink">
      <div className="shrink-0 border-b border-rule bg-panel px-3 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search maps…"
          autoFocus
          className="w-full rounded border border-rule bg-ink/60 px-2 py-1 font-ui text-xs text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {maps === null ? (
          <p className="p-4 font-ui text-xs text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 font-ui text-xs text-muted">No maps found.</p>
        ) : (
          filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="flex w-full items-center border-b border-rule/40 px-3 py-2.5 text-left hover:bg-panel/50"
            >
              <span className="font-ui text-xs leading-snug text-parchment">{m.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function MapPanel({ open, onClose, pendingMapContext, passageRef, onOpenInCell, onOpenInCodex, onOpenInMapView }) {
  const [tab, setTab] = useState('interactive');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [allMaps, setAllMaps] = useState(null);

  // Fetch browse index once on mount
  useEffect(() => {
    api.getAllMaps().then(setAllMaps).catch(() => setAllMaps([]));
  }, []);

  // Switch to passage tab only when the panel first opens (not on every reference change)
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current && passageRef) {
      setTab('passage');
    }
    wasOpen.current = open;
  }, [open, passageRef]);

  const TABS = [
    { id: 'interactive', label: 'Interactive' },
    { id: 'passage', label: 'Passage' },
    { id: 'browse', label: 'Browse' },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col shadow-2xl transition-transform duration-300 ease-in-out sm:w-[600px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-1 border-b border-rule bg-panel px-3 py-2">
          <Map size={14} className="mr-1 shrink-0 text-brass" />
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded px-2.5 py-1 font-ui text-xs transition-colors ${
                tab === id ? 'bg-brass/20 text-brass' : 'text-muted hover:text-parchment'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex-1" />
          {tab === 'interactive' && (
            <button
              onClick={() => setControlsOpen((o) => !o)}
              title="Toggle map controls"
              className={`shrink-0 rounded p-1 transition-colors ${controlsOpen ? 'text-brass' : 'text-muted hover:text-parchment'}`}
            >
              <SlidersHorizontal size={15} />
            </button>
          )}
          {onOpenInMapView && (
            <button
              onClick={() => { onOpenInMapView(); onClose(); }}
              title="Open full Map page"
              className="shrink-0 rounded p-1 text-muted hover:text-brass"
            >
              <ArrowUpRight size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close (Ctrl+M)"
            className="shrink-0 rounded p-1 text-muted hover:text-parchment"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === 'interactive' && (
            open ? (
              <BibleMapView
                pendingMapContext={pendingMapContext}
                onOpenInCell={onOpenInCell}
                onOpenInCodex={onOpenInCodex}
                controlsOpen={controlsOpen}
                onToggleControls={() => setControlsOpen((o) => !o)}
              />
            ) : null
          )}
          {tab === 'passage' && <PassageMapView passageRef={passageRef} />}
          {tab === 'browse' && <BrowseView maps={allMaps} />}
        </div>
      </div>
    </>
  );
}

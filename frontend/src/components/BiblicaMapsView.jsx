import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Map as MapIcon, Search, X } from 'lucide-react';
import { api } from '../api/client.js';

function getCategoryFromTitle(title) {
  if (title.startsWith('SRV ')) return 'Scripture References';
  const colon = title.indexOf(':');
  if (colon > 0) return title.slice(0, colon);
  return 'Other';
}

function getShortTitle(title) {
  if (title.startsWith('SRV ')) return title;
  const colon = title.indexOf(':');
  return colon > 0 ? title.slice(colon + 2) : title;
}

const CATEGORY_ORDER = [
  'The Life of Jesus',
  'Paul and the Early Church',
  'Historical',
  'Wisdom & Prophets',
  'Scripture References',
  'Other',
];

export default function BiblicaMapsView() {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightboxMap, setLightboxMap] = useState(null);

  useEffect(() => {
    api.getAllMaps()
      .then(setMaps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const seen = new Set(maps.map((m) => getCategoryFromTitle(m.title)));
    return CATEGORY_ORDER.filter((c) => seen.has(c));
  }, [maps]);

  const filterTabs = ['all', ...categories.filter((c) => c !== 'Scripture References'), 'Scripture References'];

  const displayed = useMemo(() => {
    let result = maps;
    if (activeCategory !== 'all') {
      result = result.filter((m) => getCategoryFromTitle(m.title) === activeCategory);
    } else {
      // "All" hides SRV passage maps by default to keep the gallery focused
      result = result.filter((m) => !m.title.startsWith('SRV '));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(q));
    }
    return result;
  }, [maps, activeCategory, search]);

  const grouped = useMemo(() => {
    if (activeCategory !== 'all') return null; // single group when filtering
    const groups = {};
    for (const m of displayed) {
      const cat = getCategoryFromTitle(m.title);
      (groups[cat] ??= []).push(m);
    }
    return groups;
  }, [displayed, activeCategory]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      {/* Header */}
      <div className="shrink-0 border-b border-pageBorder px-5 py-4">
        <div className="flex items-center gap-2">
          <MapIcon size={17} className="text-brass" />
          <h1 className="font-display text-lg text-pageText">Bible Maps</h1>
          {!loading && !error && (
            <span className="ml-1 text-xs text-pageMuted">{maps.length} maps</span>
          )}
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-pageMuted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search maps…"
              className="w-full rounded border border-pageBorder bg-white/5 py-1.5 pl-8 pr-7 text-sm text-pageText placeholder:text-pageMuted focus:border-pageAccent focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-pageMuted hover:text-pageText">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="mt-2 flex flex-wrap gap-1">
          {filterTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                activeCategory === cat
                  ? 'border-brass bg-brass/15 text-brass'
                  : 'border-pageBorder text-pageMuted hover:border-pageAccent/60 hover:text-pageText'
              }`}
            >
              {cat === 'all' ? 'Atlas' : cat === 'Scripture References' ? 'Scripture Refs' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {loading && (
          <p className="text-sm text-pageMuted">Loading maps…</p>
        )}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        {!loading && !error && displayed.length === 0 && (
          <p className="text-sm text-pageMuted">No maps match your search.</p>
        )}

        {/* Grouped display (Atlas tab) */}
        {grouped && Object.keys(grouped).length > 0 && (
          CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
            <div key={cat} className="mb-8">
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-pageMuted">{cat}</h2>
              <MapGrid maps={grouped[cat]} onSelect={setLightboxMap} />
            </div>
          ))
        )}

        {/* Flat display (filtered tab) */}
        {!grouped && displayed.length > 0 && (
          <MapGrid maps={displayed} onSelect={setLightboxMap} />
        )}
      </div>

      {/* Lightbox */}
      {lightboxMap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxMap(null)}
        >
          <div
            className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-xl bg-page shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-pageBorder px-5 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-pageMuted">
                  {getCategoryFromTitle(lightboxMap.title)}
                </p>
                <p className="mt-0.5 font-display text-base leading-snug text-pageText">
                  {getShortTitle(lightboxMap.title)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={lightboxMap.imageUrl}
                  download
                  className="flex items-center gap-1 rounded border border-pageBorder px-2.5 py-1.5 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={11} />
                  Open
                </a>
                <button
                  onClick={() => setLightboxMap(null)}
                  className="rounded p-1 text-pageMuted hover:text-pageText"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center bg-black/20 p-2">
              <img
                src={lightboxMap.imageUrl}
                alt={lightboxMap.title}
                className="max-h-[72vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MapGrid({ maps, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {maps.map((map) => (
        <button
          key={map.id}
          onClick={() => onSelect(map)}
          className="group overflow-hidden rounded-lg border border-pageBorder bg-white/5 text-left transition-colors hover:border-brass/60"
        >
          <div className="aspect-[4/3] overflow-hidden bg-black/20">
            <img
              src={map.imageUrl}
              alt={map.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="p-2.5">
            <p className="text-xs font-medium leading-snug text-pageText group-hover:text-brass">
              {getShortTitle(map.title)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { api } from '../api/client.js';
import FootnotePopup from './FootnotePopup.jsx';

export default function TopicGuidePane({
  initialQuery,
  onStrongsClick,
  onVerseRefClick,
  isLoggedIn = false,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);   // [{module, description, key}]
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // {module, description, key}
  const [entryHtml, setEntryHtml] = useState('');
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [entryError, setEntryError] = useState(null);
  const [footnotePopup, setFootnotePopup] = useState(null);
  const inputRef = useRef(null);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      api.searchTopics(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => { clearTimeout(timer); setLoading(false); };
  }, [query]);

  // Respond to external triggers (Strong's drawer Factbook button, etc.)
  useEffect(() => {
    if (initialQuery?.term) {
      setQuery(initialQuery.term);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [initialQuery?.nonce]);

  // Auto-select first result when results arrive, unless selection still valid
  useEffect(() => {
    if (results.length === 0) return;
    const stillValid = selected && results.some((r) => r.module === selected.module && r.key === selected.key);
    if (!stillValid) setSelected(results[0]);
  }, [results]);

  // Fetch entry HTML when selection changes
  useEffect(() => {
    if (!selected) { setEntryHtml(''); return; }
    let cancelled = false;
    setLoadingEntry(true);
    setEntryError(null);
    api.getDictionaryEntry(selected.module, selected.key)
      .then((res) => { if (!cancelled) setEntryHtml(res.html); })
      .catch((e) => { if (!cancelled) setEntryError(e.message); })
      .finally(() => { if (!cancelled) setLoadingEntry(false); });
    return () => { cancelled = true; };
  }, [selected?.module, selected?.key]);

  // Group results by module for the nav panel
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of results) {
      if (!map.has(r.module)) map.set(r.module, { description: r.description, keys: [] });
      map.get(r.module).keys.push(r.key);
    }
    return [...map.entries()].map(([module, { description, keys }]) => ({ module, description, keys }));
  }, [results]);

  // Navigate to a cross-referenced key: try same module first, then search
  async function navigateToKey(key) {
    if (!key) return;
    if (selected) {
      try {
        const res = await api.getDictionaryEntry(selected.module, key);
        setSelected({ module: selected.module, description: selected.description, key });
        setEntryHtml(res.html);
        return;
      } catch {}
    }
    setQuery(key);
  }

  function handleContentClick(e) {
    const linkEl = e.target.closest('a[href]');
    if (linkEl) {
      e.preventDefault();
      const href = linkEl.getAttribute('href') || '';
      const strongsM = href.match(/^(?:strongs?|lemma):([GH]\d{1,5})$/i)
        || (!href.includes(':') && !href.includes('/') && href.match(/^([GH]\d{1,5})$/i));
      if (strongsM) { onStrongsClick?.(strongsM[1].toUpperCase(), e, null, linkEl.textContent.trim(), selected?.module); return; }
      const dictM = href.match(/^Vines?:\s*(.+)$/i);
      if (dictM) { navigateToKey(dictM[1].trim()); return; }
      if (href && !href.startsWith('http') && !href.startsWith('sword://') && !href.startsWith('#')) {
        navigateToKey(href.trim()); return;
      }
      return;
    }
    const entryRefEl = e.target.closest('.dict-entry-ref');
    if (entryRefEl?.dataset.key) { navigateToKey(entryRefEl.dataset.key); return; }
    const footnoteEl = e.target.closest('.footnote-marker');
    if (footnoteEl) { setFootnotePopup({ text: footnoteEl.dataset.note, x: e.clientX, y: e.clientY }); return; }
    const xrefEl = e.target.closest('.xref-marker');
    if (xrefEl) { onVerseRefClick?.(xrefEl.dataset.refs, e); return; }
    const verseRefEl = e.target.closest('.verse-ref');
    if (verseRefEl) { onVerseRefClick?.(verseRefEl.dataset.ref, e); return; }
  }

  function clearSearch() {
    setQuery('');
    setResults([]);
    setSelected(null);
    setEntryHtml('');
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left nav panel (dark) ── */}
      <div className="flex w-56 shrink-0 flex-col border-r border-rule bg-panel">

        {/* Search input */}
        <div className="shrink-0 border-b border-rule px-2 py-2">
          <div className="flex items-center gap-1.5 rounded border border-rule bg-ink/60 px-2 py-1.5">
            <Search size={12} className="shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics…"
              className="min-w-0 flex-1 bg-transparent text-sm text-parchment placeholder:text-muted focus:outline-none"
              autoFocus
            />
            {query && (
              <button onClick={clearSearch} className="shrink-0 text-muted hover:text-parchment">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Results list */}
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {loading && (
            <p className="px-3 py-2 text-xs text-muted">Searching…</p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">No results for "{query.trim()}".</p>
          )}
          {!query.trim() && (
            <p className="px-3 py-4 text-xs leading-relaxed text-muted/60">
              Type a person, place, or topic to search all installed reference modules.
            </p>
          )}
          {grouped.map(({ module, description, keys }) => (
            <div key={module} className="mb-2">
              <p className="px-3 pb-0.5 pt-2 font-sans text-[9px] uppercase tracking-widest text-muted/60">
                {description}
              </p>
              {keys.map((key) => {
                const isActive = selected?.module === module && selected?.key === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected({ module, description, key })}
                    className={`w-full truncate px-3 py-1.5 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-verdigris/20 text-brass'
                        : 'text-parchment/80 hover:bg-ink/40 hover:text-parchment'
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right content panel (parchment) ── */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-page px-7 py-6">
        {!selected && !query.trim() && (
          <div className="mt-12 text-center text-pageMuted">
            <Search size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Search for a topic, person, or place</p>
            <p className="mt-1 text-xs opacity-60">Results drawn from all installed dictionaries and reference modules</p>
          </div>
        )}
        {!selected && query.trim() && !loading && (
          <p className="text-sm text-pageMuted">Select an entry from the list.</p>
        )}

        {selected && (
          <>
            {/* Entry header */}
            <div className="mb-5 border-b border-pageBorder pb-4">
              <h1 className="font-display text-2xl font-normal text-pageText">{selected.key}</h1>
              <p className="mt-1 font-sans text-xs text-pageMuted">{selected.description}</p>
            </div>

            {/* Entry content */}
            {loadingEntry && <p className="text-sm text-pageMuted">Loading…</p>}
            {entryError && <p className="text-sm text-red-600">{entryError}</p>}
            {!loadingEntry && !entryError && entryHtml && (
              <div
                className="markdown-body markdown-body-page max-w-2xl font-display text-base leading-relaxed text-pageText"
                dangerouslySetInnerHTML={{ __html: entryHtml }}
                onClick={handleContentClick}
              />
            )}
          </>
        )}
      </div>

      {footnotePopup && (
        <FootnotePopup
          text={footnotePopup.text}
          x={footnotePopup.x}
          y={footnotePopup.y}
          onClose={() => setFootnotePopup(null)}
        />
      )}
    </div>
  );
}

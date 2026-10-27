import { useState, useEffect, useRef, forwardRef } from 'react';
import { Search, X, ArrowRight, BookOpen } from 'lucide-react';
import { api } from '../api/client.js';

function looksLikeReference(q) {
  return /^(\d\s+)?[a-z][a-z.]+\.?\s+\d/i.test(q.trim());
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const SearchBar = forwardRef(function SearchBar(
  { activeModule, onJump, onSearch, onCommentarySearch },
  ref,
) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [verseHits, setVerseHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const trimmed = query.trim();
  const isRef = looksLikeReference(trimmed);

  // Close dropdown on outside click
  useEffect(() => {
    function onPointer(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  // Debounced keyword search for live preview
  useEffect(() => {
    setActiveIdx(-1);
    setVerseHits([]);
    clearTimeout(debounceRef.current);

    if (!trimmed || isRef || !activeModule) {
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.search(trimmed, activeModule, 'multiWord');
        setVerseHits((res.bible || []).slice(0, 5));
      } catch {
        setVerseHits([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [trimmed, isRef, activeModule]);

  // Unified item list for keyboard navigation
  const navItems = !trimmed
    ? []
    : [
        ...(isRef ? [{ kind: 'ref', label: trimmed }] : []),
        ...(!isRef
          ? verseHits.map((v) => ({
              kind: 'verse',
              ref: `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`,
              text: stripHtml(v.content),
            }))
          : []),
        { kind: 'search-bible' },
        { kind: 'search-commentary' },
      ];

  const footerStart = navItems.findIndex((item) => item.kind === 'search-bible');
  const hasMainResults = footerStart > 0;

  function selectItem(item) {
    switch (item.kind) {
      case 'ref':               onJump?.(item.label); break;
      case 'verse':             onJump?.(item.ref); break;
      case 'search-bible':      onSearch?.(trimmed); break;
      case 'search-commentary': onCommentarySearch?.(trimmed); break;
    }
    setQuery('');
    setVerseHits([]);
    setOpen(false);
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!trimmed) return;
    if (activeIdx >= 0 && navItems[activeIdx]) {
      selectItem(navItems[activeIdx]);
      return;
    }
    if (isRef) onJump?.(trimmed);
    else onSearch?.(trimmed);
    setQuery('');
    setVerseHits([]);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || !trimmed) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <Search size={13} className="pointer-events-none absolute left-3 text-muted" />
          <input
            ref={ref}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(-1);
              setOpen(true);
            }}
            onFocus={() => { if (trimmed) setOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Reference or keyword — / to focus"
            autoComplete="off"
            className="w-full rounded-md border border-rule bg-panel py-1.5 pl-8 pr-7 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
          />
          {trimmed && (
            <button
              type="button"
              onClick={() => { setQuery(''); setVerseHits([]); setOpen(false); }}
              className="absolute right-2 rounded p-0.5 text-muted hover:text-parchment"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </form>

      {open && trimmed && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-rule bg-panel shadow-2xl">

          {/* Reference or verse results */}
          {navItems.slice(0, footerStart < 0 ? navItems.length : footerStart).map((item, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); selectItem(item); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${activeIdx === i ? 'bg-brass/10' : 'hover:bg-brass/10'}`}
            >
              {item.kind === 'ref' && (
                <>
                  <ArrowRight size={13} className="shrink-0 text-verdigris" />
                  <span className="text-sm text-parchment">
                    Go to{' '}
                    <span className="font-semibold text-verdigris">{item.label}</span>
                  </span>
                </>
              )}
              {item.kind === 'verse' && (
                <>
                  <span className="w-20 shrink-0 font-mono text-[11px] font-semibold text-verdigris">
                    {item.ref}
                  </span>
                  <span className="line-clamp-1 min-w-0 text-sm text-parchment/80">
                    {item.text}
                  </span>
                </>
              )}
            </button>
          ))}

          {/* Searching indicator */}
          {!isRef && searching && verseHits.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-muted">Searching…</p>
          )}

          {/* Footer: full-search actions */}
          {footerStart >= 0 && (
            <div className={hasMainResults || (searching && !isRef) ? 'border-t border-rule/60' : ''}>
              <button
                onMouseDown={(e) => { e.preventDefault(); selectItem({ kind: 'search-bible' }); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  activeIdx === footerStart ? 'bg-brass/10 text-parchment' : 'text-muted hover:bg-brass/10 hover:text-parchment'
                }`}
              >
                <Search size={11} className="shrink-0" />
                Search{' '}
                <span className="mx-1 font-medium text-parchment/90">"{trimmed}"</span>
                in Bible →
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); selectItem({ kind: 'search-commentary' }); }}
                className={`flex w-full items-center gap-2 border-t border-rule/60 px-3 py-2 text-left text-xs transition-colors ${
                  activeIdx === footerStart + 1 ? 'bg-brass/10 text-parchment' : 'text-muted hover:bg-brass/10 hover:text-parchment'
                }`}
              >
                <BookOpen size={11} className="shrink-0" />
                Search{' '}
                <span className="mx-1 font-medium text-parchment/90">"{trimmed}"</span>
                in Commentaries →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default SearchBar;

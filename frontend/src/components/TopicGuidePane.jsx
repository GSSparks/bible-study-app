import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Search, Sparkles, X } from 'lucide-react';
import { api } from '../api/client.js';
import FootnotePopup from './FootnotePopup.jsx';
import { osisToHuman } from '../utils/osisToHuman.js';

const WIKIPEDIA_MODULE = '__wikipedia__';
const SUMMARY_MODULE = '__summary__';

export default function TopicGuidePane({
  initialQuery,
  onStrongsClick,
  isLoggedIn = false,
  defaultBibleModule,
}) {
  const [inputValue, setInputValue] = useState(''); // what's in the text box
  const [query, setQuery] = useState('');           // committed search term (Enter)
  const [results, setResults] = useState([]);
  const [loadingDict, setLoadingDict] = useState(false);
  const [wikipediaResult, setWikipediaResult] = useState(null);
  const [loadingWiki, setLoadingWiki] = useState(false);
  // History stack: { stack: [{module, description, key}], index: number }
  const [nav, setNav] = useState({ stack: [], index: -1 });
  const [entryHtml, setEntryHtml] = useState('');
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [entryError, setEntryError] = useState(null);
  const [footnotePopup, setFootnotePopup] = useState(null);
  const [versePreview, setVersePreview] = useState(null); // { ref, loading, html, x, y }
  const [summaryState, setSummaryState] = useState(null); // { loading, html, error, cached }
  const inputRef = useRef(null);

  const selected = nav.stack[nav.index] ?? null;
  const canBack = nav.index > 0;
  const canForward = nav.index < nav.stack.length - 1;

  // ── Search fires on committed query (Enter key), not on every keystroke ────
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setResults([]);
      setWikipediaResult(null);
      setLoadingDict(false);
      setLoadingWiki(false);
      return;
    }
    let cancelled = false;
    setLoadingDict(true);
    setLoadingWiki(true);
    api.searchTopics(q)
      .then((r) => { if (!cancelled) setResults(r); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoadingDict(false); });
    api.getWikipediaEntry(q)
      .then((r) => { if (!cancelled) setWikipediaResult(r); })
      .catch(() => { if (!cancelled) setWikipediaResult(null); })
      .finally(() => { if (!cancelled) setLoadingWiki(false); });
    return () => { cancelled = true; };
  }, [query]);

  // ── Respond to external triggers (e.g. opening Codex from StrongsDrawer) ──
  useEffect(() => {
    if (initialQuery?.term) {
      setInputValue(initialQuery.term);
      setQuery(initialQuery.term);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [initialQuery?.nonce]);

  // ── When results arrive, open the AI Summary home page ────────────────────
  useEffect(() => {
    if (results.length === 0) {
      setNav({ stack: [], index: -1 });
      return;
    }
    const normalizedQ = query.trim().toLowerCase();
    setNav({ stack: [{ module: SUMMARY_MODULE, description: 'AI Overview', key: normalizedQ }], index: 0 });
  }, [results]);

  // ── Fetch AI summary when summary entry is selected ────────────────────────
  useEffect(() => {
    if (selected?.module !== SUMMARY_MODULE) return;
    const q = selected.key;
    setSummaryState({ loading: true, html: null, error: null, cached: false });
    api.getCodexSummary(q)
      .then((res) => setSummaryState({ loading: false, html: res.summaryHtml, error: null, cached: res.cached }))
      .catch((e) => setSummaryState({ loading: false, html: null, error: e.message, cached: false }));
  }, [selected?.module === SUMMARY_MODULE ? selected.key : null]);

  // ── Fetch entry HTML when a DICT entry is selected ────────────────────────
  useEffect(() => {
    if (!selected || selected.module === WIKIPEDIA_MODULE || selected.module === SUMMARY_MODULE) {
      if (!selected) setEntryHtml('');
      return;
    }
    let cancelled = false;
    setLoadingEntry(true);
    setEntryError(null);
    api.getDictionaryEntry(selected.module, selected.key)
      .then((res) => { if (!cancelled) setEntryHtml(res.html); })
      .catch((e) => { if (!cancelled) setEntryError(e.message); })
      .finally(() => { if (!cancelled) setLoadingEntry(false); });
    return () => { cancelled = true; };
  }, [selected?.module, selected?.key]);

  // ── Close verse preview on outside click ──────────────────────────────────
  useEffect(() => {
    if (!versePreview) return;
    function close() { setVersePreview(null); }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [!!versePreview]);

  // ── Group DICT results by module ──────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of results) {
      if (!map.has(r.module)) map.set(r.module, { description: r.description, keys: [] });
      map.get(r.module).keys.push(r.key);
    }
    return [...map.entries()].map(([module, { description, keys }]) => ({ module, description, keys }));
  }, [results]);

  const loading = loadingDict || loadingWiki;
  const hasResults = results.length > 0 || !!wikipediaResult;

  // ── History navigation ────────────────────────────────────────────────────
  function navigateTo(entry) {
    setNav((prev) => {
      const truncated = prev.stack.slice(0, prev.index + 1);
      return { stack: [...truncated, entry], index: truncated.length };
    });
  }

  function goBack() {
    setNav((prev) => prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev);
  }

  function goForward() {
    setNav((prev) => prev.index < prev.stack.length - 1 ? { ...prev, index: prev.index + 1 } : prev);
  }

  // ── Cross-reference navigation within the same module ─────────────────────
  async function navigateToKey(key) {
    if (!key) return;
    if (!selected || selected.module === WIKIPEDIA_MODULE) {
      setInputValue(key);
      setQuery(key);
      return;
    }
    try {
      // Verify key exists before pushing to history; fall back to query search if not
      await api.getDictionaryEntry(selected.module, key);
      navigateTo({ module: selected.module, description: selected.description, key });
    } catch {
      setQuery(key);
    }
  }

  // ── Verse preview on verse-ref / xref clicks ──────────────────────────────
  function handleVerseRefClick(osisRef, event) {
    if (!defaultBibleModule || !osisRef) return;
    event.stopPropagation();
    const firstRef = osisRef.split(/\s+/)[0];
    const humanRef = osisToHuman(firstRef);
    if (!humanRef) return;
    const x = Math.min(event.clientX, window.innerWidth - 330);
    const y = event.clientY + 14;
    setVersePreview({ ref: humanRef, loading: true, html: null, x, y });
    api.getPassage(defaultBibleModule, humanRef)
      .then((res) => {
        const html = (res.verses || []).map((v) => v.content).join(' ');
        setVersePreview((prev) => prev?.ref === humanRef ? { ...prev, loading: false, html } : prev);
      })
      .catch(() => setVersePreview(null));
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
    if (xrefEl) { handleVerseRefClick(xrefEl.dataset.refs, e); return; }
    const verseRefEl = e.target.closest('.verse-ref');
    if (verseRefEl) { handleVerseRefClick(verseRefEl.dataset.ref, e); return; }
    const topicRefEl = e.target.closest('.codex-topic-ref');
    if (topicRefEl?.dataset.query) {
      const term = topicRefEl.dataset.query;
      setInputValue(term);
      setQuery(term);
      return;
    }
  }

  function selectWikipedia() {
    if (!wikipediaResult) return;
    navigateTo({ module: WIKIPEDIA_MODULE, description: 'Wikipedia', key: wikipediaResult.title });
    setEntryHtml('');
    setEntryError(null);
  }

  function clearSearch() {
    setInputValue('');
    setQuery('');
    setResults([]);
    setWikipediaResult(null);
    setNav({ stack: [], index: -1 });
    setEntryHtml('');
    inputRef.current?.focus();
  }

  const isWikiSelected = selected?.module === WIKIPEDIA_MODULE;
  const isSummarySelected = selected?.module === SUMMARY_MODULE;

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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setQuery(inputValue.trim()); }}
              placeholder="Search, press Enter…"
              className="min-w-0 flex-1 bg-transparent text-sm text-parchment placeholder:text-muted focus:outline-none"
              autoFocus
            />
            {inputValue && (
              <button onClick={clearSearch} className="shrink-0 text-muted hover:text-parchment">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Results list */}
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {loading && !hasResults && (
            <p className="px-3 py-2 text-xs text-muted">Searching…</p>
          )}
          {!loading && query.trim().length >= 2 && !hasResults && (
            <p className="px-3 py-2 text-xs text-muted">No results for "{query.trim()}".</p>
          )}
          {!inputValue.trim() && (
            <p className="px-3 py-4 text-xs leading-relaxed text-muted/60">
              Type a topic and press Enter to search all installed reference modules.
            </p>
          )}

          {/* AI Summary home entry — shown whenever there are any results */}
          {results.length > 0 && (
            <div className="border-b border-rule/30 pb-1 mb-1">
              <button
                onClick={() => navigateTo({ module: SUMMARY_MODULE, description: 'AI Overview', key: query.trim().toLowerCase() })}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isSummarySelected
                    ? 'bg-verdigris/20 text-brass'
                    : 'text-parchment/80 hover:bg-ink/40 hover:text-parchment'
                }`}
              >
                <Sparkles size={12} className="shrink-0 opacity-70" />
                AI Overview
              </button>
            </div>
          )}

          {/* DICT module results */}
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
                    onClick={() => navigateTo({ module, description, key })}
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

          {/* Wikipedia result */}
          {(wikipediaResult || loadingWiki) && query.trim().length >= 2 && (
            <div className="mt-1 border-t border-rule/30 pt-1">
              <p className="px-3 pb-0.5 pt-2 font-sans text-[9px] uppercase tracking-widest text-muted/60">
                Wikipedia
              </p>
              {loadingWiki && !wikipediaResult && (
                <p className="px-3 py-1 text-xs text-muted">Loading…</p>
              )}
              {wikipediaResult && (
                <button
                  onClick={selectWikipedia}
                  className={`flex w-full items-center gap-2 truncate px-3 py-1.5 text-left text-sm transition-colors ${
                    isWikiSelected
                      ? 'bg-verdigris/20 text-brass'
                      : 'text-parchment/80 hover:bg-ink/40 hover:text-parchment'
                  }`}
                >
                  {wikipediaResult.thumbnail && (
                    <img
                      src={wikipediaResult.thumbnail}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-sm object-cover"
                    />
                  )}
                  <span className="truncate">{wikipediaResult.title}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right content panel (parchment) ── */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-page px-7 py-6">
        {!selected && !query.trim() && (
          <div className="mt-12 text-center text-pageMuted">
            <Search size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Search for a topic, person, or place</p>
            <p className="mt-1 text-xs opacity-60">Searches installed dictionaries and Wikipedia</p>
          </div>
        )}
        {!selected && query.trim() && !loading && (
          <p className="text-sm text-pageMuted">Select an entry from the list.</p>
        )}

        {/* AI Summary home page */}
        {selected && isSummarySelected && (
          <>
            <div className="mb-5 border-b border-pageBorder pb-4">
              <div className="mb-3 flex items-center gap-1">
                <button
                  onClick={goBack}
                  disabled={!canBack}
                  title="Back"
                  className="rounded p-1 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={goForward}
                  disabled={!canForward}
                  title="Forward"
                  className="rounded p-1 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="shrink-0 text-pageAccent opacity-70" />
                <h1 className="font-display text-2xl font-normal capitalize text-pageText">{selected.key}</h1>
              </div>
              <p className="mt-1 font-sans text-xs text-pageMuted">
                AI Overview
                {summaryState?.cached === false && !summaryState?.loading && (
                  <span className="ml-2 rounded bg-verdigris/15 px-1.5 py-0.5 text-[10px] text-verdigris">just generated</span>
                )}
              </p>
            </div>
            {summaryState?.loading && (
              <div className="flex items-center gap-2 text-sm text-pageMuted">
                <Sparkles size={14} className="animate-pulse" />
                Generating overview…
              </div>
            )}
            {summaryState?.error && (
              <p className="text-sm text-red-600">{summaryState.error}</p>
            )}
            {!summaryState?.loading && !summaryState?.error && summaryState?.html && (
              <div
                className="markdown-body markdown-body-page max-w-2xl font-display text-base leading-relaxed text-pageText"
                dangerouslySetInnerHTML={{ __html: summaryState.html }}
                onClick={handleContentClick}
              />
            )}
          </>
        )}

        {/* DICT entry */}
        {selected && !isWikiSelected && !isSummarySelected && (
          <>
            <div className="mb-5 border-b border-pageBorder pb-4">
              <div className="mb-3 flex items-center gap-1">
                <button
                  onClick={goBack}
                  disabled={!canBack}
                  title="Back"
                  className="rounded p-1 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={goForward}
                  disabled={!canForward}
                  title="Forward"
                  className="rounded p-1 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <h1 className="font-display text-2xl font-normal text-pageText">{selected.key}</h1>
              <p className="mt-1 font-sans text-xs text-pageMuted">{selected.description}</p>
            </div>
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

        {/* Wikipedia entry */}
        {selected && isWikiSelected && wikipediaResult && (
          <>
            <div className="mb-5 border-b border-pageBorder pb-4">
              <div className="mb-3 flex items-center gap-1">
                <button
                  onClick={goBack}
                  disabled={!canBack}
                  title="Back"
                  className="rounded p-1 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={goForward}
                  disabled={!canForward}
                  title="Forward"
                  className="rounded p-1 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-normal text-pageText">{wikipediaResult.title}</h1>
                  <p className="mt-1 font-sans text-xs text-pageMuted">Wikipedia</p>
                </div>
                {wikipediaResult.thumbnail && (
                  <img
                    src={wikipediaResult.thumbnail}
                    alt={wikipediaResult.title}
                    className="h-20 w-20 shrink-0 rounded object-cover shadow"
                  />
                )}
              </div>
            </div>

            {wikipediaResult.html && (
              <div
                className="mb-5 max-w-2xl font-display text-base leading-relaxed text-pageText"
                dangerouslySetInnerHTML={{ __html: wikipediaResult.html }}
              />
            )}

            {wikipediaResult.url && (
              <a
                href={wikipediaResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-verdigris hover:text-brass"
              >
                Read full article on Wikipedia
                <ExternalLink size={12} />
              </a>
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

      {/* Verse preview floating card — fixed so it's never clipped by overflow containers */}
      {versePreview && (
        <div
          className="fixed z-50 max-w-xs rounded-md border border-pageBorder bg-page p-3 shadow-xl"
          style={{ left: versePreview.x, top: versePreview.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="font-sans text-xs font-medium text-pageMuted">{versePreview.ref}</span>
            <button onClick={() => setVersePreview(null)} className="shrink-0 text-pageMuted hover:text-pageText">
              <X size={12} />
            </button>
          </div>
          {versePreview.loading ? (
            <p className="text-xs text-pageMuted">Loading…</p>
          ) : (
            <div
              className="font-display text-sm leading-relaxed text-pageText"
              dangerouslySetInnerHTML={{ __html: versePreview.html || '' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookText, Check, ChevronLeft, ChevronRight, Download, ExternalLink, List, Pencil, Search, Sparkles, Tag, Volume2, X } from 'lucide-react';
import { api } from '../api/client.js';
import FootnotePopup from './FootnotePopup.jsx';
import VerseHoverCard from './VerseHoverCard.jsx';
import { osisToHuman } from '../utils/osisToHuman.js';
import { injectTocLinks } from '../utils/dictHtml.js';

const WIKIPEDIA_MODULE = '__wikipedia__';
const MERRIAM_MODULE = '__merriam__';
const SUMMARY_MODULE = '__summary__';

// Renders the MW logo image; falls back to a plain text span if the file
// hasn't been placed yet. `invert` applies a CSS filter for use on dark
// backgrounds (sidebar), where the standard dark logo needs to be white.
// Try SVG first, then PNG, then fall back to text. Export the .ai file from
// Illustrator as SVG and save to frontend/public/merriam-webster-logo.svg
const MW_LOGO_SRCS = ['/merriam-webster-logo.svg', '/merriam-webster-logo.png'];

function MerriamLogo({ height = 14, invert = false }) {
  const [srcIdx, setSrcIdx] = useState(0);
  if (srcIdx >= MW_LOGO_SRCS.length) {
    return (
      <span className="font-sans font-semibold" style={{ fontSize: height * 0.85 }}>
        Merriam-Webster
      </span>
    );
  }
  return (
    <img
      src={MW_LOGO_SRCS[srcIdx]}
      alt="Merriam-Webster"
      style={{ height, filter: invert ? 'brightness(0) invert(1)' : undefined }}
      onError={() => setSrcIdx((i) => i + 1)}
    />
  );
}

// Convert "See [also] CAPS-TERM[; CAPS-TERM2]" patterns in SWORD dictionary
// entries into codex-topic-ref spans. The term character class intentionally
// excludes \s so the alternation terminates naturally at the first space before
// a non-uppercase letter — no lookahead needed, no newline edge-case failures.
// Semicolon-separated lists ("See TERM1; TERM2") are split into individual links.
function wrapSeeReferences(html) {
  const tagRe = /<[^>]*>/g;
  const tagSpans = [];
  let t;
  while ((t = tagRe.exec(html))) tagSpans.push([t.index, t.index + t[0].length]);
  const inTag = (s, e) => tagSpans.some(([ts, te]) => s < te && e > ts);

  // Caps word: uppercase start, then uppercase/digit/comma/straight-apostrophe/hyphen.
  // Phrase: one or more caps words joined by spaces.
  // Pattern: "See [also] PHRASE[; PHRASE2]" — group 2 captures all terms.
  const seeRe = /(See(?:\s+also)?)\s+((?:[A-Z][A-Z0-9,\x27-]*(?:\s+[A-Z][A-Z0-9,\x27-]*)*)(?:\s*;\s*[A-Z][A-Z0-9,\x27-]*(?:\s+[A-Z][A-Z0-9,\x27-]*)*)*)/g;

  const hits = [];
  let m;
  while ((m = seeRe.exec(html))) {
    if (inTag(m.index, m.index + m[0].length)) continue;
    const prefix = m[1];
    const terms = m[2]
      .split(/\s*;\s*/)
      .map((s) => s.trim().replace(/[.,;:]+$/, "").trim())
      .filter((s) => s.length > 1);
    if (terms.length === 0) continue;
    hits.push({ start: m.index, end: m.index + m[0].length, prefix, terms });
  }

  let result = html;
  for (let i = hits.length - 1; i >= 0; i--) {
    const { start, end, prefix, terms } = hits[i];
    const linked = terms
      .map((term) => `<span class="codex-topic-ref" data-query="${term}">${term}</span>`)
      .join("; ");
    result = result.slice(0, start) + `${prefix} ${linked}` + result.slice(end);
  }
  return result;
}

export default function TopicGuidePane({
  initialQuery,
  onStrongsClick,
  isLoggedIn = false,
  defaultBibleModule,
  onOpenInBible,
  onOpenInCell,
}) {
  const [inputValue, setInputValue] = useState(''); // what's in the text box
  const [query, setQuery] = useState('');           // committed search term (Enter)
  const [results, setResults] = useState([]);
  const [loadingDict, setLoadingDict] = useState(false);
  const [wikipediaResult, setWikipediaResult] = useState(null);
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [merriamResult, setMerriamResult] = useState(null);
  const [loadingMerriam, setLoadingMerriam] = useState(false);
  // History stack: { stack: [{module, description, key}], index: number }
  const [nav, setNav] = useState({ stack: [], index: -1 });
  const [entryHtml, setEntryHtml] = useState('');
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [entryError, setEntryError] = useState(null);
  const [toc, setToc] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef(null);
  const [footnotePopup, setFootnotePopup] = useState(null);
  const [summaryState, setSummaryState] = useState(null); // { loading, html, error, cached, id, summaryMd, tags }
  const [editing, setEditing] = useState(false);
  const [editMd, setEditMd] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [hoverCard, setHoverCard] = useState(null); // { ref, rect }
  const closeTimer = useRef(null);
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
      setMerriamResult(null);
      setLoadingDict(false);
      setLoadingWiki(false);
      setLoadingMerriam(false);
      return;
    }
    let cancelled = false;
    setLoadingDict(true);
    setLoadingWiki(true);
    setLoadingMerriam(true);
    api.searchTopics(q)
      .then((r) => { if (!cancelled) setResults(r); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoadingDict(false); });
    api.getWikipediaEntry(q)
      .then((r) => { if (!cancelled) setWikipediaResult(r); })
      .catch(() => { if (!cancelled) setWikipediaResult(null); })
      .finally(() => { if (!cancelled) setLoadingWiki(false); });
    api.getMerriamEntry(q)
      .then((r) => { if (!cancelled) setMerriamResult(r); })
      .catch(() => { if (!cancelled) setMerriamResult(null); })
      .finally(() => { if (!cancelled) setLoadingMerriam(false); });
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
      .then((res) => {
        setSummaryState({ loading: false, html: res.summaryHtml, error: null, cached: res.cached, id: res.id, summaryMd: res.summaryMd, tags: res.tags ?? [] });
        setEditing(false);
      })
      .catch((e) => setSummaryState({ loading: false, html: null, error: e.message, cached: false }));
  }, [selected?.module === SUMMARY_MODULE ? selected.key : null]);

  // ── Reset TOC when navigating to any entry ────────────────────────────────
  useEffect(() => {
    setToc([]);
    setTocOpen(false);
  }, [selected?.module, selected?.key]);

  // ── Fetch entry HTML when a DICT/BOOK entry is selected ──────────────────
  useEffect(() => {
    if (!selected || selected.module === WIKIPEDIA_MODULE || selected.module === MERRIAM_MODULE || selected.module === SUMMARY_MODULE) {
      if (!selected) setEntryHtml('');
      return;
    }
    let cancelled = false;
    setLoadingEntry(true);
    setEntryError(null);
    const fetch = selected.moduleType === 'BOOK' ? api.getBookEntry : api.getDictionaryEntry;
    fetch(selected.module, selected.key)
      .then((res) => {
        if (cancelled) return;
        const { html, toc: newToc } = injectTocLinks(wrapSeeReferences(res.html));
        setEntryHtml(html);
        setToc(newToc);
      })
      .catch((e) => { if (!cancelled) setEntryError(e.message); })
      .finally(() => { if (!cancelled) setLoadingEntry(false); });
    return () => { cancelled = true; };
  }, [selected?.module, selected?.key]);

  // ── Group DICT/BOOK results by module ────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of results) {
      if (!map.has(r.module)) map.set(r.module, { description: r.description, keys: [], moduleType: r.moduleType });
      map.get(r.module).keys.push(r.key);
    }
    return [...map.entries()].map(([module, { description, keys, moduleType }]) => ({ module, description, keys, moduleType }));
  }, [results]);

  const loading = loadingDict || loadingWiki || loadingMerriam;
  const hasResults = results.length > 0 || !!wikipediaResult || !!merriamResult;

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
      const fetch = selected.moduleType === 'BOOK' ? api.getBookEntry : api.getDictionaryEntry;
      await fetch(selected.module, key);
      navigateTo({ module: selected.module, description: selected.description, key, moduleType: selected.moduleType });
    } catch {
      setQuery(key);
    }
  }

  // ── Verse ref hover card ──────────────────────────────────────────────────
  function scheduleHoverClose() {
    closeTimer.current = setTimeout(() => setHoverCard(null), 150);
  }

  function cancelHoverClose() {
    clearTimeout(closeTimer.current);
  }

  function handleContentMouseOver(e) {
    if (!defaultBibleModule) return;
    const verseEl = e.target.closest('.verse-ref');
    if (verseEl?.dataset.ref) {
      cancelHoverClose();
      setHoverCard({ ref: verseEl.dataset.ref, rect: verseEl.getBoundingClientRect() });
      return;
    }
    const xrefEl = e.target.closest('.xref-marker');
    if (xrefEl?.dataset.refs) {
      cancelHoverClose();
      const firstRef = xrefEl.dataset.refs.split(/\s+/)[0];
      const humanRef = osisToHuman(firstRef);
      if (humanRef) setHoverCard({ ref: humanRef, rect: xrefEl.getBoundingClientRect() });
      return;
    }
    scheduleHoverClose();
  }

  // ── Verse ref clicks → open slide-out Bible reader ────────────────────────
  function handleVerseRefClick(osisRef, event) {
    if (!osisRef) return;
    event.stopPropagation();
    const firstRef = osisRef.split(/\s+/)[0];
    const humanRef = osisToHuman(firstRef);
    if (!humanRef) return;
    onOpenInBible?.(humanRef);
  }

  function handleContentClick(e) {
    const linkEl = e.target.closest('a[href]');
    if (linkEl) {
      e.preventDefault();
      const href = linkEl.getAttribute('href') || '';
      // TOC anchor — scroll within the content panel
      if (href.startsWith('#')) {
        const targetId = href.slice(1);
        const target = contentRef.current?.querySelector(`#${CSS.escape(targetId)}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const strongsM = href.match(/^(?:strongs?|lemma):([GH]\d{1,5})$/i)
        || (!href.includes(':') && !href.includes('/') && href.match(/^([GH]\d{1,5})$/i));
      if (strongsM) { onStrongsClick?.(strongsM[1].toUpperCase(), e, null, linkEl.textContent.trim(), selected?.module); return; }
      const dictM = href.match(/^Vines?:\s*(.+)$/i);
      if (dictM) { navigateToKey(dictM[1].trim()); return; }
      if (href && !href.startsWith('http') && !href.startsWith('sword://')) {
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
    setMerriamResult(null);
    setNav({ stack: [], index: -1 });
    setEntryHtml('');
    setToc([]);
    setTocOpen(false);
    inputRef.current?.focus();
  }

  function selectMerriam() {
    if (!merriamResult) return;
    navigateTo({ module: MERRIAM_MODULE, description: 'Merriam-Webster', key: merriamResult.headword });
    setEntryHtml('');
    setEntryError(null);
  }

  function downloadEntry() {
    if (!summaryState?.summaryMd) return;
    const { summaryMd, tags } = summaryState;
    const title = selected?.key ?? 'entry';
    const tagLine = tags?.length ? `*Tags: ${tags.join(', ')}*\n\n` : '';
    const md = `# ${title}\n\n${tagLine}${summaryMd}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function startEdit() {
    setEditMd(summaryState?.summaryMd ?? '');
    setEditTags(summaryState?.tags ?? []);
    setTagInput('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    if (!summaryState?.id) return;
    setSaving(true);
    try {
      const res = await api.updateCodexEntry(summaryState.id, { summaryMd: editMd, tags: editTags });
      setSummaryState((prev) => ({ ...prev, html: res.summaryHtml, summaryMd: res.summaryMd, tags: res.tags ?? [] }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function addTag(value) {
    const t = value.trim().toLowerCase();
    if (t && !editTags.includes(t)) setEditTags((prev) => [...prev, t]);
    setTagInput('');
  }

  function removeTag(tag) {
    setEditTags((prev) => prev.filter((t) => t !== tag));
  }

  function jumpToSection(id) {
    if (!contentRef.current) return;
    const target = contentRef.current.querySelector(`#${CSS.escape(id)}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTocOpen(false);
    }
  }

  const isWikiSelected = selected?.module === WIKIPEDIA_MODULE;
  const isMerriamSelected = selected?.module === MERRIAM_MODULE;
  const isSummarySelected = selected?.module === SUMMARY_MODULE;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left nav panel (dark) — hidden on mobile when detail is visible ── */}
      <div className={`flex shrink-0 flex-col border-r border-rule bg-panel ${selected ? 'hidden lg:flex lg:w-64' : 'w-full lg:w-64'}`}>

        {/* Header */}
        <div className="shrink-0 border-b border-rule px-4 py-3">
          <div className="flex items-center gap-2">
            <BookText size={16} className="text-brass" />
            <h1 className="font-display text-base font-semibold text-parchment">Codex</h1>
          </div>
          <p className="mt-0.5 font-ui text-[10px] uppercase tracking-widest text-muted">Topical Reference</p>
        </div>

        {/* Search input */}
        <div className="shrink-0 border-b border-rule px-4 py-3">
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

          {/* DICT / BOOK module results */}
          {grouped.map(({ module, description, keys, moduleType }) => (
            <div key={module} className="mb-2">
              <p className="px-3 pb-0.5 pt-2 font-sans text-[9px] uppercase tracking-widest text-muted/60">
                {description}
                {moduleType === 'BOOK' && <span className="ml-1 opacity-60">· book</span>}
              </p>
              {keys.map((key) => {
                const isActive = selected?.module === module && selected?.key === key;
                return (
                  <button
                    key={key}
                    onClick={() => navigateTo({ module, description, key, ...(moduleType && { moduleType }) })}
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

          {/* Merriam-Webster result */}
          {(merriamResult || loadingMerriam) && query.trim().length >= 2 && (
            <div className="mt-1 border-t border-rule/30 pt-1">
              <div className="px-3 pb-0.5 pt-2 opacity-60">
                <MerriamLogo height={12} invert />
              </div>
              {loadingMerriam && !merriamResult && (
                <p className="px-3 py-1 text-xs text-muted">Loading…</p>
              )}
              {merriamResult && (
                <button
                  onClick={selectMerriam}
                  className={`flex w-full items-center gap-2 truncate px-3 py-1.5 text-left text-sm transition-colors ${
                    isMerriamSelected
                      ? 'bg-verdigris/20 text-brass'
                      : 'text-parchment/80 hover:bg-ink/40 hover:text-parchment'
                  }`}
                >
                  <span className="truncate">{merriamResult.headword}</span>
                  {merriamResult.groups[0] && (
                    <span className="shrink-0 font-sans text-[10px] italic text-muted/70">
                      {merriamResult.groups[0].fl}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right content panel (parchment) ── */}
      <div className={`relative flex min-w-0 flex-1 overflow-hidden bg-page ${selected ? 'flex' : 'hidden lg:flex'}`}>

        {/* Desktop: sliding TOC panel */}
        {toc.length > 0 && (
          <div
            className={[
              'hidden lg:flex lg:shrink-0 overflow-hidden bg-page transition-[width] duration-300 ease-in-out',
              tocOpen ? 'w-52 border-r border-pageBorder' : 'w-0',
            ].join(' ')}
          >
            <div className="w-52 shrink-0 overflow-y-auto px-3 py-4">
              <p className="mb-2 font-ui text-[9px] uppercase tracking-widest text-pageMuted">Contents</p>
              <nav className="space-y-0.5">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => jumpToSection(item.id)}
                    className={`block w-full truncate text-left text-xs leading-snug transition-colors hover:text-pageAccent ${
                      item.major
                        ? 'py-1 font-ui font-semibold text-pageText/80'
                        : 'py-0.5 pl-3 text-pageMuted'
                    }`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Desktop: static toggle tab — flex sibling, never animates position */}
        {toc.length > 0 && (
          <button
            onClick={() => setTocOpen((o) => !o)}
            title={tocOpen ? 'Close contents' : 'Open contents'}
            className="mt-20 hidden h-8 w-5 shrink-0 items-center justify-center self-start rounded-r border border-l-0 border-pageBorder bg-page text-pageMuted shadow-sm hover:text-pageAccent lg:flex"
          >
            <List size={11} />
          </button>
        )}

        {/* Mobile: TOC drops from top with close button in header */}
        {toc.length > 0 && (
          <div
            className={[
              'absolute left-0 right-0 top-0 z-20 overflow-hidden border-b border-pageBorder bg-page transition-[max-height] duration-300 ease-in-out lg:hidden',
              tocOpen ? 'max-h-64' : 'max-h-0',
            ].join(' ')}
          >
            <div className="px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-ui text-[9px] uppercase tracking-widest text-pageMuted">Contents</p>
                <button onClick={() => setTocOpen(false)} className="rounded p-0.5 text-pageMuted hover:text-pageAccent">
                  <X size={11} />
                </button>
              </div>
              <nav className="max-h-48 space-y-0.5 overflow-y-auto">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => jumpToSection(item.id)}
                    className={`block w-full text-left text-xs leading-snug transition-colors hover:text-pageAccent ${
                      item.major
                        ? 'py-1 font-ui font-semibold text-pageText/80'
                        : 'py-0.5 pl-3 text-pageMuted'
                    }`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Mobile: open button — only shown when TOC is closed */}
        {toc.length > 0 && !tocOpen && (
          <button
            onClick={() => setTocOpen(true)}
            title="Open contents"
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded border border-pageBorder bg-page text-pageMuted shadow-sm hover:text-pageAccent lg:hidden"
          >
            <List size={11} />
          </button>
        )}

        {/* Content column — flex-col so the mobile back bar sits above the article */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Mobile back button */}
        {selected && (
          <button
            onClick={() => setNav((n) => ({ ...n, index: -1, stack: [] }))}
            className="flex shrink-0 items-center gap-1.5 border-b border-pageBorder px-4 py-2.5 text-sm text-pageMuted hover:text-pageText lg:hidden"
          >
            <ChevronLeft size={15} />
            Back to results
          </button>
        )}

        {/* Scrollable article */}
        <div
          ref={contentRef}
          className="min-w-0 flex-1 overflow-y-auto px-7 py-6"
          onMouseOver={defaultBibleModule ? handleContentMouseOver : undefined}
          onMouseLeave={defaultBibleModule ? scheduleHoverClose : undefined}
        >
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
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="shrink-0 text-pageAccent opacity-70" />
                  <h1 className="font-display text-2xl font-normal capitalize text-pageText">{selected.key}</h1>
                </div>
                {summaryState?.id && !editing && !summaryState?.loading && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={downloadEntry}
                      title="Download as Markdown"
                      className="shrink-0 rounded p-1.5 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={startEdit}
                      title="Edit"
                      className="shrink-0 rounded p-1.5 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1 font-sans text-xs text-pageMuted">
                AI Overview
                {summaryState?.cached === false && !summaryState?.loading && (
                  <span className="ml-2 rounded bg-verdigris/15 px-1.5 py-0.5 text-[10px] text-verdigris">just generated</span>
                )}
              </p>

              {/* Tags display */}
              {!editing && summaryState?.tags && summaryState.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {summaryState.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 rounded-full bg-verdigris/15 px-2 py-0.5 font-sans text-[11px] text-verdigris">
                      <Tag size={9} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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

            {/* Edit mode */}
            {editing && (
              <div className="max-w-2xl space-y-4">
                <textarea
                  value={editMd}
                  onChange={(e) => setEditMd(e.target.value)}
                  rows={20}
                  className="w-full rounded border border-pageBorder bg-page px-3 py-2 font-mono text-sm leading-relaxed text-pageText focus:border-pageAccent focus:outline-none"
                />

                {/* Tag editor */}
                <div>
                  <p className="mb-2 font-sans text-[10px] uppercase tracking-widest text-pageMuted">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {editTags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 rounded-full bg-verdigris/15 px-2 py-0.5 font-sans text-[11px] text-verdigris">
                        <Tag size={9} />
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 opacity-60 hover:opacity-100"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                        if (e.key === 'Backspace' && !tagInput && editTags.length > 0) {
                          setEditTags((prev) => prev.slice(0, -1));
                        }
                      }}
                      placeholder="Add tag…"
                      className="min-w-24 rounded border border-pageBorder bg-page px-2 py-0.5 font-sans text-[11px] text-pageText placeholder:text-pageMuted focus:border-pageAccent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded bg-pageAccent px-3 py-1.5 font-sans text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check size={13} />
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded border border-pageBorder px-3 py-1.5 font-sans text-sm text-pageMuted hover:text-pageText disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Read mode */}
            {!editing && !summaryState?.loading && !summaryState?.error && summaryState?.html && (
              <div
                className="markdown-body markdown-body-page max-w-2xl font-display text-base leading-relaxed text-pageText"
                dangerouslySetInnerHTML={{ __html: summaryState.html }}
                onClick={handleContentClick}
              />
            )}
          </>
        )}

        {/* Merriam-Webster entry */}
        {selected && isMerriamSelected && merriamResult && (
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
              <div className="flex items-baseline gap-3">
                <h1 className="font-display text-2xl font-normal text-pageText">{merriamResult.headword}</h1>
                {merriamResult.pronunciation && (
                  <span className="flex items-center gap-1.5">
                    <span className="font-sans text-sm text-pageMuted">/{merriamResult.pronunciation}/</span>
                    {merriamResult.audioUrl && (
                      <button
                        onClick={() => new Audio(merriamResult.audioUrl).play()}
                        title="Listen to pronunciation"
                        className="text-pageMuted hover:text-pageAccent"
                      >
                        <Volume2 size={14} />
                      </button>
                    )}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5 opacity-60">
                <MerriamLogo height={14} />
                <span className="font-sans text-xs text-pageMuted">Collegiate Dictionary</span>
              </div>
            </div>

            <div className="max-w-2xl space-y-4">
              {merriamResult.groups.map((group, gi) => (
                <div key={gi}>
                  <p className="mb-1.5 font-sans text-xs font-semibold uppercase tracking-widest text-pageAccent/80">
                    {group.fl}
                  </p>
                  <ol className="space-y-1 pl-1">
                    {group.defs.map((def, di) => (
                      <li key={di} className="flex gap-2 font-display text-base leading-relaxed text-pageText">
                        <span className="mt-0.5 shrink-0 font-sans text-xs text-pageMuted">{di + 1}.</span>
                        <span>{def}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}

              {merriamResult.art && (
                <div className="border-t border-pageBorder pt-4">
                  <p className="mb-2 font-sans text-[10px] uppercase tracking-widest text-pageMuted">
                    Illustration of {merriamResult.headword}
                  </p>
                  <a href={merriamResult.art.pageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={merriamResult.art.imageUrl}
                      alt={`Illustration of ${merriamResult.headword}`}
                      className="max-h-64 rounded border border-pageBorder object-contain"
                    />
                  </a>
                  {merriamResult.art.capt && (
                    <p
                      className="mt-1.5 font-sans text-xs leading-relaxed text-pageMuted"
                      dangerouslySetInnerHTML={{ __html: merriamResult.art.capt }}
                    />
                  )}
                </div>
              )}

              {merriamResult.etymology && (
                <div className="border-t border-pageBorder pt-4">
                  <p className="mb-1 font-sans text-[10px] uppercase tracking-widest text-pageMuted">Etymology</p>
                  <p
                    className="font-display text-sm leading-relaxed text-pageText/80"
                    dangerouslySetInnerHTML={{ __html: merriamResult.etymology }}
                  />
                </div>
              )}

              {merriamResult.firstUse && (
                <p className="font-sans text-xs text-pageMuted">
                  First known use: {merriamResult.firstUse}
                </p>
              )}

              {merriamResult.url && (
                <a
                  href={merriamResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-verdigris hover:text-brass"
                >
                  Full entry on Merriam-Webster
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </>
        )}

        {/* DICT entry */}
        {selected && !isWikiSelected && !isMerriamSelected && !isSummarySelected && (
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
        </div>{/* end scrollable article */}
        </div>{/* end content column */}
      </div>{/* end right content panel */}

      {footnotePopup && (
        <FootnotePopup
          text={footnotePopup.text}
          x={footnotePopup.x}
          y={footnotePopup.y}
          onClose={() => setFootnotePopup(null)}
        />
      )}

      {hoverCard && defaultBibleModule && (
        <VerseHoverCard
          refStr={hoverCard.ref}
          rect={hoverCard.rect}
          bibleModule={defaultBibleModule}
          onNavigate={onOpenInCell}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={scheduleHoverClose}
        />
      )}

    </div>
  );
}

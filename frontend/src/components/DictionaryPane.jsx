import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronDown, List, X } from 'lucide-react';
import { api } from '../api/client.js';
import SelectableNoteRegion from './SelectableNoteRegion.jsx';
import { injectTocLinks } from '../utils/dictHtml.js';
import FootnotePopup from './FootnotePopup.jsx';

// Maps base Greek letters (after NFD + diacritic stripping) to Latin equivalents.
const GREEK_LATIN = {
  'α':'a',  'β':'b',  'γ':'g',  'δ':'d',  'ε':'e',
  'ζ':'z',  'η':'e',  'θ':'th', 'ι':'i',  'κ':'k',
  'λ':'l',  'μ':'m',  'ν':'n',  'ξ':'x',  'ο':'o',
  'π':'p',  'ρ':'r',  'σ':'s',  'ς':'s',  'τ':'t',
  'υ':'y',  'φ':'ph', 'χ':'ch', 'ψ':'ps', 'ω':'o',
  'Α':'a',  'Β':'b',  'Γ':'g',  'Δ':'d',  'Ε':'e',
  'Ζ':'z',  'Η':'e',  'Θ':'th', 'Ι':'i',  'Κ':'k',
  'Λ':'l',  'Μ':'m',  'Ν':'n',  'Ξ':'x',  'Ο':'o',
  'Π':'p',  'Ρ':'r',  'Σ':'s',  'Τ':'t',  'Υ':'y',
  'Φ':'ph', 'Χ':'ch', 'Ψ':'ps', 'Ω':'o',
};

// Converts a Greek string to a Latin approximation for fuzzy search.
// Strips diacritics via NFD decomposition then maps base Greek codepoints.
function transliterateGreek(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split('').map((ch) => GREEK_LATIN[ch] ?? ch).join('');
}

function extractStrongsData(target) {
  let el = target;
  for (let depth = 0; el && depth < 4; depth++, el = el.parentElement) {
    if (el.dataset?.strong) return { key: el.dataset.strong, morph: el.dataset.morph || null, word: el.textContent?.trim() || null };
    if (el.classList?.contains('strongs')) {
      const text = el.textContent.trim();
      if (/^[GH]\d{1,5}$/.test(text)) return { key: text, morph: null, word: null };
    }
  }
  return null;
}

export default function DictionaryPane({ module, focusedReference, onVerseRefClick, onStrongsClick, onOpenInDictionary, initialKey, initialFilter, refreshNonce, isLoggedIn = false }) {
  const [mode, setMode] = useState('probing');
  const [refVerses, setRefVerses] = useState([]);
  const [keys, setKeys] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [entryHtml, setEntryHtml] = useState('');
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [error, setError] = useState(null);
  const [footnotePopup, setFootnotePopup] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [toc, setToc] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const filterInputRef = useRef(null);
  const contentRef = useRef(null);

  const bookmarkedSet = useMemo(() => new Set(bookmarks.map((b) => b.reference)), [bookmarks]);

  useEffect(() => {
    if (!isLoggedIn || !module) return;
    api.listBookmarks({ module }).then(setBookmarks).catch(() => {});
  }, [module, refreshNonce, isLoggedIn]);

  async function toggleBookmark() {
    if (!selectedKey) return;
    if (bookmarkedSet.has(selectedKey)) {
      const bm = bookmarks.find((b) => b.reference === selectedKey);
      if (!bm) return;
      setBookmarks((prev) => prev.filter((b) => b.id !== bm.id));
      api.deleteBookmark(bm.id).catch(() => {
        setBookmarks((prev) => [...prev, bm]);
      });
    } else {
      const optimistic = { id: `__opt_${Date.now()}`, reference: selectedKey, module };
      setBookmarks((prev) => [optimistic, ...prev]);
      api.createBookmark({ module, reference: selectedKey }).then((created) => {
        setBookmarks((prev) => prev.map((b) => (b.id === optimistic.id ? created : b)));
      }).catch(() => {
        setBookmarks((prev) => prev.filter((b) => b.id !== optimistic.id));
      });
    }
  }

  useEffect(() => {
    if (!module) return;
    let cancelled = false;
    setError(null);
    setMode('probing');

    if (!focusedReference || module.startsWith('builtin:')) {
      setMode('keys');
      return;
    }
    api
      .getPassage(module, focusedReference)
      .then((res) => {
        if (cancelled) return;
        if (res.verses?.length > 0) {
          setRefVerses(res.verses);
          setMode('reference');
        } else {
          setMode('keys');
        }
      })
      .catch(() => {
        if (!cancelled) setMode('keys');
      });
    return () => {
      cancelled = true;
    };
  }, [module, focusedReference, refreshNonce]);

  useEffect(() => {
    setSelectedKey(null);
    setEntryHtml('');
    setError(null);
    setFilter('');
    setToc([]);
    setTocOpen(false);
  }, [module]);

  useEffect(() => {
    if (mode !== 'keys' || !module) return;
    setLoadingKeys(true);
    api
      .listDictionaryKeys(module)
      .then(setKeys)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingKeys(false));
  }, [mode, module, refreshNonce]);

  useEffect(() => {
    if (initialKey) {
      setMode('keys');
      setSelectedKey(initialKey);
    }
  }, [initialKey]);

  useEffect(() => {
    if (initialFilter) {
      setMode('keys');
      setSelectedKey(null);
      setFilter(initialFilter);
      setShowDropdown(true);
    }
  }, [initialFilter]);

  useEffect(() => {
    if (!selectedKey || mode !== 'keys') return;
    let cancelled = false;
    setLoadingEntry(true);
    setError(null);
    setEntryHtml('');
    setToc([]);
    setTocOpen(false);
    api
      .getDictionaryEntry(module, selectedKey)
      .then((res) => {
        if (cancelled) return;
        const { html, toc: newToc } = injectTocLinks(res.html);
        setEntryHtml(html);
        setToc(newToc);
      })
      .catch(() => {
        if (cancelled) return;
        // Exact key not found — try a prefix match from the loaded keys list.
        // Handles cases like selectedKey="MEASURE" when the entry is
        // "MEASURE (NOUN AND VERB)" or "MEASURE, NOUN".
        const q = selectedKey.toLowerCase();
        const match = keys.find((k) => {
          const kl = k.toLowerCase();
          return kl === q || kl.startsWith(q + ' ') || kl.startsWith(q + ',') || kl.startsWith(q + '(');
        });
        if (match && match !== selectedKey) {
          cancelled = true; // keep loadingEntry=true; re-run with resolved key takes over
          setSelectedKey(match);
          return;
        }
        setError(`No entry found for "${selectedKey}"`);
      })
      .finally(() => { if (!cancelled) setLoadingEntry(false); });
    return () => { cancelled = true; };
  }, [module, selectedKey, mode]);

  const filteredKeys = useMemo(() => {
    if (!filter.trim()) return keys.slice(0, 500);
    const f = filter.toLowerCase();
    return keys.filter((k) => {
      if (k.toLowerCase().includes(f)) return true;
      // Also match Latin transliteration of Greek keys so typing e.g. "agalma"
      // finds the entry "ἄγαλμα".
      return transliterateGreek(k).toLowerCase().includes(f);
    }).slice(0, 500);
  }, [keys, filter]);

  function pickKey(k) {
    setSelectedKey(k);
    setShowDropdown(false);
    setFilter('');
  }

  function jumpToSection(id) {
    if (!contentRef.current) return;
    const target = contentRef.current.querySelector(`#${CSS.escape(id)}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTocOpen(false);
    }
  }

  function handleContentClick(e) {
    // Prevent any <a> from escaping to the browser's URL handler
    const linkEl = e.target.closest('a[href]');
    if (linkEl) {
      e.preventDefault();
      const href = linkEl.getAttribute('href') || '';
      if (href.startsWith('#')) {
        const targetId = href.slice(1);
        const target = contentRef.current?.querySelector(`#${CSS.escape(targetId)}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // Strong's via href
      const strongsM = href.match(/^(?:strongs?|lemma):([GH]\d{1,5})$/i)
        || (!href.includes(':') && !href.includes('/') && href.match(/^([GH]\d{1,5})$/i));
      if (strongsM) {
        onStrongsClick?.(strongsM[1].toUpperCase(), e, null, linkEl.textContent.trim(), module);
        return;
      }
      // Vine's / dict cross-ref via href
      const dictM = href.match(/^Vines?:\s*(.+)$/i);
      if (dictM) { setMode('keys'); pickKey(dictM[1].trim()); return; }
      // Anything else with a legible href that looks like a dict key
      if (href && !href.startsWith('http') && !href.startsWith('sword://')) {
        setMode('keys'); pickKey(href.trim()); return;
      }
      return;
    }

    const dictXrefEl = e.target.closest('.dict-xref');
    if (dictXrefEl) {
      onOpenInDictionary?.(dictXrefEl.dataset.strongKey);
      return;
    }

    // Dict entry cross-reference span (produced by backend processDictHyperlinks)
    const entryRefEl = e.target.closest('.dict-entry-ref');
    if (entryRefEl) {
      const key = entryRefEl.dataset.key;
      if (key) { setMode('keys'); pickKey(key); }
      return;
    }

    const footnoteEl = e.target.closest('.footnote-marker');
    if (footnoteEl) {
      setFootnotePopup({ text: footnoteEl.dataset.note, x: e.clientX, y: e.clientY });
      return;
    }
    const xrefEl = e.target.closest('.xref-marker');
    if (xrefEl) {
      onVerseRefClick?.(xrefEl.dataset.refs, e);
      return;
    }
    const verseRefEl = e.target.closest('.verse-ref');
    if (verseRefEl) {
      onVerseRefClick?.(verseRefEl.dataset.ref, e);
      return;
    }
    if (!onStrongsClick) return;
    const result = extractStrongsData(e.target);
    if (result) onStrongsClick(result.key, e, result.morph, result.word, module);
  }

  if (mode === 'probing') {
    return <div className="flex h-full items-center justify-center bg-page text-pageMuted">Loading…</div>;
  }

  if (mode === 'reference') {
    return (
      <div className="h-full overflow-y-auto bg-page px-6 py-6 text-pageText">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <SelectableNoteRegion
          module={module}
          className="markdown-body markdown-body-page max-w-2xl font-display text-base leading-relaxed text-pageText"
          onClick={handleContentClick}
        >
          {refVerses.map((v) => (
            <div key={`${v.chapter}-${v.verseNr}`} className="mb-2">
              <sup className="mr-1 text-xs text-pageAccent">{v.verseNr}</sup>
              <div className="inline" dangerouslySetInnerHTML={{ __html: v.content }} />
            </div>
          ))}
        </SelectableNoteRegion>

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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Compact entry picker header */}
      <div className="relative shrink-0 border-b border-rule bg-ink px-3 py-2">
        <div
          className="flex cursor-text items-center gap-2 rounded border border-rule bg-page/30 px-3 py-1.5"
          onClick={() => { setShowDropdown(true); filterInputRef.current?.focus(); }}
        >
          <input
            name="entry-search"
            ref={filterInputRef}
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder={selectedKey || 'Search entries…'}
            className="min-w-0 flex-1 bg-transparent text-sm text-parchment placeholder:text-muted focus:outline-none"
          />
          {selectedKey && !showDropdown && (
            <span className="shrink-0 text-xs text-muted">{selectedKey}</span>
          )}
          <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </div>

        {showDropdown && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => { setShowDropdown(false); setFilter(''); }} />
            {/* Dropdown list */}
            <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded border border-rule bg-ink shadow-lg">
              {!filter.trim() && bookmarks.length > 0 && (
                <div className="border-b border-rule/30 pb-1 mb-1">
                  <p className="px-3 py-1 text-xs text-muted">Bookmarks</p>
                  {bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onMouseDown={(e) => { e.preventDefault(); pickKey(bm.reference); }}
                      className={`flex w-full items-center gap-2 truncate px-3 py-1.5 text-left text-sm ${
                        selectedKey === bm.reference ? 'bg-verdigris/20 text-brass' : 'text-parchment/90 hover:bg-panel'
                      }`}
                    >
                      <Bookmark size={12} className="shrink-0 fill-brass text-brass" />
                      {bm.reference}
                    </button>
                  ))}
                </div>
              )}
              {loadingKeys && <p className="px-3 py-2 text-xs text-muted">Loading…</p>}
              {!loadingKeys && filteredKeys.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted">No matches.</p>
              )}
              {filteredKeys.map((k) => (
                <button
                  key={k}
                  onMouseDown={(e) => { e.preventDefault(); pickKey(k); }}
                  className={`block w-full truncate px-3 py-1.5 text-left text-sm ${
                    selectedKey === k ? 'bg-verdigris/20 text-brass' : 'text-parchment/90 hover:bg-panel'
                  }`}
                >
                  {k}
                </button>
              ))}
              {!loadingKeys && keys.length > 500 && filter.trim() === '' && (
                <p className="px-3 py-2 text-xs text-muted">Showing first 500 — type to filter.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Entry content — relative flex wrapper for TOC sidebar */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-page text-pageText">

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

        {/* Desktop: static toggle tab — flex sibling, never animates position */}
        {toc.length > 0 && (
          <button
            onClick={() => setTocOpen((o) => !o)}
            title={tocOpen ? 'Close contents' : 'Open contents'}
            className="mt-16 hidden h-8 w-5 shrink-0 items-center justify-center self-start rounded-r border border-l-0 border-pageBorder bg-page text-pageMuted shadow-sm hover:text-pageAccent lg:flex"
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
            className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded border border-pageBorder bg-page text-pageMuted shadow-sm hover:text-pageAccent lg:hidden"
          >
            <List size={11} />
          </button>
        )}

        {/* Scrollable entry */}
        <div ref={contentRef} className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!selectedKey && <p className="text-pageMuted">Search or browse entries above.</p>}
          {loadingEntry && <p className="text-pageMuted">Loading…</p>}
          {selectedKey && !loadingEntry && (
            <SelectableNoteRegion
              module={module}
              className="markdown-body markdown-body-page max-w-2xl font-display text-base leading-relaxed text-pageText"
              onClick={handleContentClick}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-sans text-xs uppercase tracking-wide text-verdigris">{selectedKey}</h2>
                {isLoggedIn && (
                  <button
                    onClick={toggleBookmark}
                    className="ml-2 shrink-0 rounded p-0.5"
                    title={bookmarkedSet.has(selectedKey) ? 'Remove bookmark' : 'Bookmark this entry'}
                  >
                    <Bookmark
                      size={14}
                      strokeWidth={2}
                      className={bookmarkedSet.has(selectedKey) ? 'fill-brass text-brass' : 'text-muted hover:text-brass'}
                    />
                  </button>
                )}
              </div>
              <div dangerouslySetInnerHTML={{ __html: entryHtml }} />
            </SelectableNoteRegion>
          )}
        </div>
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
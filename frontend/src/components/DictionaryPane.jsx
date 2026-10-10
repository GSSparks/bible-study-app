import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from '../api/client.js';
import SelectableNoteRegion from './SelectableNoteRegion.jsx';
import FootnotePopup from './FootnotePopup.jsx';

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

export default function DictionaryPane({ module, focusedReference, onVerseRefClick, onStrongsClick, onOpenInDictionary, initialKey, initialFilter, refreshNonce }) {
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
  const filterInputRef = useRef(null);

  useEffect(() => {
    if (!module) return;
    let cancelled = false;
    setError(null);
    setMode('probing');

    if (!focusedReference) {
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
    setLoadingEntry(true);
    setError(null);
    setEntryHtml('');
    api
      .getDictionaryEntry(module, selectedKey)
      .then((res) => setEntryHtml(res.html))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingEntry(false));
  }, [module, selectedKey, mode]);

  const filteredKeys = useMemo(() => {
    if (!filter.trim()) return keys.slice(0, 500);
    const f = filter.toLowerCase();
    return keys.filter((k) => k.toLowerCase().includes(f)).slice(0, 500);
  }, [keys, filter]);

  function pickKey(k) {
    setSelectedKey(k);
    setShowDropdown(false);
    setFilter('');
  }

  function handleContentClick(e) {
    // Prevent any <a> from escaping to the browser's URL handler
    const linkEl = e.target.closest('a[href]');
    if (linkEl) {
      e.preventDefault();
      const href = linkEl.getAttribute('href') || '';
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
      if (href && !href.startsWith('http') && !href.startsWith('sword://') && !href.startsWith('#')) {
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

      {/* Entry content */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-page px-6 py-6 text-pageText">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!selectedKey && <p className="text-pageMuted">Search or browse entries above.</p>}
        {loadingEntry && <p className="text-pageMuted">Loading…</p>}
        {selectedKey && !loadingEntry && (
          <SelectableNoteRegion
            module={module}
            className="markdown-body markdown-body-page max-w-2xl font-display text-base leading-relaxed text-pageText"
            onClick={handleContentClick}
          >
            <h2 className="mb-3 font-sans text-xs uppercase tracking-wide text-verdigris">{selectedKey}</h2>
            <div dangerouslySetInnerHTML={{ __html: entryHtml }} />
          </SelectableNoteRegion>
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
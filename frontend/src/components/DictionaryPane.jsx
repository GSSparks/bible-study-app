import { useEffect, useMemo, useState } from 'react';
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

export default function DictionaryPane({ module, focusedReference, onVerseRefClick, onStrongsClick, onOpenInDictionary, initialKey, initialFilter }) {
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
  }, [module, focusedReference]);

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
  }, [mode, module]);

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

  function handleContentClick(e) {
    const dictXrefEl = e.target.closest('.dict-xref');
    if (dictXrefEl) {
      onOpenInDictionary?.(dictXrefEl.dataset.strongKey);
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
          className="max-w-2xl font-display text-base leading-relaxed text-pageText"
          onClick={handleContentClick}
        >
          {refVerses.map((v) => (
            <p key={`${v.chapter}-${v.verseNr}`} className="mb-2">
              <sup className="mr-1 text-xs text-pageAccent">{v.verseNr}</sup>
              <span dangerouslySetInnerHTML={{ __html: v.content }} />
            </p>
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
    <div className="flex h-full overflow-hidden">
      <div className="flex w-56 flex-col border-r border-rule">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter entries…"
          className="border-b border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:outline-none"
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingKeys && <p className="p-3 text-sm text-muted">Loading entries…</p>}
          {filteredKeys.map((k) => (
            <button
              key={k}
              onClick={() => setSelectedKey(k)}
              className={`block w-full truncate px-3 py-1.5 text-left text-sm ${
                selectedKey === k ? 'bg-verdigris/20 text-brass' : 'text-parchment/90 hover:bg-panel'
              }`}
            >
              {k}
            </button>
          ))}
          {!loadingKeys && keys.length > 500 && filter.trim() === '' && (
            <p className="p-3 text-xs text-muted">Showing first 500 — type to filter the rest.</p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-page px-6 py-6 text-pageText">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!selectedKey && <p className="text-pageMuted">Pick an entry on the left.</p>}
        {loadingEntry && <p className="text-pageMuted">Loading…</p>}
        {selectedKey && !loadingEntry && (
          <SelectableNoteRegion
            module={module}
            className="max-w-2xl font-display text-base leading-relaxed text-pageText"
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
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import SelectableNoteRegion from './SelectableNoteRegion.jsx';
import FootnotePopup from './FootnotePopup.jsx';

/** Browses a dictionary/lexicon (or general help book) module: a
 * filterable list of its keys on the left, the raw entry text on the
 * right. Used for modules that aren't verse-keyed (Strong's dictionaries,
 * encyclopedias, topical works), as opposed to commentaries which reuse
 * ReaderPane since they're keyed the same way Bible text is. */
export default function DictionaryPane({ module, onVerseRefClick }) {
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
    setLoadingKeys(true);
    setError(null);
    api
      .listDictionaryKeys(module)
      .then(setKeys)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingKeys(false));
  }, [module]);

  useEffect(() => {
    if (!selectedKey) return;
    setLoadingEntry(true);
    api
      .getDictionaryEntry(module, selectedKey)
      .then((res) => setEntryHtml(res.html))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingEntry(false));
  }, [module, selectedKey]);

  const filteredKeys = useMemo(() => {
    if (!filter.trim()) return keys.slice(0, 500); // avoid rendering thousands of rows unfiltered
    const f = filter.toLowerCase();
    return keys.filter((k) => k.toLowerCase().includes(f)).slice(0, 500);
  }, [keys, filter]);

  function handleEntryClick(e) {
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
    if (verseRefEl) onVerseRefClick?.(verseRefEl.dataset.ref, e);
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

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!selectedKey && <p className="text-muted">Pick an entry on the left.</p>}
        {loadingEntry && <p className="text-muted">Loading…</p>}
        {selectedKey && !loadingEntry && (
          <SelectableNoteRegion
            module={module}
            className="max-w-2xl font-display text-base leading-relaxed text-parchment/90"
            onClick={handleEntryClick}
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

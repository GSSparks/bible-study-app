import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

/** `osisRef` is usually a single OSIS key but can be a comma-separated
 * list — a collapsed cross-reference marker carries every reference from
 * its note this way (mirrors StrongsPopup's handling of a word mapped to
 * more than one Strong's number). Each ref gets its own fetch, preview,
 * and "open in tab" button, stacked. OSIS form is accepted directly by
 * the passage endpoint — no need to convert to a "human" string first. */
export default function VersePopup({ osisRef, module, x, y, onClose, onOpenInTab }) {
  const refs = osisRef.split(',').map((r) => r.trim()).filter(Boolean);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!module) {
      setError('No default Bible set — pick one under Manage modules.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all(refs.map((r) => api.getPassage(module, r).then((res) => ({ ref: r, verses: res.verses || [] }))))
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, osisRef]);

  const style = {
    left: Math.min(x, window.innerWidth - 360),
    top: Math.min(y, window.innerHeight - 260),
  };

  return (
    <div className="fixed z-30 w-96 max-h-[70vh] overflow-y-auto rounded-lg border border-rule bg-panel p-4 shadow-2xl" style={style}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-verdigris">{refs.join(' + ')}</span>
        <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
          close
        </button>
      </div>

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {entries?.map(({ ref, verses }, i) => (
        <div key={ref} className={i > 0 ? 'mt-3 border-t border-rule pt-3' : ''}>
          {entries.length > 1 && <p className="mb-1 font-mono text-xs text-muted">{ref}</p>}
          <p className="mb-2 font-display text-sm leading-relaxed text-parchment/90">
            {verses.map((v) => (
              <span key={`${v.chapter}-${v.verseNr}`}>
                <sup className="mr-1 text-xs text-brass">{v.verseNr}</sup>
                {v.content.replace(/<[^>]*>/g, '')}{' '}
              </span>
            ))}
          </p>
          <button
            onClick={() => onOpenInTab(module, ref)}
            className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass"
          >
            Open in tab
          </button>
        </div>
      ))}
    </div>
  );
}

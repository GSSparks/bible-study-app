import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client.js';

/** Bottom-docked drawer showing Bible verse text, identical in structure
 * to StrongsDrawer. Clicking a cross-reference or verse-ref inside the
 * rendered content navigates the drawer itself (back button appears),
 * exactly the way StrongsDrawer handles dict-xref clicks. */
export default function VerseDrawer({ osisRef, module, onClose, onOpenInTab }) {
  // Internal history lets cross-reference clicks navigate within the drawer
  // without closing it — same pattern as StrongsDrawer's key history.
  const [history, setHistory] = useState([osisRef]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentRef = history[historyIndex];
  const refs = currentRef.split(',').map((r) => r.trim()).filter(Boolean);

  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the external prop changes (new click), reset history
  useEffect(() => {
    setHistory([osisRef]);
    setHistoryIndex(0);
  }, [osisRef]);

  useEffect(() => {
    if (!module) {
      setError('No default Bible set — pick one under Manage modules.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setEntries(null);
    Promise.all(
      refs.map((r) => api.getPassage(module, r).then((res) => ({ ref: r, verses: res.verses || [] })))
    )
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, currentRef]);

  function pushRef(ref) {
    const truncated = history.slice(0, historyIndex + 1);
    setHistory([...truncated, ref]);
    setHistoryIndex(truncated.length);
  }

  function goBack() {
    if (historyIndex <= 0) return;
    setHistoryIndex(historyIndex - 1);
  }

  function handleContentClick(e) {
    // Cross-reference marker (xref-marker carries data-refs as comma list)
    const xref = e.target.closest('.xref-marker[data-refs]');
    if (xref) { pushRef(xref.dataset.refs); return; }
    // Inline verse reference (verse-ref carries data-ref)
    const vref = e.target.closest('.verse-ref[data-ref]');
    if (vref) { pushRef(vref.dataset.ref); return; }
  }

  return (
    <div className="shrink-0 border-t border-pageBorder bg-page">
      {/* Drawer header */}
      <div className="flex items-center gap-2 border-b border-pageBorder/50 px-4 py-1.5">
        {historyIndex > 0 && (
          <button
            onClick={goBack}
            title="Back"
            className="shrink-0 rounded border border-pageBorder px-1.5 py-0.5 font-mono text-xs text-pageMuted hover:border-brass hover:text-pageText"
          >
            ‹
          </button>
        )}
        <span className="font-mono text-xs uppercase tracking-wide text-verdigris">
          {refs.join(' · ')}
        </span>
        <button
          onClick={onClose}
          className="ml-auto rounded p-0.5 text-pageMuted/60 hover:text-pageText"
        >
          <X size={13} />
        </button>
      </div>

      {/* Drawer body */}
      <div className="max-h-48 overflow-y-auto px-4 py-3">
        {loading && <p className="text-sm text-pageMuted">Loading…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {entries?.map(({ ref, verses }, i) => (
          <div key={ref} className={i > 0 ? 'mt-3 border-t border-pageBorder pt-3' : ''}>
            {entries.length > 1 && (
              <p className="mb-1 font-mono text-xs text-pageMuted">{ref}</p>
            )}
            <p
              className="verse-content mb-2 font-display text-sm leading-relaxed text-pageText"
              onClick={handleContentClick}
            >
              {verses.map((v) => (
                <span key={`${v.chapter}-${v.verseNr}`}>
                  <sup className="mr-0.5 text-[10px] text-pageMuted">{v.verseNr}</sup>
                  <span dangerouslySetInnerHTML={{ __html: v.content }} />{' '}
                </span>
              ))}
            </p>
            {onOpenInTab && (
              <button
                onClick={() => onOpenInTab(module, ref)}
                className="text-xs text-verdigris hover:text-brass"
              >
                Open in tab →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

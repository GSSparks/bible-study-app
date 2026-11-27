import { useEffect, useState } from 'react';
import { X, ChevronLeft, ArrowUpRight } from 'lucide-react';
import { api } from '../api/client.js';

function osisToRef(str) {
  const start = str.split('-')[0];
  if (!start.includes('.')) return start;
  const parts = start.split('.');
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  return `${parts[0]} ${parts[1]}:${parts[2]}`;
}

/** Bottom-docked drawer showing Bible verse text, identical in structure
 * to StrongsDrawer. Clicking a cross-reference or verse-ref inside the
 * rendered content navigates the drawer itself (back button appears),
 * exactly the way StrongsDrawer handles dict-xref clicks. */
export default function VerseDrawer({ osisRef, module, onClose, onOpenInTab }) {
  const [history, setHistory] = useState([osisRef]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentRef = history[historyIndex];
  const refs = currentRef.split(',').map((r) => r.trim()).filter(Boolean);

  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
    const xref = e.target.closest('.xref-marker[data-refs]');
    if (xref) { pushRef(xref.dataset.refs); return; }
    const vref = e.target.closest('.verse-ref[data-ref]');
    if (vref) { pushRef(vref.dataset.ref); return; }
  }

  return (
    <div className="shrink-0 border-t-2 border-verdigris/30 bg-ink">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-rule/40 px-4 py-2">
        {historyIndex > 0 && (
          <button
            onClick={goBack}
            title="Back"
            className="shrink-0 rounded p-0.5 text-muted hover:text-parchment"
          >
            <ChevronLeft size={14} />
          </button>
        )}
        <span className="font-mono text-xs font-semibold tracking-wider text-verdigris">
          {refs.join(' · ')}
        </span>
        <button
          onClick={onClose}
          className="ml-auto rounded p-1 text-muted/50 transition-colors hover:text-parchment"
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-48 overflow-y-auto px-4 py-3">
        {loading && <p className="text-xs text-muted">Loading…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}

        {entries?.map(({ ref, verses }, i) => {
          const VERSE_CAP = 2;
          const truncated = verses.length > VERSE_CAP;
          const displayed = truncated ? verses.slice(0, VERSE_CAP) : verses;
          return (
            <div key={ref} className={i > 0 ? 'mt-3 border-t border-rule/30 pt-3' : ''}>
              {entries.length > 1 && (
                <p className="mb-1 font-mono text-xs text-muted">{ref}</p>
              )}
              <p
                className="verse-content mb-2 break-words text-sm leading-relaxed text-parchment/80"
                onClick={handleContentClick}
              >
                {displayed.map((v) => (
                  <span key={`${v.chapter}-${v.verseNr}`}>
                    <sup className="mr-0.5 text-micro text-muted">{v.verseNr}</sup>
                    <span dangerouslySetInnerHTML={{ __html: v.content }} />{' '}
                  </span>
                ))}
                {truncated && <span className="text-muted">…</span>}
              </p>
              {onOpenInTab && (
                <button
                  onClick={() => onOpenInTab(module, osisToRef(ref))}
                  className="flex items-center gap-1 text-xs text-verdigris transition-colors hover:text-brass"
                >
                  <ArrowUpRight size={11} />
                  {truncated
                    ? `See all ${verses.length} verses in tab`
                    : 'Open in tab'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

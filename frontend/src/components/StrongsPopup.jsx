import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

/** Floating popup showing one or more Strong's entries. `strongsKey` is
 * usually a single key ("G26") but can be a comma-separated list — OSIS
 * allows a single word to map to more than one Strong's number (e.g. a
 * contraction), so every entry gets fetched and shown, not just the
 * first. Clicking a "see also" reference re-fetches in place, so you can
 * chase related words without closing. */
export default function StrongsPopup({ strongsKey, x, y, onClose, onNavigateKey }) {
  const keys = strongsKey.split(',').map((k) => k.trim()).filter(Boolean);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all(keys.map((k) => api.getStrongsEntry(k).then((entry) => ({ key: k, entry }))))
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strongsKey]);

  // Keep the popup on-screen near the click point without needing a
  // measurement pass — clamp roughly to viewport bounds.
  const style = {
    left: Math.min(x, window.innerWidth - 340),
    top: Math.min(y, window.innerHeight - 260),
  };

  return (
    <div className="fixed z-30 w-80 max-h-[70vh] overflow-y-auto rounded-lg border border-rule bg-panel p-4 shadow-2xl" style={style}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-verdigris">{keys.join(' + ')}</span>
        <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
          close
        </button>
      </div>

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {entries?.map(({ key, entry }, i) => (
        <div key={key} className={i > 0 ? 'mt-3 border-t border-rule pt-3' : ''}>
          {entries.length > 1 && <p className="mb-1 font-mono text-xs text-muted">{key}</p>}
          <div className="space-y-2 text-sm">
            {(entry.transcription || entry.phoneticTranscription) && (
              <p className="font-display text-base text-parchment">
                {entry.transcription}
                {entry.phoneticTranscription && (
                  <span className="ml-2 text-xs text-muted">{entry.phoneticTranscription}</span>
                )}
              </p>
            )}
            {entry.definition && <p className="text-parchment/90">{entry.definition}</p>}
            {entry.references?.length > 0 && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted">See also</p>
                <div className="flex flex-wrap gap-1">
                  {entry.references.map((ref) => (
                    <button
                      key={ref.key}
                      onClick={() => onNavigateKey(ref.key)}
                      className="rounded border border-rule px-2 py-0.5 font-mono text-xs text-parchment/90 hover:border-brass hover:text-brass"
                    >
                      {ref.key}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

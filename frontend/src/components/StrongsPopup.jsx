import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { decodeRobinsonMorph } from '../utils/robinsonMorphology.js';

/** `module` is the Bible translation that was actually open when the
 * word was clicked — needed for "word study across the whole Bible",
 * since occurrences have to be scanned in the same translation whose
 * Strong's tagging produced this popup in the first place (a different
 * translation's tagging of the same underlying Greek/Hebrew word could,
 * in principle, differ). */
export default function StrongsPopup({
  strongsKey,
  morph,
  wordText,
  module,
  x,
  y,
  onClose,
  onNavigateKey,
  onOpenInDictionary,
  onSearchTopical,
  onWordStudy,
}) {
  const keys = strongsKey.split(',').map((k) => k.trim()).filter(Boolean);
  const morphCodes = morph ? morph.split(/\s+/).map((m) => m.replace(/^[a-z]+:/i, '')) : [];
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

  const style = {
    left: Math.min(x, window.innerWidth - 340),
    top: Math.min(y, window.innerHeight - 260),
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="fixed z-30 w-80 max-h-[70vh] overflow-y-auto rounded-lg border border-rule bg-panel p-4 shadow-2xl" style={style}>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-verdigris">{keys.join(' + ')}</span>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>

        {onSearchTopical && wordText && (
          <button
            onClick={() => onSearchTopical(wordText)}
            className="mb-1 block text-xs text-verdigris hover:text-brass"
          >
            Search Nave's Topical Bible for "{wordText}" →
          </button>
        )}

        {loading && <p className="text-sm text-muted">Loading…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {entries?.map(({ key, entry }, i) => {
          const morphCode = morphCodes[i];
          const morphGloss = morphCode ? decodeRobinsonMorph(morphCode) : null;
          return (
            <div key={key} className={i > 0 ? 'mt-3 border-t border-rule pt-3' : ''}>
              {entries.length > 1 && <p className="mb-1 font-mono text-xs text-muted">{key}</p>}
              <div className="space-y-2 text-sm">
                {morphCode && (
                  <p className="font-mono text-xs text-muted">
                    {morphCode}
                    {morphGloss && <span className="ml-2 font-sans italic text-parchment/70">({morphGloss})</span>}
                  </p>
                )}
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
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {onOpenInDictionary && (
                    <button
                      onClick={() => onOpenInDictionary(key)}
                      className="text-xs text-verdigris hover:text-brass"
                    >
                      Open in dictionary →
                    </button>
                  )}
                  {onWordStudy && module && (
                    <button
                      onClick={() => onWordStudy(key, module)}
                      className="text-xs text-verdigris hover:text-brass"
                      title="Find every occurrence of this word across the whole Bible and have the assistant summarize usage patterns"
                    >
                      Word study across the whole Bible →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>,
    document.body
  );
}
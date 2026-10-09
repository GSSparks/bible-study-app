import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client.js';
import { decodeRobinsonMorph } from '../utils/robinsonMorphology.js';

export default function StrongsDrawer({
  strongsKey,
  morph,
  wordText,
  module,
  onClose,
  onNavigateKey,
  onOpenInDictionary,
  onSearchTopical,
  onWordStudy,
}) {
  const [history, setHistory] = useState([{ key: strongsKey, morph, wordText }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const current = history[historyIndex];
  const keys = current.key.split(',').map((k) => k.trim()).filter(Boolean);
  const morphCodes = current.morph ? current.morph.split(/\s+/).map((m) => m.replace(/^[a-z]+:/i, '')) : [];
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reset history when the external key changes (new word clicked in reader)
  useEffect(() => {
    setHistory([{ key: strongsKey, morph, wordText }]);
    setHistoryIndex(0);
  }, [strongsKey]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all(keys.map((k) => api.getStrongsEntry(k).then((entry) => ({ key: k, entry }))))
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.key]);

  function navigateToKey(key) {
    const truncated = history.slice(0, historyIndex + 1);
    setHistory([...truncated, { key, morph: undefined, wordText: undefined }]);
    setHistoryIndex(truncated.length);
    onNavigateKey?.(key);
  }

  return (
    <div className="shrink-0 border-t border-pageBorder bg-page">
      {/* Drawer header */}
      <div className="flex items-center gap-2 border-b border-pageBorder/50 px-4 py-1.5">
        {historyIndex > 0 && (
          <button
            onClick={() => {
              const i = historyIndex - 1;
              setHistoryIndex(i);
              onNavigateKey?.(history[i].key);
            }}
            title="Back"
            className="shrink-0 rounded border border-pageBorder px-1.5 py-0.5 font-mono text-xs text-pageMuted hover:border-brass hover:text-pageText"
          >
            ‹
          </button>
        )}
        <span className="font-mono text-xs uppercase tracking-wide text-verdigris">{keys.join(' + ')}</span>
        {current.wordText && <span className="text-xs text-pageMuted">— {current.wordText}</span>}
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

        {entries?.map(({ key, entry }, i) => {
          const morphCode = morphCodes[i];
          const morphGloss = morphCode ? decodeRobinsonMorph(morphCode) : null;
          return (
            <div key={key} className={i > 0 ? 'mt-3 border-t border-pageBorder pt-3' : ''}>
              {entries.length > 1 && (
                <p className="mb-1 font-mono text-xs text-pageMuted">{key}</p>
              )}
              <div className="space-y-1.5 text-sm">
                {morphCode && (
                  <p className="font-mono text-xs text-pageMuted">
                    {morphCode}
                    {morphGloss && (
                      <span className="ml-2 font-sans italic text-pageMuted">({morphGloss})</span>
                    )}
                  </p>
                )}
                {(entry.transcription || entry.phoneticTranscription) && (
                  <p className="font-display text-base text-pageText">
                    {entry.transcription}
                    {entry.phoneticTranscription && (
                      <span className="ml-2 text-xs text-pageMuted">{entry.phoneticTranscription}</span>
                    )}
                  </p>
                )}
                {entry.definition && (
                  <p className="text-pageText">{entry.definition}</p>
                )}
                {entry.references?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-pageMuted">See also</p>
                    <div className="flex flex-wrap gap-1">
                      {entry.references.map((ref) => (
                        <button
                          key={ref.key}
                          onClick={() => navigateToKey(ref.key)}
                          className="rounded border border-pageBorder px-2 py-0.5 font-mono text-xs text-pageText hover:border-brass hover:text-brass"
                        >
                          {ref.key}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                  {onSearchTopical && wordText && (
                    <button
                      onClick={() => onSearchTopical(wordText)}
                      className="text-xs text-verdigris hover:text-brass"
                    >
                      Search Nave's for "{wordText}" →
                    </button>
                  )}
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
                      title="Find every occurrence of this word across the whole Bible"
                    >
                      Word study →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

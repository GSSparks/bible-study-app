import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function CrossRefPane({ reference, module, onVerseRefClick }) {
  const [items, setItems] = useState([]); // [{ verseLabel, refs: string[] }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!module || !reference) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getPassage(module, reference)
      .then((res) => {
        if (cancelled) return;
        const verses = res.verses || [];
        const parsed = verses.map((v) => {
          const refs = [];
          // Extract data-refs from xref-marker elements via regex
          const re = /data-refs="([^"]+)"/g;
          let m;
          while ((m = re.exec(v.content)) !== null) {
            m[1]
              .split(',')
              .map((r) => r.trim())
              .filter(Boolean)
              .forEach((r) => refs.push(r));
          }
          return {
            verseLabel: `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`,
            refs: [...new Set(refs)],
          };
        });
        setItems(parsed.filter((p) => p.refs.length > 0));
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [module, reference]);

  if (!module) {
    return (
      <div className="flex h-full items-center justify-center bg-page px-6 text-center text-sm text-pageMuted">
        No Bible module selected.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-page px-4 py-4">
      {loading && <p className="text-sm text-pageMuted">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-pageMuted">No cross-references found for this passage.</p>
      )}

      {items.map((item) => (
        <div key={item.verseLabel} className="mb-4">
          <p className="mb-1 font-mono text-xs text-pageMuted">{item.verseLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {item.refs.map((ref) => (
              <button
                key={ref}
                onClick={() => onVerseRefClick?.(ref)}
                className="rounded border border-pageBorder px-2 py-0.5 text-xs text-verdigris hover:border-brass hover:text-brass"
              >
                {ref}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

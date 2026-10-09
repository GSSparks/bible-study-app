import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

export default function ParallelBiblePane({ reference, onNavigate }) {
  const [modules, setModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState(['', '']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listInstalledModules('BIBLE').then((mods) => {
      setModules(mods);
      if (mods.length > 0) {
        setSelectedModules((prev) => {
          const a = prev[0] || mods[0]?.name || '';
          const b = prev[1] || mods[1]?.name || mods[0]?.name || '';
          return [a, b];
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const active = selectedModules.filter(Boolean);
    if (active.length === 0 || !reference) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .comparePassage(active, reference)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedModules, reference]);

  function setModule(index, value) {
    setSelectedModules((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addSlot() {
    if (selectedModules.length >= 4) return;
    setSelectedModules((prev) => [...prev, '']);
  }

  function removeSlot(index) {
    setSelectedModules((prev) => prev.filter((_, i) => i !== index));
  }

  const activeModules = selectedModules.filter(Boolean);
  const colCount = Math.max(activeModules.length, 1);

  // data shape from comparePassage: { reference, passages: { [module]: verse[] } }
  const moduleData = data?.passages || {};

  const allVerseKeys = [...new Set(
    activeModules.flatMap((mod) =>
      (moduleData[mod] || []).map((v) => `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`)
    )
  )];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      {/* Module selector bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-pageBorder bg-page px-3 py-2">
        {selectedModules.map((mod, i) => (
          <div key={i} className="flex items-center gap-1">
            <select
              value={mod}
              onChange={(e) => setModule(i, e.target.value)}
              className="rounded border border-pageBorder bg-page px-2 py-1 font-mono text-xs text-pageText"
            >
              <option value="">— pick —</option>
              {modules.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.description || m.name}
                </option>
              ))}
            </select>
            {i > 0 && (
              <button
                onClick={() => removeSlot(i)}
                className="text-xs text-pageMuted hover:text-red-500"
                title="Remove this translation"
              >
                −
              </button>
            )}
          </div>
        ))}
        {selectedModules.length < 4 && (
          <button
            onClick={addSlot}
            className="rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-brass hover:text-pageText"
            title="Add another translation"
          >
            + Add
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="flex h-full items-center justify-center text-sm text-pageMuted">
            Loading…
          </div>
        )}
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}

        {!loading && !error && activeModules.length > 0 && (
          <div
            className="grid h-full"
            style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
          >
            {activeModules.map((mod) => (
              <div key={mod} className="flex flex-col border-r border-pageBorder last:border-r-0">
                <div className="sticky top-0 border-b border-pageBorder bg-page px-2 py-1 text-center font-mono text-xs text-pageMuted">
                  {modules.find((m) => m.name === mod)?.description || mod}
                </div>
                <div className="flex-1 px-3 py-3">
                  {(moduleData[mod] || []).map((v) => (
                    <p
                      key={`${v.chapter}-${v.verseNr}`}
                      className="mb-2 font-display text-sm leading-relaxed text-pageText"
                    >
                      <sup
                        className="mr-1 cursor-pointer text-[10px] text-pageAccent hover:text-brass"
                        onClick={() => onNavigate?.(`${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`)}
                      >
                        {v.verseNr}
                      </sup>
                      {stripHtml(v.content)}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && activeModules.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-pageMuted">
            Select at least one translation above.
          </div>
        )}
      </div>
    </div>
  );
}

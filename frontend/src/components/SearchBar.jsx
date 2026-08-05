import { useState } from 'react';
import { api } from '../api/client.js';

export default function SearchBar({ activeModule, onJump }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);

  async function runSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await api.search(query, activeModule);
    setResults(res);
    setOpen(true);
  }

  function goToReference() {
    onJump?.(query);
    setOpen(false);
  }

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={runSearch} className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a reference (John 3, Romans 8:28-30) or search words…"
          className="w-full rounded-md border border-rule bg-panel px-4 py-2 font-sans text-sm text-parchment placeholder:text-muted focus:border-brass"
        />
        <button
          type="submit"
          className="rounded-md bg-brass/90 px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-brass"
        >
          Search
        </button>
      </form>

      {open && results && (
        <div className="absolute z-10 mt-2 w-full rounded-md border border-rule bg-panel shadow-xl">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2">
            <span className="text-xs uppercase tracking-wide text-muted">Results for “{results.query}”</span>
            <button className="text-xs text-muted hover:text-parchment" onClick={() => setOpen(false)}>
              close
            </button>
          </div>

          {results.reference?.valid && (
            <button
              onClick={goToReference}
              className="flex w-full items-center gap-2 border-b border-rule bg-verdigris/10 px-4 py-2 text-left text-sm hover:bg-verdigris/20"
            >
              <span className="marginalia-tick" aria-hidden="true" />
              <span>
                Go to <span className="text-brass">{results.query}</span>
                <span className="ml-2 font-mono text-xs text-muted">{results.reference.osis}</span>
              </span>
            </button>
          )}

          {results.bible?.length > 0 && (
            <div className="max-h-64 overflow-y-auto px-4 py-2">
              <p className="mb-1 text-xs uppercase tracking-wide text-verdigris">Scripture matches</p>
              {results.bible.map((r, i) => {
                const ref = `${r.bibleBookShortTitle} ${r.chapter}:${r.verseNr}`;
                return (
                  <button
                    key={i}
                    className="block w-full truncate py-1 text-left text-sm text-parchment/90 hover:text-brass"
                    onClick={() => {
                      onJump?.(ref);
                      setOpen(false);
                    }}
                  >
                    {ref}: {r.content}
                  </button>
                );
              })}
            </div>
          )}

          {results.documents?.length > 0 && (
            <div className="max-h-64 overflow-y-auto border-t border-rule px-4 py-2">
              <p className="mb-1 text-xs uppercase tracking-wide text-verdigris">Library</p>
              {results.documents.map((d) => (
                <div key={d.id} className="py-1 text-sm text-parchment/90">
                  {d.title} {d.author && <span className="text-muted">— {d.author}</span>}
                </div>
              ))}
            </div>
          )}

          {!results.reference?.valid && !results.bible?.length && !results.documents?.length && (
            <p className="px-4 py-3 text-sm text-muted">No matches.</p>
          )}
        </div>
      )}
    </div>
  );
}

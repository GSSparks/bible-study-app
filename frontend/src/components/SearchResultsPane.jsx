import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import ModulePicker from './ModulePicker.jsx';

/**
 * Walks DOM text nodes and wraps matched terms in <mark> elements.
 * Skips <sup> children so xref/footnote markers are never highlighted.
 * Operates on a detached document fragment so it never touches the page.
 */
function walkAndMark(node, re, doc) {
  if (node.nodeType === Node.TEXT_NODE) {
    re.lastIndex = 0;
    if (!re.test(node.textContent)) return;
    re.lastIndex = 0;
    const parts = node.textContent.split(re);
    if (parts.length <= 1) return;
    const frag = doc.createDocumentFragment();
    parts.forEach((part, i) => {
      if (i % 2 === 1) {
        const mark = doc.createElement('mark');
        mark.style.cssText = 'background:rgba(232,164,65,0.28);border-radius:2px;font-style:normal;';
        mark.textContent = part;
        frag.appendChild(mark);
      } else {
        frag.appendChild(doc.createTextNode(part));
      }
    });
    node.parentNode.replaceChild(frag, node);
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SUP') {
    [...node.childNodes].forEach((child) => walkAndMark(child, re, doc));
  }
}

function injectHighlights(html, query, searchType) {
  if (!html || !query.trim()) return html;
  const terms =
    searchType === 'phrase'
      ? [query.trim()]
      : query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return html;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild;
  walkAndMark(root, re, doc);
  return root.innerHTML;
}

export default function SearchResultsPane({ pendingSearch, onNavigate, defaultBibleModule }) {
  const [query, setQuery] = useState('');
  const [module, setModule] = useState('');
  const [searchType, setSearchType] = useState('multiWord');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(null);
  const [capped, setCapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!module && defaultBibleModule) setModule(defaultBibleModule);
  }, [defaultBibleModule]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingSearch) return;
    const q = pendingSearch.query;
    const mod = pendingSearch.module || module || defaultBibleModule || '';
    setQuery(q);
    if (mod) setModule(mod);
    doSearch(q, mod, searchType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch?.nonce]);

  async function doSearch(q = query, mod = module, type = searchType) {
    if (!q.trim() || !mod) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setTotal(null);
    try {
      const res = await api.search(q.trim(), mod, type);
      setResults(res.bible || []);
      setTotal(res.total ?? (res.bible || []).length);
      setCapped(!!res.capped);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Compute highlighted HTML once per results/query/searchType change — not on every render
  const highlightedResults = useMemo(() => {
    if (!query.trim()) return results.map((r) => ({ ...r, highlighted: r.content }));
    return results.map((r) => ({ ...r, highlighted: injectHighlights(r.content, query, searchType) }));
  }, [results, query, searchType]);

  function handleSubmit(e) {
    e.preventDefault();
    doSearch();
  }

  const countLabel =
    total === null ? null : capped ? `500+ results` : `${total.toLocaleString()} result${total === 1 ? '' : 's'}`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Controls */}
      <div className="shrink-0 border-b border-rule bg-panel px-3 py-2">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the Bible…"
            className="min-w-0 flex-1 rounded border border-rule bg-ink px-2 py-1 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || !module || loading}
            className="shrink-0 rounded bg-brass/90 px-3 py-1 text-sm font-medium text-ink hover:bg-brass disabled:opacity-40"
          >
            Go
          </button>
        </form>

        <div className="mt-2 flex items-center gap-2 text-xs">
          <ModulePicker
            kind="bible"
            excludeModules={[]}
            label={module || 'Choose module…'}
            title="Bible version to search"
            onSelect={(m) => setModule(m)}
          />
          <div className="flex overflow-hidden rounded border border-rule">
            <button
              type="button"
              onClick={() => setSearchType('multiWord')}
              className={`px-2 py-0.5 ${searchType === 'multiWord' ? 'bg-panel text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              All words
            </button>
            <button
              type="button"
              onClick={() => setSearchType('phrase')}
              className={`border-l border-rule px-2 py-0.5 ${searchType === 'phrase' ? 'bg-panel text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              Exact phrase
            </button>
          </div>
          {countLabel && !loading && <span className="ml-auto text-muted">{countLabel}</span>}
        </div>
      </div>

      {/* Results */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-page">
        {loading && <p className="px-4 py-3 text-sm text-pageMuted">Searching…</p>}
        {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}
        {!loading && !error && total === 0 && (
          <p className="px-4 py-3 text-sm text-pageMuted">No verses found.</p>
        )}
        {!loading && !error && total === null && results.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-pageMuted">
            Enter a word or phrase above and press Go.
          </p>
        )}

        {highlightedResults.map((r, i) => {
          const ref = `${r.bibleBookShortTitle} ${r.chapter}:${r.verseNr}`;
          return (
            <button
              key={i}
              onClick={() => onNavigate?.(ref)}
              className="block w-full border-b border-pageBorder/40 px-4 py-2.5 text-left hover:bg-pageAccent/10"
            >
              <span className="mb-0.5 block font-mono text-xs font-semibold text-verdigris">{ref}</span>
              {/* verse-content gives footnote/xref sups the same muted styling as the reading pane */}
              <span
                className="verse-content text-sm leading-relaxed text-pageText [&_.xref-marker]:cursor-default [&_.footnote-marker]:cursor-default [&_[data-strong]]:font-normal"
                dangerouslySetInnerHTML={{ __html: r.highlighted }}
              />
            </button>
          );
        })}

        {capped && !loading && (
          <p className="px-4 py-3 text-center text-xs text-pageMuted">
            Showing first 500 matches — narrow your search for more precise results.
          </p>
        )}
      </div>
    </div>
  );
}

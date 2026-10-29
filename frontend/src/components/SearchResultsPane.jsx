import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ModulePicker from './ModulePicker.jsx';

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bible'); // 'bible' | 'commentary'

  // ── Bible search state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [module, setModule] = useState('');
  const [searchType, setSearchType] = useState('multiWord');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(null);
  const [capped, setCapped] = useState(false);
  const [discussions, setDiscussions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Commentary search state ─────────────────────────────────────────────────
  const [commentaryModule, setCommentaryModule] = useState(''); // '' = all
  const [commentaryResults, setCommentaryResults] = useState([]);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryError, setCommentaryError] = useState(null);
  const [commentarySearched, setCommentarySearched] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (!module && defaultBibleModule) setModule(defaultBibleModule);
  }, [defaultBibleModule]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingSearch) return;
    const q = pendingSearch.query;
    setQuery(q);
    if (pendingSearch.tab === 'commentary') {
      setActiveTab('commentary');
      doCommentarySearch(q, commentaryModule);
    } else {
      const mod = pendingSearch.module || module || defaultBibleModule || '';
      if (mod) setModule(mod);
      setActiveTab('bible');
      doSearch(q, mod, searchType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch?.nonce]);

  async function doSearch(q = query, mod = module, type = searchType) {
    if (!q.trim() || !mod) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setTotal(null);
    setDiscussions([]);
    setNotes([]);
    setDocuments([]);
    try {
      const res = await api.search(q.trim(), mod, type);
      setResults(res.bible || []);
      setTotal(res.total ?? (res.bible || []).length);
      setCapped(!!res.capped);
      setDiscussions(res.discussions || []);
      setNotes(res.notes || []);
      setDocuments(res.documents || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function doCommentarySearch(q = query, mod = commentaryModule) {
    if (!q.trim()) return;
    setCommentaryLoading(true);
    setCommentaryError(null);
    setCommentaryResults([]);
    setCommentarySearched(true);
    try {
      const res = await api.searchCommentary(q.trim(), mod);
      setCommentaryResults(res);
    } catch (e) {
      setCommentaryError(e.message);
    } finally {
      setCommentaryLoading(false);
    }
  }

  // Compute highlighted HTML once per results/query/searchType change — not on every render
  const highlightedResults = useMemo(() => {
    if (!query.trim()) return results.map((r) => ({ ...r, highlighted: r.content }));
    return results.map((r) => ({ ...r, highlighted: injectHighlights(r.content, query, searchType) }));
  }, [results, query, searchType]);

  const highlightedCommentaryResults = useMemo(() => {
    if (!query.trim()) return commentaryResults;
    return commentaryResults.map((r) => ({
      ...r,
      highlightedSnippet: injectHighlights(r.snippet, query, 'multiWord'),
    }));
  }, [commentaryResults, query]);

  function handleSubmit(e) {
    e.preventDefault();
    if (activeTab === 'commentary') doCommentarySearch();
    else doSearch();
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
            placeholder={activeTab === 'commentary' ? 'Search commentaries…' : 'Search the Bible…'}
            className="min-w-0 flex-1 rounded border border-rule bg-ink px-2 py-1 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || (activeTab === 'bible' && !module) || loading || commentaryLoading}
            className="shrink-0 rounded bg-brass/90 px-3 py-1 text-sm font-medium text-ink hover:bg-brass disabled:opacity-40"
          >
            Go
          </button>
        </form>

        {/* Tab switcher */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <div className="flex overflow-hidden rounded border border-rule">
            <button
              type="button"
              onClick={() => setActiveTab('bible')}
              className={`px-2.5 py-0.5 ${activeTab === 'bible' ? 'bg-panel text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              Bible
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('commentary')}
              className={`border-l border-rule px-2.5 py-0.5 ${activeTab === 'commentary' ? 'bg-panel text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              Commentary
            </button>
          </div>

          {activeTab === 'bible' && (
            <>
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
            </>
          )}

          {activeTab === 'commentary' && (
            <>
              <ModulePicker
                kind="commentary"
                excludeModules={[]}
                label={commentaryModule || 'All commentaries'}
                title="Commentary to search"
                onSelect={(m) => setCommentaryModule(m)}
              />
              {commentaryModule && (
                <button
                  type="button"
                  onClick={() => setCommentaryModule('')}
                  className="text-muted hover:text-parchment"
                  title="Clear — search all commentaries"
                >
                  ✕
                </button>
              )}
              {!commentaryLoading && commentarySearched && (
                <span className="ml-auto text-muted">
                  {commentaryResults.length === 200 ? '200+ results' : `${commentaryResults.length} result${commentaryResults.length === 1 ? '' : 's'}`}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bible results */}
      {activeTab === 'bible' && (
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

          {!loading && notes.length > 0 && (
            <div className="border-t border-pageBorder/60 pt-1">
              <p className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-pageMuted">
                My Notes
              </p>
              {notes.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-pageBorder/40 px-4 py-2.5 ${n.reference ? 'cursor-pointer hover:bg-pageAccent/10' : ''}`}
                  onClick={() => n.reference && onNavigate?.(n.reference)}
                >
                  <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {n.reference && (
                      <span className="font-mono text-xs font-semibold text-verdigris">{n.reference}</span>
                    )}
                    {n.title && <span className="text-xs font-medium text-pageText">{n.title}</span>}
                    {n.fromAssistant && (
                      <span className="rounded border border-brass/40 px-1 py-px text-[10px] text-brass">AI</span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm leading-relaxed text-pageText/80">{stripMarkdown(n.body)}</p>
                </div>
              ))}
            </div>
          )}

          {!loading && documents.length > 0 && (
            <div className="border-t border-pageBorder/60 pt-1">
              <p className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-pageMuted">
                Documents
              </p>
              {documents.map((d) => (
                <div key={d.id} className="border-b border-pageBorder/40 px-4 py-2.5">
                  <p className="text-sm font-medium text-pageText">{d.title}</p>
                  {d.author && <p className="text-xs text-pageMuted">{d.author}</p>}
                </div>
              ))}
            </div>
          )}

          {!loading && discussions.length > 0 && (
            <div className="border-t border-pageBorder/60 pt-1">
              <p className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-pageMuted">
                Study Discussions
              </p>
              {discussions.map((d) => (
                <div key={d.id} className="border-b border-pageBorder/40 px-4 py-2.5">
                  <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {d.type === 'finding' && d.reference && (
                      <button
                        onClick={() => onNavigate?.(d.reference)}
                        className="font-mono text-xs font-semibold text-verdigris hover:underline"
                      >
                        {d.reference}
                      </button>
                    )}
                    {d.title && <span className="text-xs font-medium text-pageText">{d.title}</span>}
                    <span className="text-xs text-pageMuted">{d.author.displayName || d.author.username} · {d.study.title}</span>
                    {d.study.scriptoriumId && (
                      <button
                        onClick={() => {
                          try { localStorage.setItem(`study-tab-${d.study.id}`, 'discussion'); } catch {}
                          navigate(`/scriptoriums/${d.study.scriptoriumId}/studies/${d.study.id}#post-${d.id}`);
                        }}
                        className="ml-auto text-xs text-brass hover:underline"
                      >
                        View in study →
                      </button>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm leading-relaxed text-pageText/80">{stripMarkdown(d.body)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Commentary results */}
      {activeTab === 'commentary' && (
        <div className="min-h-0 flex-1 overflow-y-auto bg-page">
          {commentaryLoading && <p className="px-4 py-3 text-sm text-pageMuted">Searching…</p>}
          {commentaryError && <p className="px-4 py-3 text-sm text-red-600">{commentaryError}</p>}
          {!commentaryLoading && !commentaryError && commentarySearched && commentaryResults.length === 0 && (
            <p className="px-4 py-3 text-sm text-pageMuted">No commentary entries found.</p>
          )}
          {!commentaryLoading && !commentarySearched && (
            <p className="px-4 py-6 text-center text-sm text-pageMuted">
              Enter a word or phrase above and press Go.
            </p>
          )}

          {highlightedCommentaryResults.map((r, i) => (
            <button
              key={i}
              onClick={() => onNavigate?.(r.reference)}
              className="block w-full border-b border-pageBorder/40 px-4 py-2.5 text-left hover:bg-pageAccent/10"
            >
              <div className="mb-0.5 flex items-baseline gap-2">
                <span className="font-mono text-xs font-semibold text-verdigris">{r.reference}</span>
                <span className="text-xs text-pageMuted">{r.moduleTitle}</span>
              </div>
              <p
                className="line-clamp-3 text-sm leading-relaxed text-pageText [&_mark]:rounded-sm [&_mark]:bg-amber-300/30 [&_mark]:not-italic"
                dangerouslySetInnerHTML={{ __html: r.highlightedSnippet ?? r.snippet }}
              />
            </button>
          ))}

          {commentaryResults.length === 200 && !commentaryLoading && (
            <p className="px-4 py-3 text-center text-xs text-pageMuted">
              Showing first 200 matches — narrow your search or pick a specific commentary.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

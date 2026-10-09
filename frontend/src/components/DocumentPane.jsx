import { useEffect, useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { api } from '../api/client.js';
import DocumentModal from './DocumentModal.jsx';

export default function DocumentPane({ isLoggedIn, isAdmin, onAskAI }) {
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [openDocId, setOpenDocId] = useState(null);

  useEffect(() => {
    api.listDocuments().then(setDocs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      try { setSearchResults(await api.searchDocuments(search.trim())); }
      catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const displayDocs = searchResults !== null ? searchResults : docs;

  return (
    <>
    <div className="flex h-full flex-col overflow-hidden bg-page">
      <div className="shrink-0 border-b border-pageBorder px-3 py-2">
        <div className="relative">
          <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-pageMuted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full rounded border border-pageBorder bg-page/50 py-1.5 pl-7 pr-7 text-xs text-pageText placeholder:text-pageMuted focus:border-pageAccent focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-pageMuted hover:text-pageText">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {docs.length === 0 && searchResults === null ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <FileText size={24} className="mx-auto mb-2 text-pageMuted/50" strokeWidth={1} />
              <p className="text-sm text-pageMuted">No documents in library</p>
            </div>
          </div>
        ) : searchResults !== null && searchResults.length === 0 ? (
          <p className="px-3 py-4 text-xs text-pageMuted">No documents match "{search}".</p>
        ) : (
          <div className="divide-y divide-pageBorder">
            {displayDocs.map((d) => (
              <button
                key={d.id}
                onClick={() => setOpenDocId(d.id)}
                className="group flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-pageAccent/5"
              >
                <FileText size={14} className="mt-0.5 shrink-0 text-pageMuted group-hover:text-pageAccent" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-display text-pageText group-hover:text-pageAccent">{d.title}</p>
                  {d.author && <p className="truncate text-xs text-pageMuted">{d.author}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    {openDocId && (
      <DocumentModal
        documentId={openDocId}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        onAskAI={onAskAI}
        onClose={() => setOpenDocId(null)}
        onDeleted={() => {
          setOpenDocId(null);
          api.listDocuments().then(setDocs).catch(() => {});
        }}
        onRenamed={(updated) => setDocs((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)))}
      />
    )}
    </>
  );
}

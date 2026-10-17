import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, FileText, Folder, Library, Search, Upload, X } from 'lucide-react';
import { api } from '../api/client.js';
import DocumentReader from './DocumentReader.jsx';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'author', label: 'Author A–Z' },
];

export default function LibraryView({ isLoggedIn, isAdmin, onAskAI, onOpenInCell }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [mobileShowReader, setMobileShowReader] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => { refreshDocs(); }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      try { setSearchResults(await api.searchDocuments(search.trim())); }
      catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function refreshDocs() {
    setLoading(true);
    api.listDocuments()
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', file.name.replace(/\.(pdf|docx?)$/i, ''));
      const res = await fetch('/api/pdf', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      refreshDocs();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function sortDocs(list) {
    if (sortBy === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'author') return [...list].sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    return list;
  }

  const collections = [...new Set(docs.map((d) => d.collection).filter(Boolean))].sort();
  const displayDocs = searchResults !== null
    ? searchResults
    : sortDocs(docs).filter((d) => !activeCollection || d.collection === activeCollection);

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label;

  return (
    <div className="flex h-full min-h-0">
      {/* ── Sidebar ── */}
      <div className={`flex shrink-0 flex-col border-r border-rule bg-panel ${mobileShowReader ? 'hidden lg:flex lg:w-64' : 'w-full lg:w-64'}`}>
        {/* Header */}
        <div className="shrink-0 border-b border-rule px-4 py-3">
          <div className="flex items-center gap-2">
            <Library size={16} className="shrink-0 text-brass" />
            <h1 className="font-display flex-1 text-base font-semibold text-parchment">Library</h1>
            {isAdmin && (
              <label className="flex cursor-pointer items-center gap-1.5 rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment">
                <Upload size={11} />
                {uploading ? '…' : 'Upload'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            )}
          </div>
          <p className="mt-0.5 font-ui text-[10px] uppercase tracking-widest text-muted">Documents & PDFs</p>
          {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
        </div>

        {/* Search */}
        <div className="shrink-0 px-3 pt-2 pb-1.5">
          <div className="relative">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded border border-rule bg-ink/60 py-1.5 pl-7 pr-6 text-xs text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-parchment"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        {searchResults === null && (
          <div className="shrink-0 px-3 pb-2" ref={sortRef}>
            <div className="relative inline-block">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-1 rounded border border-rule px-2 py-1 text-[11px] text-muted hover:border-brass hover:text-parchment"
              >
                {activeSortLabel}
                <ChevronDown size={10} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute left-0 top-full z-10 mt-0.5 min-w-[130px] rounded border border-rule bg-panel shadow-lg">
                  {SORT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => { setSortBy(o.value); setSortOpen(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-brass/10 ${
                        sortBy === o.value ? 'text-brass' : 'text-muted hover:text-parchment'
                      }`}
                    >
                      {sortBy === o.value && <Check size={9} />}
                      {sortBy !== o.value && <span className="w-[9px]" />}
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collection filter chips */}
        {collections.length > 0 && searchResults === null && (
          <div className="shrink-0 flex flex-wrap gap-1 px-3 pb-2">
            <button
              onClick={() => setActiveCollection(null)}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                activeCollection === null
                  ? 'border-brass bg-brass/15 text-brass'
                  : 'border-rule text-muted hover:border-brass/60 hover:text-parchment'
              }`}
            >
              All
            </button>
            {collections.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCollection(activeCollection === c ? null : c)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                  activeCollection === c
                    ? 'border-brass bg-brass/15 text-brass'
                    : 'border-rule text-muted hover:border-brass/60 hover:text-parchment'
                }`}
              >
                <Folder size={8} />
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Doc list */}
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {loading ? (
            <p className="px-4 py-2 text-xs text-muted">Loading…</p>
          ) : displayDocs.length === 0 ? (
            <p className="px-4 py-4 text-xs leading-relaxed text-muted">
              {search ? `No results for "${search}"` : 'No documents yet — upload a PDF to get started.'}
            </p>
          ) : (
            displayDocs.map((doc) => {
              const active = doc.id === selectedId;
              return (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedId(doc.id); setMobileShowReader(true); }}
                  className={`w-full border-l-2 px-4 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-brass bg-ink/40 text-brass'
                      : 'border-transparent text-muted hover:bg-ink/30 hover:text-parchment'
                  }`}
                >
                  <p className="truncate text-sm leading-snug">{doc.title}</p>
                  {doc.author && (
                    <p className="mt-0.5 truncate text-[11px] text-muted/70">{doc.author}</p>
                  )}
                  {doc.collection && (
                    <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-muted/50">
                      <Folder size={8} />
                      {doc.collection}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Reader pane ── */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${mobileShowReader ? 'flex' : 'hidden lg:flex'}`}>
        {mobileShowReader && (
          <button
            onClick={() => setMobileShowReader(false)}
            className="flex shrink-0 items-center gap-1.5 border-b border-rule px-4 py-2.5 text-sm text-muted hover:text-parchment lg:hidden"
          >
            <ChevronLeft size={15} />
            Library
          </button>
        )}
        {!selectedId ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <FileText size={40} className="text-muted/25" strokeWidth={1} />
            <p className="font-display text-lg text-parchment">Select a document</p>
            <p className="text-sm text-muted">Choose a document from the sidebar to start reading.</p>
          </div>
        ) : (
          <DocumentReader
            key={selectedId}
            documentId={selectedId}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            collections={collections}
            onAskAI={onAskAI}
            onOpenInCell={onOpenInCell}
            onDeleted={() => { setSelectedId(null); refreshDocs(); }}
            onRenamed={(updated) => {
              setDocs((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
            }}
          />
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, FileText, Folder, Pencil, Search, StickyNote, Trash2, Upload, X } from 'lucide-react';
import { api } from '../api/client.js';
import { getAvatarColor } from '../utils/avatar.js';
import NotesSidebar from './NotesSidebar.jsx';
import DocumentModal from './DocumentModal.jsx';

const MODULE_TYPES = ['BIBLE', 'COMMENTARY', 'DICT'];
const TYPE_LABEL = { BIBLE: 'Bibles', COMMENTARY: 'Commentaries', DICT: 'Dictionaries & Lexicons' };
const SECTION_TABS = ['Documents', 'Notes', 'Modules'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'author', label: 'Author A–Z' },
];

export default function LibraryView({ isLoggedIn, isAdmin, onAskAI }) {
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('library-tab') || 'Documents'; } catch { return 'Documents'; }
  });

  function switchTab(t) {
    setActiveTab(t);
    try { localStorage.setItem('library-tab', t); } catch {}
  }

  const [modules, setModules] = useState({ BIBLE: [], COMMENTARY: [], DICT: [] });
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [loadingModules, setLoadingModules] = useState(true);
  const [openDocId, setOpenDocId] = useState(null);
  const [docSearch, setDocSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState(null);
  const [renamingDocId, setRenamingDocId] = useState(null);
  const [renameValues, setRenameValues] = useState({ title: '', author: '', collection: '' });
  const [renameSaving, setRenameSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const renameInputRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    Promise.all(MODULE_TYPES.map((t) => api.listInstalledModules(t).then((list) => [t, list])))
      .then((results) => setModules(Object.fromEntries(results)))
      .catch(() => {})
      .finally(() => setLoadingModules(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'Documents') refreshDocs();
  }, [activeTab]);

  useEffect(() => {
    if (!docSearch.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      try { setSearchResults(await api.searchDocuments(docSearch.trim())); }
      catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [docSearch]);

  useEffect(() => {
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function refreshDocs() {
    api.listDocuments().then(setDocs).catch(() => {});
  }

  function startRename(e, doc) {
    e.stopPropagation();
    setRenameValues({ title: doc.title, author: doc.author || '', collection: doc.collection || '' });
    setRenamingDocId(doc.id);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }

  async function saveRename(id) {
    if (!renameValues.title.trim()) return;
    setRenameSaving(true);
    try {
      const updated = await api.updateDocument(id, {
        title: renameValues.title.trim(),
        author: renameValues.author.trim() || null,
        collection: renameValues.collection.trim() || null,
      });
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      setRenamingDocId(null);
    } catch {}
    setRenameSaving(false);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    setDeleting(true);
    try {
      await api.deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setConfirmDeleteId(null);
      if (activeCollection) {
        // If the deleted doc was the last in this collection, reset filter
        const remaining = docs.filter((d) => d.id !== id && d.collection === activeCollection);
        if (remaining.length === 0) setActiveCollection(null);
      }
    } catch {}
    setDeleting(false);
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

  const totalModules = Object.values(modules).reduce((s, l) => s + l.length, 0);

  // Derive sorted + filtered doc list
  const collections = [...new Set(docs.map((d) => d.collection).filter(Boolean))].sort();

  function sortDocs(list) {
    if (sortBy === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'author') return [...list].sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    return list; // newest — already sorted desc from API
  }

  const displayDocs = searchResults !== null
    ? searchResults
    : sortDocs(docs).filter((d) => !activeCollection || d.collection === activeCollection);

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 border-b border-rule bg-ink pb-0 pt-8">
        <div className="mx-auto max-w-5xl px-8">
          <h1 className="font-display text-3xl tracking-wide text-parchment">My Library</h1>
          <p className="mt-1 text-sm text-muted">
            {loadingModules ? 'Loading…' : `${totalModules} installed module${totalModules !== 1 ? 's' : ''}`}
            {docs.length > 0 && ` · ${docs.length} document${docs.length !== 1 ? 's' : ''}`}
          </p>

          <div className="mt-5 flex gap-6">
            {SECTION_TABS.map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex items-center gap-2 border-b-2 pb-3 text-sm transition-colors ${
                  activeTab === t
                    ? 'border-brass text-parchment'
                    : 'border-transparent text-muted hover:text-parchment'
                }`}
              >
                {t === 'Modules' && <BookOpen size={14} />}
                {t === 'Documents' && <FileText size={14} />}
                {t === 'Notes' && <StickyNote size={14} />}
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'Modules' && (
          <div className="mx-auto max-w-5xl px-8 py-6">
            {loadingModules ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg border border-rule bg-panel" />)}
              </div>
            ) : totalModules === 0 ? (
              <div className="py-16 text-center">
                <BookOpen size={32} className="mx-auto mb-3 text-muted/40" strokeWidth={1} />
                <p className="font-display text-lg text-parchment">No modules installed</p>
                <p className="mt-1 text-sm text-muted">Ask an admin to install SWORD modules from the Admin panel.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {MODULE_TYPES.filter((t) => modules[t]?.length > 0).map((type) => (
                  <section key={type}>
                    <h2 className="mb-4 font-display text-xl text-parchment">{TYPE_LABEL[type]}</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {modules[type].map((mod) => (
                        <ModuleCard key={mod.name} mod={mod} type={type} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Documents' && (
          <div className="mx-auto max-w-5xl px-8 py-6">
            {/* Toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search documents…"
                  className="w-full rounded-lg border border-rule bg-panel py-2 pl-8 pr-8 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
                />
                {docSearch && (
                  <button onClick={() => setDocSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-parchment">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              {searchResults === null && (
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setSortOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
                  >
                    {activeSortLabel}
                    <ChevronDown size={11} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded border border-rule bg-panel shadow-lg">
                      {SORT_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => { setSortBy(o.value); setSortOpen(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-brass/10 ${
                            sortBy === o.value ? 'text-brass' : 'text-muted hover:text-parchment'
                          }`}
                        >
                          {sortBy === o.value && <Check size={10} />}
                          {sortBy !== o.value && <span className="w-[10px]" />}
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isAdmin && (
                <label className="flex cursor-pointer items-center gap-2 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment">
                  <Upload size={13} />
                  {uploading ? 'Uploading…' : 'Upload'}
                  <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleUpload} />
                </label>
              )}
            </div>

            {/* Collection filter chips */}
            {collections.length > 0 && searchResults === null && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <Folder size={11} className="shrink-0 text-muted/60" />
                <button
                  onClick={() => setActiveCollection(null)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
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
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                      activeCollection === c
                        ? 'border-brass bg-brass/15 text-brass'
                        : 'border-rule text-muted hover:border-brass/60 hover:text-parchment'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {uploadError && <p className="mb-4 text-sm text-red-400">{uploadError}</p>}

            {docs.length === 0 && searchResults === null ? (
              <div className="py-16 text-center">
                <FileText size={32} className="mx-auto mb-3 text-muted/40" strokeWidth={1} />
                <p className="font-display text-lg text-parchment">No documents yet</p>
                <p className="mt-1 text-sm text-muted">Upload a PDF to add it to your library.</p>
              </div>
            ) : searchResults !== null && searchResults.length === 0 ? (
              <p className="py-8 text-sm text-muted">No documents match "{docSearch}".</p>
            ) : displayDocs.length === 0 ? (
              <p className="py-8 text-sm text-muted">No documents in this collection.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 items-start">
                {displayDocs.map((d) => (
                  <div
                    key={d.id}
                    className="group relative flex items-start gap-4 rounded-xl border border-rule bg-panel p-4 transition-colors hover:border-brass"
                  >
                    {renamingDocId === d.id ? (
                      <div className="flex flex-1 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={renameInputRef}
                          value={renameValues.title}
                          onChange={(e) => setRenameValues((v) => ({ ...v, title: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveRename(d.id); if (e.key === 'Escape') setRenamingDocId(null); }}
                          className="w-full rounded border border-rule bg-ink px-2 py-1 text-sm text-parchment focus:border-brass focus:outline-none"
                          placeholder="Title"
                        />
                        <input
                          value={renameValues.author}
                          onChange={(e) => setRenameValues((v) => ({ ...v, author: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveRename(d.id); if (e.key === 'Escape') setRenamingDocId(null); }}
                          className="w-full rounded border border-rule bg-ink px-2 py-1 text-xs text-parchment focus:border-brass focus:outline-none"
                          placeholder="Author (optional)"
                        />
                        <CollectionInput
                          value={renameValues.collection}
                          onChange={(v) => setRenameValues((prev) => ({ ...prev, collection: v }))}
                          suggestions={collections}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveRename(d.id); if (e.key === 'Escape') setRenamingDocId(null); }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveRename(d.id)}
                            disabled={renameSaving}
                            className="flex items-center gap-1 rounded border border-brass/60 px-2 py-1 text-xs text-brass hover:bg-brass/10 disabled:opacity-50"
                          >
                            <Check size={11} /> Save
                          </button>
                          <button onClick={() => setRenamingDocId(null)} className="text-xs text-muted hover:text-parchment">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setOpenDocId(d.id)}
                          className="flex flex-1 items-start gap-4 text-left"
                        >
                          <div className="mt-0.5 flex h-12 w-9 shrink-0 items-center justify-center rounded border border-rule bg-ink text-muted group-hover:border-brass/50">
                            <FileText size={16} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 break-words font-display text-base leading-snug text-parchment group-hover:text-brass">
                              {d.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {d.author || 'Unknown author'}
                              {d.pageCount ? ` · ${d.pageCount}p` : ''}
                            </p>
                            {d.collection && (
                              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-brass/25 bg-brass/10 px-2 py-0.5 text-[10px] text-brass/80">
                                <Folder size={9} />
                                {d.collection}
                              </span>
                            )}
                          </div>
                        </button>
                        {isAdmin && confirmDeleteId === d.id ? (
                          <div className="flex shrink-0 flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs text-muted">Delete?</span>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => handleDelete(e, d.id)}
                                disabled={deleting}
                                className="rounded border border-red-400/60 px-2 py-0.5 text-xs text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                              >
                                {deleting ? '…' : 'Yes'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="text-xs text-muted hover:text-parchment"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ) : isAdmin && (
                          <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={(e) => startRename(e, d)}
                              className="rounded border border-rule p-1 text-muted hover:border-brass hover:text-parchment"
                              title="Edit"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(d.id); }}
                              className="rounded border border-rule p-1 text-muted hover:border-red-400 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Notes' && (
          <div className="mx-auto max-w-5xl px-8 py-6">
            <NotesSidebar reference={null} module={null} isLoggedIn={isLoggedIn} />
          </div>
        )}
      </div>

      {openDocId && (
        <DocumentModal
          documentId={openDocId}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          onAskAI={onAskAI}
          onClose={() => setOpenDocId(null)}
          onDeleted={() => { setOpenDocId(null); refreshDocs(); }}
          onRenamed={(updated) => setDocs((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)))}
        />
      )}
    </div>
  );
}

function CollectionInput({ value, onChange, suggestions, onKeyDown }) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);
  return (
    <div className="relative">
      <div className="flex items-center gap-1 rounded border border-rule bg-ink px-2 py-1">
        <Folder size={10} className="shrink-0 text-muted/60" />
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-xs text-parchment placeholder:text-muted focus:outline-none"
          placeholder="Collection (optional)"
        />
        {value && (
          <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(''); }} className="shrink-0 text-muted hover:text-parchment">
            <X size={10} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-0.5 rounded border border-rule bg-panel shadow-lg">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted hover:bg-brass/10 hover:text-parchment"
            >
              <Folder size={9} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_ACCENT = {
  BIBLE: '#C89B3C',
  COMMENTARY: '#3F7168',
  DICT: '#5B7C99',
};
const TYPE_SHORT = { BIBLE: 'Bible', COMMENTARY: 'Commentary', DICT: 'Dictionary' };

function ModuleCard({ mod, type }) {
  const spineColor = getAvatarColor(mod.name);
  const typeAccent = TYPE_ACCENT[type];
  return (
    <div className="group flex overflow-hidden rounded-xl border border-rule bg-panel transition-colors hover:border-brass/60">
      <div className="w-2 shrink-0" style={{ background: `linear-gradient(to bottom, ${spineColor}cc, ${spineColor}55)` }} />
      <div className="flex min-w-0 flex-1 flex-col justify-between px-4 py-3.5">
        <div className="min-w-0">
          <p className="line-clamp-2 break-words font-display text-base leading-snug text-parchment">
            {mod.description || mod.name}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted">{mod.name}</p>
        </div>
        <div className="mt-2">
          <span className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide"
            style={{ color: typeAccent, background: `${typeAccent}22` }}>
            {TYPE_SHORT[type]}
          </span>
        </div>
      </div>
    </div>
  );
}

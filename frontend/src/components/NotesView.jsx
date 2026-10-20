import { useEffect, useRef, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, ChevronLeft, Download, ExternalLink, Plus, Search, StickyNote, Trash2, X } from 'lucide-react';
import { api } from '../api/client.js';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

function stripLeadingHeading(body) {
  return body?.replace(/^#{1,6}\s+.+\n?/, '').trim() ?? '';
}

function cleanTitle(title) {
  return title?.replace(/^#{1,6}\s+/, '').trim() ?? title;
}

function isBibleRef(reference) {
  return Boolean(reference)
    && !reference.startsWith('book-highlight:')
    && !reference.startsWith('pdf-highlight:');
}

function isPdfAnnotation(note) {
  return note.tags?.includes('pdf-highlight');
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'bible', label: 'Bible' },
  { key: 'ai', label: 'AI' },
  { key: 'personal', label: 'Personal' },
];

export default function NotesView({ isLoggedIn, onOpenInCell }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const titleInputRef = useRef(null);

  async function refresh(q) {
    setLoading(true);
    setError(null);
    try {
      const all = await api.listNotes(q ? { q } : {});
      const filtered = all.filter((n) => {
        if (n.reference?.startsWith('book-highlight:') || n.tags?.includes('book-highlight')) return false;
        if (n.tags?.includes('pdf-highlight') && !n.body?.trim()) return false;
        return true;
      });
      setNotes(filtered);
      return filtered;
    } catch (e) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!search.trim()) { refresh(); return; }
    const t = setTimeout(() => refresh(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const displayNotes = notes.filter((n) => {
    if (filter === 'bible') return isBibleRef(n.reference) && !n.fromAssistant;
    if (filter === 'ai') return n.fromAssistant;
    if (filter === 'personal') return !n.fromAssistant && !isBibleRef(n.reference) && !isPdfAnnotation(n);
    return true;
  });

  function startNew() {
    setEditingId('new');
    setSelectedId(null);
    setEditTitle('');
    setEditBody('');
    setError(null);
    setMobileShowDetail(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function startEdit(note) {
    setEditingId(note.id);
    setSelectedId(note.id);
    setEditTitle(note.title || '');
    setEditBody(note.body || '');
    setError(null);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function save() {
    if (!editBody.trim()) return;
    setSaving(true);
    try {
      if (editingId === 'new') {
        const created = await api.createNote({ title: editTitle || null, body: editBody });
        setEditingId(null);
        await refresh(search.trim() || undefined);
        setSelectedId(created.id);
      } else {
        await api.updateNote(editingId, { title: editTitle || null, body: editBody });
        const id = editingId;
        setEditingId(null);
        setSelectedId(id);
        await refresh(search.trim() || undefined);
      }
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function remove(id) {
    try {
      await api.deleteNote(id);
      if (selectedId === id) setSelectedId(null);
      if (editingId === id) setEditingId(null);
      refresh(search.trim() || undefined);
    } catch (e) {
      setError(e.message);
    }
  }
  async function exportNotes() {
    const md = notes.map((n) => {
      const title = cleanTitle(n.title) || n.reference || 'Untitled';
      const body = stripLeadingHeading(n.body) || '';
      const meta = [];
      if (n.reference) meta.push(n.reference);
      if (n.fromAssistant) meta.push('AI generated');
      const metaLine = meta.length ? `\n> ${meta.join(' · ')}\n` : '';
      return `## ${title}\n${metaLine}\n${body}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([`# Study Notes\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scriptorium-notes.md';
    a.click();
    URL.revokeObjectURL(url);
  }
  if (!isLoggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <StickyNote size={32} className="text-muted/40" strokeWidth={1} />
        <p className="font-display text-lg text-parchment">Notes</p>
        <p className="text-sm text-muted">Log in to view and create personal study notes.</p>
      </div>
    );
  }

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;
  const showEditor = editingId !== null;
  const showViewer = !showEditor && selectedNote !== null;

  return (
    <div className="flex h-full min-h-0">
      {/* ── Sidebar ── */}
      <div className={`flex shrink-0 flex-col border-r border-rule bg-panel ${mobileShowDetail ? 'hidden lg:flex lg:w-64' : 'w-full lg:w-64'}`}>
        {/* Header */}
        <div className="shrink-0 border-b border-rule px-4 py-3">
          <div className="flex items-center gap-2">
            <StickyNote size={16} className="text-brass" />
            <h1 className="font-display flex-1 text-base font-semibold text-parchment">Notes</h1>
            <button
            onClick={exportNotes}
            className="flex items-center gap-1 rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
            title="Export all notes as Markdown"
          >
            <Download size={11} />
            All
          </button>
          <button
            onClick={startNew}
            className="flex items-center gap-1 rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
          >
            <Plus size={11} />
            New
          </button>
          </div>
          <p className="mt-0.5 font-ui text-[10px] uppercase tracking-widest text-muted">Personal Study Notes</p>
        </div>

        {/* Search */}
        <div className="shrink-0 border-b border-rule px-3 py-2">
          <div className="relative">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
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

        {/* Filter tabs */}
        <div className="flex shrink-0 border-b border-rule">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 py-2 font-ui text-xs transition-colors ${
                filter === key
                  ? 'border-b-2 border-brass text-brass'
                  : 'text-muted hover:text-parchment'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Note list */}
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {loading ? (
            <p className="px-4 py-2 text-xs text-muted">Loading…</p>
          ) : displayNotes.length === 0 ? (
            <p className="px-4 py-4 text-xs leading-relaxed text-muted">
              {filter !== 'all'
                ? 'No notes in this category.'
                : search
                ? 'No results.'
                : 'No notes yet.'}
            </p>
          ) : (
            displayNotes.map((n) => {
              const title = cleanTitle(n.title) || n.reference || 'Untitled';
              const active = n.id === selectedId || (editingId !== 'new' && n.id === editingId);
              return (
                <button
                  key={n.id}
                  onClick={() => { setSelectedId(n.id); setEditingId(null); setMobileShowDetail(true); }}
                  className={`w-full border-l-2 px-4 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-brass bg-ink/50 text-brass'
                      : 'border-transparent text-parchment/80 hover:bg-ink/30 hover:text-parchment'
                  }`}
                >
                  <p className="truncate text-sm">{title}</p>
                  {isBibleRef(n.reference) && (
                    <p className="mt-0.5 font-mono text-[10px] text-muted">{n.reference}</p>
                  )}
                  {n.fromAssistant && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                      <Bot size={9} />
                      AI generated
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right pane ── */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${mobileShowDetail ? 'flex' : 'hidden lg:flex'}`}>
        {mobileShowDetail && (
          <button
            onClick={() => { setMobileShowDetail(false); setSelectedId(null); setEditingId(null); }}
            className="flex shrink-0 items-center gap-1.5 border-b border-rule px-4 py-2.5 text-sm text-muted hover:text-parchment lg:hidden"
          >
            <ChevronLeft size={15} />
            Notes
          </button>
        )}
        {showViewer ? (
          <NoteViewer
            note={selectedNote}
            onEdit={() => startEdit(selectedNote)}
            onDelete={() => remove(selectedNote.id)}
            onOpenInCell={isBibleRef(selectedNote.reference) ? () => onOpenInCell?.(selectedNote.reference) : null}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-page">
            <div className="text-center">
              <StickyNote size={32} className="mx-auto mb-3 text-pageMuted/30" strokeWidth={1} />
              <p className="font-display text-pageText">Select a note to read</p>
              <p className="mt-1 text-xs text-pageMuted">or create a new one with + New</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Slide-out editor panel ── */}
      <NoteEditorPanel
        open={showEditor}
        editingId={editingId}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editBody={editBody}
        setEditBody={setEditBody}
        saving={saving}
        error={error}
        onSave={save}
        onCancel={cancelEdit}
        titleInputRef={titleInputRef}
      />
    </div>
  );
}

function NoteViewer({ note, onEdit, onDelete, onOpenInCell }) {
  const displayBody = stripLeadingHeading(note.body);
  function exportNote() {
    const title = cleanTitle(note.title) || note.reference || 'Untitled';
    const meta = [];
    if (note.reference) meta.push(note.reference);
    if (note.fromAssistant) meta.push('AI generated');
    const metaLine = meta.length ? `> ${meta.join(' · ')}\n\n` : '';
    const md = `# ${title}\n\n${metaLine}${displayBody || ''}\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      <div className="shrink-0 border-b border-pageBorder px-7 py-5">
        <div className="max-w-2xl flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl leading-snug text-pageText">
              {cleanTitle(note.title) || note.reference || 'Untitled'}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {isBibleRef(note.reference) && (
                <span className="font-mono text-xs text-pageMuted">{note.reference}</span>
              )}
              {note.fromAssistant && (
                <span className="flex items-center gap-1 font-ui text-xs text-pageMuted">
                  <Bot size={10} /> AI generated
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onOpenInCell && (
              <button
                onClick={onOpenInCell}
                className="flex items-center gap-1.5 rounded border border-pageBorder px-2.5 py-1.5 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
              >
                <ExternalLink size={11} /> Open in Cell
              </button>
            )}
// Export button
            <button
              onClick={exportNote}
              className="flex items-center gap-1.5 rounded border border-pageBorder px-2.5 py-1.5 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
              title="Export this note as Markdown"
            >
            <Download size={11} /> Export
              </button>
            <button
              onClick={onEdit}
              className="rounded border border-pageBorder px-2.5 py-1.5 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded border border-pageBorder px-2.5 py-1.5 text-xs text-pageMuted hover:border-red-400/60 hover:text-red-500"
              title="Delete note"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6" data-color-mode="light">
        <div className="markdown-body markdown-body-page max-w-2xl text-sm leading-relaxed text-pageText">
          <Markdown remarkPlugins={[remarkGfm]}>{displayBody || '*No content yet.*'}</Markdown>
        </div>
      </div>
    </div>
  );
}

function NoteEditorPanel({ open, editingId, editTitle, setEditTitle, editBody, setEditBody, saving, error, onSave, onCancel, titleInputRef }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onCancel}
      />

      {/* Panel — always mounted so state persists during transition */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-page shadow-2xl transition-transform duration-300 ease-in-out sm:w-[600px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-pageBorder px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-pageMuted">
              {editingId === 'new' ? 'New note' : 'Edit note'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onSave}
                disabled={saving || !editBody.trim()}
                className="rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={onCancel} className="rounded p-1 text-pageMuted hover:text-pageText">
                <X size={16} />
              </button>
            </div>
          </div>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5" data-color-mode="light">
          <input
            ref={titleInputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
            placeholder="Title (optional)"
            className="mb-4 w-full bg-transparent font-display text-2xl text-pageText placeholder:text-pageMuted/40 focus:outline-none"
          />
          <MDEditor value={editBody} onChange={(v) => setEditBody(v || '')} height={500} preview="edit" />
        </div>
      </div>
    </>
  );
}

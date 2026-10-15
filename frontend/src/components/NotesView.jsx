import { useEffect, useRef, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Bot, ExternalLink, Plus, Search, StickyNote, Trash2, User2, X } from 'lucide-react';
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
  { key: 'all', label: 'All', Icon: StickyNote },
  { key: 'bible', label: 'Bible', Icon: BookOpen },
  { key: 'ai', label: 'AI Generated', Icon: Bot },
  { key: 'personal', label: 'Personal', Icon: User2 },
];

export default function NotesView({ isLoggedIn, onOpenInCell }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [error, setError] = useState(null);
  const titleInputRef = useRef(null);

  async function refresh(q) {
    setLoading(true);
    setError(null);
    try {
      const all = await api.listNotes(q ? { q } : {});
      setNotes(
        all.filter((n) => {
          if (n.reference?.startsWith('book-highlight:') || n.tags?.includes('book-highlight')) return false;
          // PDF annotations: only show ones that have a note body (pure highlights have no body)
          if (n.tags?.includes('pdf-highlight') && !n.body?.trim()) return false;
          return true;
        }),
      );
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
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
    setViewingNote(null);
    setEditTitle('');
    setEditBody('');
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function startEdit(note) {
    setViewingNote(null);
    setEditingId(note.id);
    setEditTitle(note.title || '');
    setEditBody(note.body || '');
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
        await api.createNote({ title: editTitle || null, body: editBody });
      } else {
        await api.updateNote(editingId, { title: editTitle || null, body: editBody });
      }
      setEditingId(null);
      refresh(search.trim() || undefined);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function remove(id) {
    try {
      await api.deleteNote(id);
      if (viewingNote?.id === id) setViewingNote(null);
      if (editingId === id) setEditingId(null);
      refresh(search.trim() || undefined);
    } catch (e) {
      setError(e.message);
    }
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-rule bg-ink px-8 pt-8 pb-5">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-3xl tracking-wide text-parchment">Notes</h1>
          <p className="mt-1 text-sm text-muted">
            {notes.length > 0
              ? `${notes.length} note${notes.length !== 1 ? 's' : ''}`
              : 'Your personal study notes'}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-6">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="w-full rounded-lg border border-rule bg-panel py-2 pl-8 pr-8 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-parchment"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              onClick={startNew}
              className="flex items-center gap-2 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
            >
              <Plus size={13} />
              New note
            </button>
          </div>

          {/* Filter tabs */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-0.5 text-xs transition-colors ${
                  filter === key
                    ? 'border-brass bg-brass/15 text-brass'
                    : 'border-rule text-muted hover:border-brass/60 hover:text-parchment'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          {/* Inline new-note editor */}
          {editingId === 'new' && (
            <div className="mb-6 rounded-xl border border-brass/40 bg-panel p-4" data-color-mode="dark">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brass/70">New note</p>
              <input
                ref={titleInputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                placeholder="Title (optional)"
                className="mb-3 w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
              />
              <MDEditor value={editBody} onChange={(v) => setEditBody(v || '')} height={220} preview="edit" />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={cancelEdit} className="text-xs text-muted hover:text-parchment">
                  cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || !editBody.trim()}
                  className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Inline edit-existing editor */}
          {editingId && editingId !== 'new' && (
            <div className="mb-6 rounded-xl border border-brass/40 bg-panel p-4" data-color-mode="dark">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brass/70">Editing note</p>
              <input
                ref={titleInputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                placeholder="Title (optional)"
                className="mb-3 w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
              />
              <MDEditor value={editBody} onChange={(v) => setEditBody(v || '')} height={220} preview="edit" />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={cancelEdit} className="text-xs text-muted hover:text-parchment">
                  cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || !editBody.trim()}
                  className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Note cards */}
          {loading ? (
            <p className="py-12 text-center text-sm text-muted">Loading…</p>
          ) : displayNotes.length === 0 ? (
            <div className="py-16 text-center">
              <StickyNote size={32} className="mx-auto mb-3 text-muted/40" strokeWidth={1} />
              <p className="font-display text-lg text-parchment">
                {filter !== 'all' ? 'No notes in this category' : 'No notes yet'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {filter !== 'all'
                  ? 'Switch to All to see all your notes.'
                  : 'Notes you create in the Cell, Scriptoriums, or here will appear in this list.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayNotes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  isEditing={editingId === n.id}
                  onView={() => setViewingNote(n)}
                  onEdit={() => startEdit(n)}
                  onDelete={() => remove(n.id)}
                  onOpenInCell={isBibleRef(n.reference) ? () => onOpenInCell?.(n.reference) : null}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {viewingNote && (
        <NoteModal
          note={viewingNote}
          onClose={() => setViewingNote(null)}
          onEdit={() => startEdit(viewingNote)}
          onDelete={() => remove(viewingNote.id)}
          onOpenInCell={isBibleRef(viewingNote.reference) ? () => onOpenInCell?.(viewingNote.reference) : null}
        />
      )}
    </div>
  );
}

function NoteCard({ note, isEditing, onView, onEdit, onDelete, onOpenInCell }) {
  const displayBody = stripLeadingHeading(note.body);
  const title = cleanTitle(note.title) || note.reference || 'Untitled';

  return (
    <div
      className={`group relative flex flex-col rounded-xl border bg-panel p-4 transition-colors ${
        isEditing ? 'border-brass/60' : 'border-rule hover:border-brass/50'
      }`}
    >
      <button className="flex-1 text-left" onClick={onView}>
        <p className="line-clamp-2 font-display text-base leading-snug text-parchment group-hover:text-brass">
          {title}
        </p>
        {note.fromAssistant && (
          <span className="mt-1 inline-flex items-center gap-1 font-ui text-[10px] text-pageMuted">
            <Bot size={9} />
            AI generated
          </span>
        )}
        {isBibleRef(note.reference) && !note.fromAssistant && (
          <p className="mt-0.5 font-mono text-xs text-muted">{note.reference}</p>
        )}
        {displayBody && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-parchment/60">{displayBody}</p>
        )}
      </button>

      {/* Action row */}
      <div className="mt-3 flex items-center gap-2 border-t border-rule pt-2">
        {onOpenInCell && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenInCell(); }}
            className="flex items-center gap-1 text-[10px] text-muted hover:text-parchment"
            title="Open passage in Cell"
          >
            <ExternalLink size={10} />
            Open in Cell
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-[10px] text-muted opacity-0 transition-opacity hover:text-parchment group-hover:opacity-100"
        >
          edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-[10px] text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
          title="Delete note"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

function NoteModal({ note, onClose, onEdit, onDelete, onOpenInCell }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const displayBody = stripLeadingHeading(note.body);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 sm:items-center sm:justify-center sm:px-6 sm:py-10"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-page shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-xl sm:border sm:border-pageBorder"
        onClick={(e) => e.stopPropagation()}
        data-color-mode="light"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-pageBorder px-6 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="font-display text-xl leading-snug text-pageText">
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
          <div className="flex shrink-0 items-center gap-3">
            {onOpenInCell && (
              <button
                onClick={onOpenInCell}
                className="flex items-center gap-1 text-xs text-pageMuted hover:text-pageText"
              >
                <ExternalLink size={12} /> Open in Cell
              </button>
            )}
            <button onClick={onEdit} className="text-xs text-pageMuted hover:text-pageText">
              edit
            </button>
            <button onClick={onDelete} className="text-xs text-pageMuted hover:text-red-600">
              delete
            </button>
            <button onClick={onClose} className="text-xs text-pageMuted hover:text-pageText">
              close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="markdown-body markdown-body-page text-sm leading-relaxed text-pageText">
            <Markdown remarkPlugins={[remarkGfm]}>{displayBody}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}

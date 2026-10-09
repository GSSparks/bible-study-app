import { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

/** Strip a leading markdown heading line if it duplicates the note's
 *  title — AI-generated notes write the title both as a field and as
 *  the first line of the body (`# Title`), causing it to render twice. */
function stripLeadingHeading(body) {
  return body.replace(/^#{1,6}\s+.+\n?/, '').trim();
}

/** AI-generated notes sometimes store the title as `# My Title`, leaving
 *  the raw `#` visible when the field is rendered as plain text. */
function cleanTitle(title) {
  return title?.replace(/^#{1,6}\s+/, '').trim() ?? title;
}

export default function NotesSidebar({ reference, module, isLoggedIn }) {
  const [tab, setTab] = useState(reference ? 'passage' : 'all');
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [viewingNote, setViewingNote] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);

  function refresh() {
    setError(null);
    if (tab === 'passage') {
      if (!reference) return setNotes([]);
      api.listNotes({ reference }).then(setNotes).catch((e) => setError(e.message));
    } else {
      api.listNotes({ q: query || undefined }).then(setNotes).catch((e) => setError(e.message));
    }
  }

  useEffect(refresh, [tab, reference]);
  useEffect(() => {
    if (tab !== 'all') return;
    const t = setTimeout(refresh, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function startNew() {
    setEditingId('new');
    setViewingNote(null);
    setTitle('');
    setBody('');
  }

  function startEdit(note) {
    setEditingId(note.id);
    setViewingNote(null);
    setTitle(note.title || '');
    setBody(note.body);
  }

  async function save() {
    if (!body.trim()) return;
    try {
      if (editingId === 'new') {
        const payload = { title: title || null, body };
        if (tab === 'passage' && reference) {
          payload.reference = reference;
          payload.module = module;
        }
        await api.createNote(payload);
      } else {
        await api.updateNote(editingId, { title: title || null, body });
      }
      setEditingId(null);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    try {
      await api.deleteNote(id);
      if (viewingNote?.id === id) setViewingNote(null);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="mb-2 font-display text-lg text-parchment">Notes</p>
        <p className="text-sm text-muted">Log in to create and view personal notes.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-color-mode="dark">
      {/* Tab bar + new button */}
      <div className="mb-4 flex items-end justify-between border-b border-rule">
        <div className="flex gap-4 text-sm">
          {reference && (
            <button
              onClick={() => setTab('passage')}
              className={`pb-3 ${tab === 'passage' ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              This passage
            </button>
          )}
          <button
            onClick={() => setTab('all')}
            className={`pb-3 ${tab === 'all' ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
          >
            All notes
          </button>
        </div>
        <button
          onClick={startNew}
          className="mb-3 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
        >
          + new note
        </button>
      </div>

      {tab === 'all' && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          className="mb-4 rounded-lg border border-rule bg-panel px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
        />
      )}
      {tab === 'passage' && !reference && (
        <p className="text-sm text-muted">Open a passage to see notes here.</p>
      )}

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {/* Inline editor for new / editing */}
      {editingId && (
        <div className="mb-4 rounded-xl border border-rule bg-panel p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mb-3 w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
          />
          <MDEditor value={body} onChange={(v) => setBody(v || '')} height={220} preview="edit" />
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setEditingId(null)} className="text-xs text-muted hover:text-parchment">
              cancel
            </button>
            <button onClick={save} className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass">
              save
            </button>
          </div>
        </div>
      )}

      {/* Note cards — click to view, double-click to edit */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {notes.map((n) => {
          const displayBody = stripLeadingHeading(n.body);
          return (
            <div
              key={n.id}
              className="group cursor-pointer rounded-xl border border-rule bg-panel px-4 py-3 transition-colors hover:border-brass/50"
              onClick={() => setViewingNote(n)}
              onDoubleClick={(e) => { e.preventDefault(); startEdit(n); }}
              title="Click to read · Double-click to edit"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-display text-base leading-snug text-parchment">
                  {cleanTitle(n.title) || n.reference || 'Untitled'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); startEdit(n); }}
                  className="shrink-0 text-xs text-muted opacity-0 hover:text-parchment group-hover:opacity-100"
                >
                  edit
                </button>
              </div>
              {(n.reference || n.fromAssistant) && (
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {n.reference}
                  {n.reference && n.fromAssistant && ' · '}
                  {n.fromAssistant && 'from assistant'}
                </p>
              )}
              {displayBody && (
                <div className="markdown-body mt-2 line-clamp-3 text-sm text-parchment/70">
                  <Markdown remarkPlugins={[remarkGfm]}>{displayBody}</Markdown>
                </div>
              )}
            </div>
          );
        })}
        {notes.length === 0 && !editingId && (
          <p className="py-12 text-center text-sm text-muted">
            {tab === 'all' ? 'No notes yet.' : 'No notes on this passage yet.'}
          </p>
        )}
      </div>

      {/* Note reader modal */}
      {viewingNote && (
        <NoteModal
          note={viewingNote}
          onClose={() => setViewingNote(null)}
          onEdit={() => startEdit(viewingNote)}
          onDelete={() => remove(viewingNote.id)}
        />
      )}
    </div>
  );
}

function NoteModal({ note, onClose, onEdit, onDelete }) {
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
        {/* Modal header */}
        <div className="flex shrink-0 items-start justify-between border-b border-pageBorder px-6 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="font-display text-xl leading-snug text-pageText">
              {cleanTitle(note.title) || note.reference || 'Untitled'}
            </h2>
            {(note.reference || note.fromAssistant) && (
              <p className="mt-1 font-mono text-xs text-pageMuted">
                {note.reference}
                {note.reference && note.fromAssistant && ' · '}
                {note.fromAssistant && 'from assistant'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={onEdit} className="text-xs text-pageMuted hover:text-pageText">edit</button>
            <button onClick={onDelete} className="text-xs text-pageMuted hover:text-red-600">delete</button>
            <button onClick={onClose} className="text-xs text-pageMuted hover:text-pageText">close</button>
          </div>
        </div>

        {/* Modal body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="markdown-body markdown-body-page text-sm leading-relaxed text-pageText">
            <Markdown remarkPlugins={[remarkGfm]}>{displayBody}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}

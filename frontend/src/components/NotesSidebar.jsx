import { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

/** Notes are either anchored to the current passage or freestanding
 * (a personal study journal, not tied to any reference) — the "This
 * passage" / "All notes" tabs switch between those views, and both use
 * the same rich markdown editor and are both searchable. */
export default function NotesSidebar({ reference, module, isLoggedIn }) {
  const [tab, setTab] = useState('passage'); // 'passage' | 'all'
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null); // note id, or 'new'
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
    const t = setTimeout(refresh, 200); // light debounce while typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function startNew() {
    setEditingId('new');
    setTitle('');
    setBody('');
  }

  function startEdit(note) {
    setEditingId(note.id);
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
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  // Placed after every hook above (Rules of Hooks) — refresh() still
  // fires even in this state (via the useEffect above), but its result
  // is never rendered here, so it just fails silently in the background
  // rather than causing a visible bug.
  if (!isLoggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="mb-2 font-display text-lg text-parchment">Notes</p>
        <p className="text-sm text-muted">Log in to create and view personal notes.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4" data-color-mode="dark">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg text-parchment">Notes</h3>
        <button onClick={startNew} className="rounded bg-brass/90 px-2 py-1 text-xs font-medium text-ink hover:bg-brass">
          + new
        </button>
      </div>

      <div className="mb-3 flex border-b border-rule text-xs">
        <button
          onClick={() => setTab('passage')}
          className={`px-3 py-2 ${tab === 'passage' ? 'border-b-2 border-brass text-parchment' : 'text-muted'}`}
        >
          This passage
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-3 py-2 ${tab === 'all' ? 'border-b-2 border-brass text-parchment' : 'text-muted'}`}
        >
          All notes
        </button>
      </div>

      {tab === 'all' && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your notes…"
          className="mb-3 rounded-md border border-rule bg-ink px-3 py-2 text-sm placeholder:text-muted focus:border-brass"
        />
      )}
      {tab === 'passage' && !reference && <p className="text-sm text-muted">Open a passage to see notes here.</p>}

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {editingId && (
        <div className="mb-3 rounded-md border border-rule p-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mb-2 w-full rounded border border-rule bg-ink px-2 py-1.5 text-sm placeholder:text-muted"
          />
          <MDEditor value={body} onChange={(v) => setBody(v || '')} height={200} preview="edit" />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setEditingId(null)} className="text-xs text-muted hover:text-parchment">
              cancel
            </button>
            <button onClick={save} className="rounded bg-verdigris/80 px-3 py-1 text-xs text-parchment hover:bg-verdigris">
              save
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {notes.map((n) => (
          <div key={n.id} className="rounded-md border border-rule px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => startEdit(n)} className="truncate text-left font-medium text-parchment hover:text-brass">
                {n.title || n.reference || 'Untitled'}
              </button>
              <button onClick={() => remove(n.id)} className="shrink-0 text-xs text-muted hover:text-red-400">
                delete
              </button>
            </div>
            {(n.reference || n.fromAssistant) && (
              <div className="text-xs text-muted">
                {n.reference}
                {n.reference && n.fromAssistant && ' · '}
                {n.fromAssistant && 'from assistant'}
              </div>
            )}
            <div className="markdown-body mt-1 text-parchment/90">
              <Markdown remarkPlugins={[remarkGfm]}>{n.body}</Markdown>
            </div>
          </div>
        ))}
        {notes.length === 0 && !editingId && (
          <p className="text-sm text-muted">No notes {tab === 'all' ? 'yet' : 'on this passage yet'}.</p>
        )}
      </div>
    </div>
  );
}
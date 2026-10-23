import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { List, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../api/client.js';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const DEBOUNCE_MS = 2000;

export default function CellNotePane({ isLoggedIn = false }) {
  const [notes, setNotes] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [listVisible, setListVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);

  const debounceTimer = useRef(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setLoadingList(true);
    api
      .listNotes()
      .then((res) => {
        if (cancelled) return;
        setNotes(res);
        if (res.length > 0) {
          setSelectedId(res[0].id);
          setTitle(res[0].title || '');
          setBody(res[0].body || '');
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current);
      if (dirtyRef.current && selectedId) {
        api.updateNote(selectedId, { title: title || null, body }).catch(() => {});
      }
    };
  }, [selectedId, title, body]);

  const doSave = useCallback(async (noteId, saveTitle, saveBody) => {
    if (!noteId || !saveBody) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateNote(noteId, { title: saveTitle || null, body: saveBody });
      dirtyRef.current = false;
      setDirty(false);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, title: saveTitle || null, updatedAt: new Date().toISOString() } : n
        )
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const scheduleSave = useCallback((noteId, saveTitle, saveBody) => {
    if (!noteId || !saveBody) return;
    dirtyRef.current = true;
    setDirty(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      doSave(noteId, saveTitle, saveBody);
    }, DEBOUNCE_MS);
  }, [doSave]);

  async function toggleList() {
    if (listVisible) {
      setListVisible(false);
      return;
    }
    setListVisible(true);
    setLoadingList(true);
    try {
      const res = await api.listNotes();
      setNotes(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingList(false);
    }
  }

  function selectNote(id) {
    // Flush pending auto-save before switching
    if (dirtyRef.current && selectedId && selectedId !== id) {
      clearTimeout(debounceTimer.current);
      api.updateNote(selectedId, { title: title || null, body }).catch(() => {});
      dirtyRef.current = false;
    }
    setSelectedId(id);
    const note = notes.find((n) => n.id === id);
    if (note) {
      setTitle(note.title || '');
      setBody(note.body || '');
    } else {
      setTitle('');
      setBody('');
    }
    setDirty(false);
  }

  async function handleManualSave() {
    if (!selectedId || !body) return;
    clearTimeout(debounceTimer.current);
    await doSave(selectedId, title, body);
  }

  async function createNote() {
    if (!isLoggedIn) return;
    try {
      const created = await api.createNote({ title: null, body: ' ' });
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setTitle('');
      setBody('');
      setDirty(false);
      setListVisible(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteNote(id) {
    if (id === selectedId) {
      setSelectedId(null);
      setTitle('');
      setBody('');
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDirty(false);
    try {
      await api.deleteNote(id);
    } catch (e) {
      setError(e.message);
    }
  }

  function handleTitleChange(e) {
    const v = e.target.value;
    setTitle(v);
    if (selectedId) scheduleSave(selectedId, v, body);
  }

  function handleBodyChange(v) {
    const val = v || '';
    setBody(val);
    if (selectedId) scheduleSave(selectedId, title, val);
  }

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [notes]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-rule bg-ink px-3 py-2">
        <button
          onClick={toggleList}
          title={listVisible ? 'Hide notes list' : 'Show notes list'}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            listVisible ? 'bg-verdigris/20 text-brass' : 'text-muted hover:text-parchment'
          }`}
        >
          <List size={14} />
        </button>

        <div className="min-w-0 flex-1">
          {selectedId ? (
            <input
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled note…"
              className="w-full bg-transparent text-sm font-medium text-parchment placeholder:text-muted focus:outline-none"
            />
          ) : (
            <span className="text-sm text-muted">Study Notes</span>
          )}
        </div>

        <button
          onClick={handleManualSave}
          disabled={!selectedId || !dirty || saving}
          title="Save now"
          className={`flex h-7 items-center gap-1 rounded px-2 text-xs transition-colors ${
            saving ? 'text-brass' : dirty ? 'text-brass hover:bg-verdigris/20' : 'text-muted/40'
          }`}
        >
          <Save size={13} className={saving ? 'animate-pulse' : ''} />
          {saving ? 'Saving…' : 'Save'}
        </button>

        <button
          onClick={createNote}
          title="New note"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:text-brass"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-page text-pageText">
        {/* Editor */}
        <div className="h-full min-h-0" data-color-mode="light">
          {error && <p className="absolute top-2 left-4 z-10 text-sm text-red-600">{error}</p>}

          {!selectedId && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-pageMuted">
              <p className="text-sm">No note selected.</p>
              <button
                onClick={createNote}
                className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-parchment hover:bg-panel"
              >
                Create a note
              </button>
            </div>
          )}

          {selectedId && (
            <MDEditor
              value={body}
              onChange={handleBodyChange}
              height="100%"
              preview="edit"
            />
          )}
        </div>

        {/* List overlay */}
        {listVisible && (
          <>
            <div className="absolute inset-0 z-10 bg-black/20" onClick={() => setListVisible(false)} />
            <div className="absolute bottom-0 left-0 top-0 z-20 w-72 overflow-hidden border-r border-rule bg-ink shadow-xl">
              <div className="flex items-center justify-between border-b border-rule/40 px-3 py-2">
                <p className="font-ui text-[10px] uppercase tracking-widest text-muted">Notes</p>
                <button onClick={() => setListVisible(false)} className="rounded p-0.5 text-muted hover:text-parchment">
                  <X size={12} />
                </button>
              </div>
              <div className="h-[calc(100%-2.5rem)] overflow-y-auto">
                {loadingList && <p className="px-3 py-3 text-xs text-muted">Loading…</p>}
                {!loadingList && sortedNotes.length === 0 && (
                  <p className="px-3 py-3 text-xs text-muted">No notes yet.</p>
                )}
                {sortedNotes.map((n) => (
                  <div
                    key={n.id}
                    className={`group flex cursor-pointer items-center gap-2 border-b border-rule/20 px-3 py-2 transition-colors ${
                      selectedId === n.id ? 'bg-verdigris/15' : 'hover:bg-panel'
                    }`}
                    onClick={() => { selectNote(n.id); setListVisible(false); }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${selectedId === n.id ? 'text-brass' : 'text-parchment/90'}`}>
                        {n.title || 'Untitled'}
                      </p>
                      <p className="truncate text-[10px] text-muted">
                        {n.body?.slice(0, 60) || 'Empty'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                      className="shrink-0 rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}   

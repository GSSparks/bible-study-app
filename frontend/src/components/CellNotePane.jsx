import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { ChevronDown, Plus, Save, Trash2, Download } from 'lucide-react';
import { api } from '../api/client.js';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const DEBOUNCE_MS = 2000;

export default function CellNotePane({ isLoggedIn = false, focusedReference = null }) {
  const [generalNotes, setGeneralNotes] = useState([]);
  const [passageNotes, setPassageNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState('notes'); // 'notes' | 'passage'
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectorRef = useRef(null);

  const selectedIdRef = useRef(null);
  const titleRef = useRef('');
  const bodyRef = useRef('');
  const dirtyRef = useRef(false);
  const debounceTimer = useRef(null);
  const lastGeneralIdRef = useRef(null);
  const lastPassageIdRef = useRef(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadNotes = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const all = await api.listNotes();
      setGeneralNotes(
        all
          .filter((n) => !n.reference && !(n.tags || []).includes('personal-commentary') && !n.fromAssistant)
          .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      );
      setPassageNotes(
        all
          .filter((n) => (n.tags || []).includes('personal-commentary') && n.reference)
          .sort((a, b) => (a.reference || '').localeCompare(b.reference || ''))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // ── Note selection helpers ─────────────────────────────────────────────────

  function applyNote(note) {
    setSelectedId(note.id);
    selectedIdRef.current = note.id;
    setTitle(note.title || '');
    setBody(note.body || '');
    titleRef.current = note.title || '';
    bodyRef.current = note.body || '';
    setDirty(false);
    dirtyRef.current = false;
  }

  function clearNote() {
    setSelectedId(null);
    selectedIdRef.current = null;
    setTitle('');
    setBody('');
    titleRef.current = '';
    bodyRef.current = '';
    setDirty(false);
    dirtyRef.current = false;
  }

  function flushIfDirty() {
    if (dirtyRef.current && selectedIdRef.current) {
      clearTimeout(debounceTimer.current);
      api.updateNote(selectedIdRef.current, { title: titleRef.current || null, body: bodyRef.current }).catch(() => {});
      dirtyRef.current = false;
    }
  }

  function selectNote(id) {
    if (id === selectedId) return;
    flushIfDirty();
    const note = [...generalNotes, ...passageNotes].find((n) => n.id === id);
    if (note) applyNote(note);
  }

  // ── Mode switching ─────────────────────────────────────────────────────────

  function handleModeSwitch(newMode) {
    if (newMode === mode) return;
    flushIfDirty();
    // Remember what was open before switching away
    if (mode === 'notes') lastGeneralIdRef.current = selectedIdRef.current;
    if (mode === 'passage') lastPassageIdRef.current = selectedIdRef.current;
    setMode(newMode);
    if (newMode === 'passage') {
      // Prefer the note for the current passage; fall back to last selected passage note
      const byRef = focusedReference ? passageNotes.find((n) => n.reference === focusedReference) : null;
      const byLast = lastPassageIdRef.current ? passageNotes.find((n) => n.id === lastPassageIdRef.current) : null;
      const target = byRef || byLast;
      target ? applyNote(target) : clearNote();
    } else {
      // Restore the last open general note, or fall back to most recent
      const byLast = lastGeneralIdRef.current ? generalNotes.find((n) => n.id === lastGeneralIdRef.current) : null;
      const target = byLast || (generalNotes.length > 0 ? generalNotes[0] : null);
      target ? applyNote(target) : clearNote();
    }
  }

  // Auto-switch passage note when focusedReference changes (passage mode only, no unsaved changes)
  useEffect(() => {
    if (mode !== 'passage' || !focusedReference) return;
    if (dirtyRef.current) return; // don't interrupt mid-edit
    const match = passageNotes.find((n) => n.reference === focusedReference);
    if (match && match.id !== selectedIdRef.current) applyNote(match);
    else if (!match && selectedIdRef.current) clearNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedReference, passageNotes, mode]);

  // ── Unmount flush ──────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current);
      if (dirtyRef.current && selectedIdRef.current) {
        api.updateNote(selectedIdRef.current, { title: titleRef.current || null, body: bodyRef.current }).catch(() => {});
      }
    };
  }, []);

  // ── Click-outside to close selector ───────────────────────────────────────

  useEffect(() => {
    if (!selectorOpen) return;
    function handleClick(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        setSelectorOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectorOpen]);

  // ── Save logic ─────────────────────────────────────────────────────────────

  const doSave = useCallback(async (noteId, saveTitle, saveBody) => {
    if (!noteId || saveBody === undefined) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateNote(noteId, { title: saveTitle || null, body: saveBody });
      dirtyRef.current = false;
      setDirty(false);
      setGeneralNotes((prev) => prev.some((n) => n.id === noteId) ? prev.map((n) => n.id === noteId ? { ...n, ...updated } : n) : prev);
      setPassageNotes((prev) => prev.some((n) => n.id === noteId) ? prev.map((n) => n.id === noteId ? { ...n, ...updated } : n) : prev);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const scheduleSave = useCallback((noteId, newTitle, newBody) => {
    if (!noteId) return;
    dirtyRef.current = true;
    setDirty(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSave(noteId, newTitle, newBody), DEBOUNCE_MS);
  }, [doSave]);

  function handleTitleChange(e) {
    const v = e.target.value;
    setTitle(v);
    titleRef.current = v;
    if (selectedId) scheduleSave(selectedId, v, body);
  }

  function handleBodyChange(v) {
    const val = v || '';
    setBody(val);
    bodyRef.current = val;
    if (selectedId) scheduleSave(selectedId, title, val);
  }

  async function handleManualSave() {
    if (!selectedId) return;
    clearTimeout(debounceTimer.current);
    await doSave(selectedId, title, body);
  }

  // ── Create / Delete ────────────────────────────────────────────────────────

  async function createNote() {
    if (!isLoggedIn) return;
    try {
      let created;
      if (mode === 'passage' && focusedReference) {
        const existing = passageNotes.find((n) => n.reference === focusedReference);
        if (existing) { applyNote(existing); return; }
        created = await api.createNote({
          reference: focusedReference,
          title: `Note on ${focusedReference}`,
          body: '',
          tags: ['personal-commentary'],
        });
        setPassageNotes((prev) => [created, ...prev].sort((a, b) => (a.reference || '').localeCompare(b.reference || '')));
      } else {
        created = await api.createNote({ title: null, body: '' });
        setGeneralNotes((prev) => [created, ...prev]);
      }
      applyNote(created);
      setSelectorOpen(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteNote(id) {
    if (id === selectedId) clearNote();
    setGeneralNotes((prev) => prev.filter((n) => n.id !== id));
    setPassageNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.deleteNote(id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleExport() {
    if (!selectedId) return;
    const filename = `${(title || 'untitled').replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'note'}.md`;
    const blob = new Blob([body], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Filtered list for selector ─────────────────────────────────────────────

  const activeNotes = mode === 'passage' ? passageNotes : generalNotes;

  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return activeNotes;
    return activeNotes.filter((n) => {
      const ref = (n.reference || '').toLowerCase();
      const t = (n.title || '').toLowerCase();
      const b = (n.body || '').toLowerCase();
      return ref.includes(q) || t.includes(q) || b.includes(q);
    });
  }, [activeNotes, search]);

  const selectedNote = [...generalNotes, ...passageNotes].find((n) => n.id === selectedId);
  const selectorLabel = selectedNote
    ? (mode === 'passage'
        ? selectedNote.reference || selectedNote.title || 'Untitled'
        : selectedNote.title || 'Untitled')
    : (mode === 'passage' ? 'Select passage note…' : 'Select note…');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-rule bg-ink px-3 py-2">

        {/* Mode toggle */}
        <div className="flex shrink-0 overflow-hidden rounded border border-rule text-xs">
          <button
            onClick={() => handleModeSwitch('notes')}
            className={`px-2.5 py-1 transition-colors ${mode === 'notes' ? 'bg-brass/20 text-brass' : 'text-muted hover:text-parchment'}`}
          >
            Notes
          </button>
          <button
            onClick={() => handleModeSwitch('passage')}
            className={`border-l border-rule px-2.5 py-1 transition-colors ${mode === 'passage' ? 'bg-brass/20 text-brass' : 'text-muted hover:text-parchment'}`}
          >
            Passage
          </button>
        </div>

        {/* Searchable note selector */}
        <div className="relative min-w-0 flex-1" ref={selectorRef}>
          <button
            onClick={() => { setSelectorOpen((o) => !o); setSearch(''); }}
            className="flex w-full items-center gap-1 text-left"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-parchment/80 hover:text-parchment">
              {selectorLabel}
            </span>
            <ChevronDown size={12} className="shrink-0 text-muted" />
          </button>

          {selectorOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded border border-rule bg-ink shadow-xl">
              <div className="border-b border-rule/40 px-3 py-2">
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full bg-transparent text-xs text-parchment placeholder:text-muted focus:outline-none"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loading && <p className="px-3 py-3 text-xs text-muted">Loading…</p>}
                {!loading && filteredNotes.length === 0 && (
                  <p className="px-3 py-3 text-xs text-muted">No notes found.</p>
                )}
                {filteredNotes.map((n) => (
                  <div
                    key={n.id}
                    className={`group flex cursor-pointer items-center gap-2 border-b border-rule/20 px-3 py-2 transition-colors ${
                      selectedId === n.id ? 'bg-verdigris/15' : 'hover:bg-panel'
                    }`}
                    onClick={() => { selectNote(n.id); setSelectorOpen(false); setSearch(''); }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-medium ${selectedId === n.id ? 'text-brass' : 'text-parchment/90'}`}>
                        {mode === 'passage' ? (n.reference || 'No reference') : (n.title || 'Untitled')}
                      </p>
                      {mode === 'passage' && n.title && n.title !== `Note on ${n.reference}` && (
                        <p className="truncate text-[10px] text-muted">{n.title}</p>
                      )}
                      {mode === 'notes' && (
                        <p className="truncate text-[10px] text-muted">{n.body?.slice(0, 60) || 'Empty'}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                      className="shrink-0 rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={handleExport}
          disabled={!selectedId || !body}
          title="Export as .md"
          className="flex h-7 w-7 items-center justify-center rounded text-muted hover:text-brass disabled:opacity-40"
        >
          <Download size={14} />
        </button>
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
          title={mode === 'passage' && focusedReference ? `New note for ${focusedReference}` : 'New note'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:text-brass"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Title row for selected note */}
      {selectedId && (
        <div className="shrink-0 border-b border-rule bg-ink px-3 py-1.5">
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled note…"
            className="w-full bg-transparent text-sm font-medium text-parchment placeholder:text-muted focus:outline-none"
          />
        </div>
      )}

      {/* Body */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-page text-pageText">
        <div className="h-full min-h-0" data-color-mode="light">
          {error && <p className="absolute left-4 top-2 z-10 text-sm text-red-600">{error}</p>}

          {!selectedId && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-pageMuted">
              <p className="text-sm">No note selected.</p>
              <button
                onClick={createNote}
                className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-parchment hover:bg-panel"
              >
                {mode === 'passage' && focusedReference
                  ? `Create note for ${focusedReference}`
                  : 'Create a note'}
              </button>
            </div>
          )}

          {selectedId && (
            <MDEditor value={body} onChange={handleBodyChange} height="100%" preview="edit" />
          )}
        </div>
      </div>
    </div>
  );
}

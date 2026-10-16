import { useEffect, useRef, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { ArrowUpRight, X } from 'lucide-react';
import { api } from '../api/client.js';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

export default function NotePanel({ open, onClose, isLoggedIn, onOpenInNotes }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const titleRef = useRef(null);

  // Focus title when panel opens for a new note
  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 300);
  }, [open]);

  async function handleSave() {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createNote({ title: title.trim() || null, body });
      setSavedId(created.id);
      setTitle('');
      setBody('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleOpenInNotes() {
    onOpenInNotes?.();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel — always mounted so content persists while sliding out */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-page shadow-2xl transition-transform duration-300 ease-in-out sm:w-[600px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-pageBorder px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-pageMuted">Quick Note</span>
            <div className="flex items-center gap-2">
              {isLoggedIn && (
                <button
                  onClick={handleOpenInNotes}
                  className="flex items-center gap-1 text-xs text-pageMuted hover:text-pageAccent"
                  title="Go to Notes"
                >
                  <ArrowUpRight size={13} />
                  All notes
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !body.trim() || !isLoggedIn}
                className="rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={onClose} className="rounded p-1 text-pageMuted hover:text-pageText">
                <X size={16} />
              </button>
            </div>
          </div>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          {savedId && !error && (
            <p className="mt-1 text-xs text-pageAccent">
              Saved!{' '}
              <button onClick={handleOpenInNotes} className="underline hover:text-pageText">
                view in Notes →
              </button>
            </p>
          )}
        </div>

        {/* Body */}
        {isLoggedIn ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5" data-color-mode="light">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
              placeholder="Title (optional)"
              className="mb-4 w-full bg-transparent font-display text-2xl text-pageText placeholder:text-pageMuted/40 focus:outline-none"
            />
            <MDEditor
              value={body}
              onChange={(v) => { setBody(v || ''); setSavedId(null); }}
              height={500}
              preview="edit"
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-pageMuted">Log in to create notes.</p>
          </div>
        )}
      </div>
    </>
  );
}

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';

export default function SelectionNotePopup({ quote, reference, module, x, y, onClose }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createNote({ quote, body, reference: reference || null, module: module || null, tags: ['selection'] });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const style = {
    left: Math.min(x, window.innerWidth - 340),
    top: Math.min(y, window.innerHeight - 280),
  };

  return createPortal(
    <div className="fixed z-40 w-80 rounded-lg border border-rule bg-panel p-3 shadow-2xl" style={style}>
      <blockquote className="mb-2 border-l-2 border-verdigris pl-2 text-xs italic text-muted line-clamp-4">
        {quote}
      </blockquote>
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Your note on this…"
        rows={3}
        className="mb-2 w-full rounded border border-rule bg-ink px-2 py-1.5 text-sm text-parchment placeholder:text-muted focus:border-brass"
      />
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
          cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !body.trim()}
          className="rounded bg-brass/90 px-3 py-1 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
        >
          {saving ? 'saving…' : 'save note'}
        </button>
      </div>
    </div>,
    document.body
  );
}

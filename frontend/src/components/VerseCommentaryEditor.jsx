import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';

export default function VerseCommentaryEditor({ reference, x, y, onClose, onSaved, initialQuote }) {
  const [tab, setTab] = useState('write');
  const [title, setTitle] = useState(`Note on ${reference}`);
  const [body, setBody] = useState('');
  const [entryId, setEntryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCommentaryEntry(reference)
      .then((entry) => {
        if (entry) {
          setEntryId(entry.id);
          setTitle(entry.title);
          setBody(entry.bodyMd || '');
        } else if (initialQuote) {
          setBody(`> "${initialQuote}"\n\n`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reference]);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveCommentaryNote({ reference, title: title.trim() || `Note on ${reference}`, bodyMd: body });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  }

  const style = {
    left: Math.min(x, window.innerWidth - 520),
    top: Math.min(y, window.innerHeight - 420),
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="fixed z-40 flex w-[500px] flex-col rounded-lg border border-rule bg-panel shadow-2xl"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-rule px-3 py-2">
          <span className="font-mono text-xs text-verdigris">{reference}</span>
          <span className="text-xs text-muted">→ My Studies</span>
          <button
            onClick={onClose}
            className="ml-auto rounded px-1 py-0.5 text-xs text-muted hover:text-parchment"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div className="shrink-0 border-b border-rule px-3 py-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-parchment placeholder:text-muted focus:outline-none"
            placeholder="Title…"
          />
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-rule">
          {['write', 'preview'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs capitalize ${
                tab === t
                  ? 'border-b-2 border-brass text-parchment'
                  : 'text-muted hover:text-parchment'
              }`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto px-3 py-1.5 text-[10px] text-muted/50">Markdown</span>
        </div>

        {/* Editor / Preview */}
        <div className="h-52 min-h-0">
          {loading ? (
            <p className="px-3 py-3 text-xs text-muted">Loading…</p>
          ) : tab === 'write' ? (
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your commentary… Markdown supported.&#10;&#10;Cmd/Ctrl+Enter to save."
              className="h-full w-full resize-none bg-transparent px-3 py-2 font-mono text-sm leading-relaxed text-parchment placeholder:text-muted/50 focus:outline-none"
            />
          ) : (
            <div className="markdown-body markdown-body-page h-full overflow-y-auto px-3 py-2 text-sm text-pageText">
              {body.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              ) : (
                <p className="italic text-muted/60">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center border-t border-rule px-3 py-2">
          {error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : (
            <p className="text-[10px] text-muted/60">Appears in Commentary → My Studies</p>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
              cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !body.trim()}
              className="rounded bg-brass/90 px-3 py-1 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
            >
              {saving ? 'saving…' : entryId ? 'update' : 'save'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

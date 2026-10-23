import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';

/** Floating form to share a passage finding with a Study.
 *  Positioned near `x, y` (like VerseCommentaryEditor).
 *  Calls `onClose()` on cancel or after a successful submit. */
export default function ShareFindingModal({ reference, module, verseText, x, y, onClose, onShared }) {
  const [studies, setStudies] = useState(null); // null = loading
  const [studyId, setStudyId] = useState('');
  const [title, setTitle] = useState('');
  const quote = verseText ? `> ${verseText}\n\n` : '';
  const [body, setBody] = useState(quote);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    api.listMyStudies()
      .then((list) => {
        setStudies(list);
        if (list.length > 0) setStudyId(list[0].id);
      })
      .catch(() => setStudies([]));
  }, []);

  // Focus the textarea and place cursor at the end (after the pre-filled quote)
  useEffect(() => {
    if (studies !== null && bodyRef.current) {
      const el = bodyRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [studies]);

  // Close on outside click
  useEffect(() => {
    function onDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!studyId || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createStudyPost(studyId, { type: 'finding', reference, module: module || undefined, title: title.trim() || undefined, body: body.trim() });
      onShared?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to share finding.');
      setSubmitting(false);
    }
  }

  // Keep the panel inside the viewport
  const style = { position: 'fixed', zIndex: 50, left: Math.min(x, window.innerWidth - 340), top: Math.min(y, window.innerHeight - 280) };

  return createPortal(
    <div ref={panelRef} style={style} className="w-80 rounded-lg border border-rule bg-panel shadow-2xl">
      <div className="flex items-center justify-between border-b border-rule px-3 py-2">
        <span className="text-xs font-medium text-parchment">Share finding — <span className="text-brass">{reference}</span></span>
        <button onClick={onClose} className="text-muted hover:text-parchment">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="p-3 space-y-2">
        {studies === null ? (
          <p className="text-xs text-muted">Loading your studies…</p>
        ) : studies.length === 0 ? (
          <p className="text-xs text-muted">You're not participating in any studies yet.</p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs text-muted">Study</label>
              <select
                value={studyId}
                onChange={(e) => setStudyId(e.target.value)}
                className="w-full rounded border border-rule bg-ink px-2 py-1 text-xs text-parchment focus:border-brass focus:outline-none"
              >
                {studies.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Title <span className="text-muted/50">(optional)</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Key observation"
                className="w-full rounded border border-rule bg-ink px-2 py-1 text-xs text-parchment placeholder:text-muted/40 focus:border-brass focus:outline-none"
              />
            </div>
            {verseText && (
              <div className="rounded border border-rule/50 bg-white/5 px-2 py-1.5">
                <p className="text-xs leading-relaxed text-muted/80 italic">{verseText}</p>
                <p className="mt-0.5 text-right text-xs text-brass/70">{reference}</p>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-muted">Your note</label>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Share what you've discovered with your study group…"
                className="w-full resize-none rounded border border-rule bg-ink px-2 py-1 text-xs text-parchment placeholder:text-muted/40 focus:border-brass focus:outline-none"
                required
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded px-3 py-1 text-xs text-muted hover:text-parchment">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !body.trim()}
                className="rounded bg-brass px-3 py-1 text-xs font-medium text-ink hover:bg-brass/90 disabled:opacity-50"
              >
                {submitting ? 'Sharing…' : 'Share finding'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>,
    document.body
  );
}

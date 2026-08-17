import { createPortal } from 'react-dom';

/** Unlike StrongsPopup/VersePopup, this doesn't fetch anything — the
 * note's own text (already extracted server-side) is the entire
 * content, so this is just a small positioned card. */
export default function FootnotePopup({ text, x, y, onClose }) {
  const style = {
    left: Math.min(x, window.innerWidth - 300),
    top: Math.min(y, window.innerHeight - 150),
  };

  return createPortal(
    <>
      {/* Invisible full-screen catcher so clicking anywhere outside the
          popup closes it — same pattern as ContextZoomMenu/ModulePicker. */}
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="fixed z-30 w-72 rounded-lg border border-rule bg-panel p-3 shadow-2xl" style={style}>
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">Note</span>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        <p className="font-display text-sm text-parchment/90">{text}</p>
      </div>
    </>,
    document.body
  );
}
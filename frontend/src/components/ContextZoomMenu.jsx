import { createPortal } from 'react-dom';

/** Triggered either by a header button or by right-clicking the verse
 * text. Both land here so there's one implementation of the actual
 * zoom logic (in ReaderPane) regardless of how it was invoked. */
export default function ContextZoomMenu({ x, y, onSelectSection, onSelectChapter, onClose }) {
  const style = { top: y, left: Math.min(x, window.innerWidth - 230) };

  return createPortal(
    <>
      {/* Full-screen catcher so clicking (or right-clicking) anywhere
          outside the menu closes it, without needing a global listener. */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div className="fixed z-50 w-56 rounded-md border border-rule bg-panel py-1 shadow-2xl" style={style}>
        <button
          onClick={onSelectSection}
          className="block w-full px-3 py-2 text-left text-sm text-parchment/90 hover:bg-ink hover:text-brass"
        >
          Zoom out to this section
        </button>
        <button
          onClick={onSelectChapter}
          className="block w-full px-3 py-2 text-left text-sm text-parchment/90 hover:bg-ink hover:text-brass"
        >
          Show whole chapter
        </button>
      </div>
    </>,
    document.body
  );
}
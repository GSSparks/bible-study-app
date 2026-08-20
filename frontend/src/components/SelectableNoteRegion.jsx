import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SelectionNotePopup from './SelectionNotePopup.jsx';

export default function SelectableNoteRegion({ reference, module, className, onClick, onContextMenu, onMouseUp, children }) {
  const contentRef = useRef(null);
  const [selection, setSelection] = useState(null); // { text, x, y }
  const [showPopup, setShowPopup] = useState(false);

  /** Both the "+note" popup below and, separately, ReaderPane's phrase-
   * study toolbar need to react to the same underlying text-selection
   * event on this same div — but a DOM element can only have one
   * onMouseUp handler. This component's own note-selection logic runs
   * first (unchanged), then the externally-passed onMouseUp (if any) —
   * so a caller like ReaderPane can add its own selection handling
   * without needing to reimplement or replace this component's. */
  function handleMouseUp(e) {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || !sel.rangeCount || !contentRef.current?.contains(sel.anchorNode)) {
      setSelection(null);
    } else {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelection({ text, x: rect.left, y: rect.bottom + 6 });
    }
    onMouseUp?.(e);
  }

  function closePopup() {
    setShowPopup(false);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div ref={contentRef} className={className} onMouseUp={handleMouseUp} onClick={onClick} onContextMenu={onContextMenu}>
      {children}

      {selection &&
        !showPopup &&
        createPortal(
          <button
            onMouseDown={(e) => e.preventDefault()} // don't collapse the selection on click
            onClick={() => setShowPopup(true)}
            className="fixed z-40 rounded bg-brass px-2 py-1 text-xs font-medium text-ink shadow-lg hover:bg-brass/90"
            style={{ top: selection.y, left: selection.x }}
          >
            + note
          </button>,
          document.body
        )}

      {showPopup && selection && (
        <SelectionNotePopup
          quote={selection.text}
          reference={reference}
          module={module}
          x={selection.x}
          y={selection.y}
          onClose={closePopup}
        />
      )}
    </div>
  );
}
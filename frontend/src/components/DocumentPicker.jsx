import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';

/** Dropdown picker for uploaded documents — mirrors ModulePicker's UX
 * but fetches from the document library instead of installed SWORD modules. */
export default function DocumentPicker({ label, title, onSelect }) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState([]);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  function openDropdown() {
    const rect = btnRef.current.getBoundingClientRect();
    const width = 240;
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPos({ top: rect.bottom + 4, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    api.listDocuments().then(setDocs).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (e.target.closest('[data-doc-picker-list]')) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          open ? setOpen(false) : openDropdown();
        }}
        className="shrink-0 rounded px-1.5 py-1 text-xs text-muted hover:bg-ink hover:text-brass"
        title={title}
      >
        {label}
      </button>
      {open && createPortal(
        <div
          data-doc-picker-list
          className="fixed z-50 max-h-64 w-60 overflow-y-auto rounded-md border border-rule bg-panel shadow-2xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {docs.map((d) => (
            <button
              key={d.id}
              onClick={() => { onSelect(d.id, d.title); setOpen(false); }}
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-ink hover:text-brass"
            >
              <span className="truncate text-parchment/90">{d.title}</span>
              {d.author && <span className="ml-1.5 text-muted">— {d.author}</span>}
            </button>
          ))}
          {docs.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">No documents in library.</p>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

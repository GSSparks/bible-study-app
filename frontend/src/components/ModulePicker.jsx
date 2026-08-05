import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';

const TYPE_BY_KIND = { bible: 'BIBLE', commentary: 'COMMENTARY', dictionary: 'DICT' };

/** A small trigger button that opens a list of installed modules of the
 * given kind, rendered via a portal into document.body with fixed
 * positioning under the trigger. The portal matters: this used to render
 * as an absolutely-positioned dropdown nested inside panes that have
 * `overflow-hidden` (needed for their own scroll clipping), which cut
 * the list off almost entirely. Rendering into body sidesteps that. */
export default function ModulePicker({ kind, excludeModules = [], label, title, onSelect }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  function openDropdown() {
    const rect = btnRef.current.getBoundingClientRect();
    // Clamp so it doesn't run off the right edge for buttons near the
    // edge of the window (dictionary/commentary tiles can sit anywhere).
    const width = 224; // matches w-56 below
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPos({ top: rect.bottom + 4, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    api.listInstalledModules(TYPE_BY_KIND[kind]).then(setOptions).catch(() => {});
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (e.target.closest('[data-module-picker-list]')) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const available = options.filter((m) => !excludeModules.includes(m.name));

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
      {open &&
        createPortal(
          <div
            data-module-picker-list
            className="fixed z-50 max-h-64 w-56 overflow-y-auto rounded-md border border-rule bg-panel shadow-2xl"
            style={{ top: pos.top, left: pos.left }}
          >
            {available.map((m) => (
              <button
                key={m.name}
                onClick={() => {
                  onSelect(m.name, m.description || m.name);
                  setOpen(false);
                }}
                className="block w-full truncate px-3 py-1.5 text-left text-xs text-parchment/90 hover:bg-ink hover:text-brass"
              >
                {m.description || m.name}
              </button>
            ))}
            {available.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted">
                {options.length === 0 ? 'None installed — use Manage modules.' : 'Nothing else to pick.'}
              </p>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

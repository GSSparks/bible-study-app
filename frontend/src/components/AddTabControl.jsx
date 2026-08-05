import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const TYPE_BY_KIND = { bible: 'BIBLE', commentary: 'COMMENTARY', dictionary: 'DICT' };

/** The in-window "version selector": a small "+" that lists installed
 * modules of this window's kind (already-open ones excluded) and adds
 * the chosen one as a new tab. This is what puts translation/commentary
 * selection directly in the reading window instead of a separate
 * top-of-app control. */
export default function AddTabControl({ kind, existingModules, onAdd }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!open) return;
    api.listInstalledModules(TYPE_BY_KIND[kind]).then(setOptions).catch(() => {});
  }, [open, kind]);

  const available = options.filter((m) => !existingModules.includes(m.name));

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded px-2 py-1 text-xs text-muted hover:bg-ink hover:text-brass"
        title="Open another version as a tab"
      >
        +
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-56 w-56 overflow-y-auto rounded-md border border-rule bg-panel shadow-xl">
          {available.map((m) => (
            <button
              key={m.name}
              onClick={() => {
                onAdd(m.name, m.description || m.name);
                setOpen(false);
              }}
              className="block w-full truncate px-3 py-1.5 text-left text-xs text-parchment/90 hover:bg-ink hover:text-brass"
            >
              {m.description || m.name}
            </button>
          ))}
          {available.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">
              {options.length === 0 ? 'None installed — use Manage modules.' : 'All installed ones are already open.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

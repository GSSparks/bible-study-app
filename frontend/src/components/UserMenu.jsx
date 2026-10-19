import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function UserMenu({ username, items = [], onLogout }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  function toggle(e) {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();

    // Estimate menu height: header (~36) + items (~36 each) + logout (~40) + padding
    const estimatedHeight = 36 + items.length * 36 + 40 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < estimatedHeight;

    setPos(
      flip
      ? { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top + 6 }
      : { right: window.innerWidth - rect.right, top: rect.bottom + 6 }
    );
    setOpen(true);
  }

  return (
    <div className="relative">
    <button
    onClick={toggle}
    className="w-full rounded px-2 py-1.5 text-left text-sm text-muted hover:bg-panel hover:text-parchment"
    >
    {username}
    </button>

    {open &&
      createPortal(
        <>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div
        className="fixed z-50 w-52 rounded-md border border-rule bg-panel py-1 text-sm shadow-2xl"
        style={pos}
        >
        <div className="border-b border-rule px-3 py-2 text-xs text-muted">
        Signed in as <span className="text-parchment">{username}</span>
        </div>

        {items.map((item) => (
          <button
          key={item.label}
          onClick={() => {
            setOpen(false);
            item.onClick();
          }}
          className="block w-full px-3 py-2 text-left text-parchment/90 hover:bg-ink hover:text-brass"
          >
          {item.label}
          </button>
        ))}

        <div className="border-t border-rule">
        <button
        onClick={() => {
          setOpen(false);
          onLogout();
        }}
        className="block w-full px-3 py-2 text-left text-red-400 hover:bg-ink"
        >
        Log out
        </button>
        </div>
        </div>
        </>,
        document.body
      )}
      </div>
  );
}

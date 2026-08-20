import { useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from './Avatar.jsx';

/** The avatar-triggered account menu. Deliberately takes `items` as a
 * plain [{ label, onClick }] array rather than hardcoding menu entries
 * as JSX inside this component — adding a future option (friends,
 * groups, notification settings, whatever comes next) is just adding
 * another entry to the array the caller passes in, not restructuring
 * this component itself. Log out is kept separate/pinned at the
 * bottom rather than folded into `items`, since it's a different kind
 * of action (destructive/session-ending) from the rest. Same portal +
 * full-screen click-outside-catcher pattern used elsewhere in this app
 * (StrongsPopup, ContextZoomMenu, etc.). */
export default function UserMenu({ username, items = [], onLogout }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  function toggle(e) {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ right: window.innerWidth - rect.right, top: rect.bottom + 6 });
    setOpen(true);
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="block rounded-full" title={username}>
        <Avatar username={username} size={32} />
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="fixed z-50 w-52 rounded-md border border-rule bg-panel py-1 text-sm shadow-2xl"
              style={{ right: pos.right, top: pos.top }}
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
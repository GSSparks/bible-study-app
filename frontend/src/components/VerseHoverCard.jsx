import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';

export default function VerseHoverCard({ refStr, rect, bibleModule, onNavigate, onMouseEnter, onMouseLeave }) {
  const [verses, setVerses] = useState(null);

  useEffect(() => {
    setVerses(null);
    api.getPassage(bibleModule, refStr)
      .then((res) => setVerses(res.verses || []))
      .catch(() => setVerses([]));
  }, [refStr, bibleModule]);

  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceBelow < 180;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 296));

  const style = {
    position: 'fixed',
    left,
    zIndex: 9999,
    ...(above
      ? { top: Math.max(8, rect.top - 8), transform: 'translateY(-100%)' }
      : { top: rect.bottom + 8 }),
  };

  return createPortal(
    <div
      className="w-72 rounded-lg border border-rule bg-panel p-3 shadow-2xl"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <p className="mb-1.5 font-mono text-xs text-brass">{refStr}</p>
      {verses === null ? (
        <p className="text-xs text-muted">Loading…</p>
      ) : verses.length === 0 ? (
        <p className="text-xs text-muted">Verse not found.</p>
      ) : (
        <>
          <p className="break-words text-sm leading-relaxed text-parchment/90">
            {verses.slice(0, 2).map((v) => v.content.replace(/<[^>]+>/g, '')).join(' ')}
            {verses.length > 2 && <span className="text-muted"> …</span>}
          </p>
          {verses.length > 2 && (
            <p className="mt-1 text-xs text-muted">{verses.length} verses</p>
          )}
        </>
      )}
      {onNavigate && (
        <div className="mt-2.5 border-t border-rule/50 pt-2">
          <button
            onClick={() => onNavigate(refStr)}
            className="text-xs text-muted hover:text-brass"
          >
            Open in Cell →
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

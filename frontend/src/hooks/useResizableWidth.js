import { useCallback, useEffect, useRef, useState } from 'react';

/** A width in px that can be dragged via a handle and persists across
 * reloads. `side` controls which edge the drag delta is measured from
 * ('left' for a panel on the right side of the screen, 'right' for one
 * on the left). */
export function useResizableWidth({ key, defaultWidth, min = 260, max = 720, side = 'left' }) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? Number(saved) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });
  const dragState = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(key, String(width));
    } catch {
      // storage unavailable (private browsing etc.) — not worth failing over
    }
  }, [key, width]);

  const onDragStart = useCallback(
    (e) => {
      dragState.current = { startX: e.clientX, startWidth: width };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  useEffect(() => {
    function onMove(e) {
      if (!dragState.current) return;
      const delta = e.clientX - dragState.current.startX;
      const signedDelta = side === 'left' ? -delta : delta;
      const next = Math.min(max, Math.max(min, dragState.current.startWidth + signedDelta));
      setWidth(next);
    }
    function onUp() {
      if (!dragState.current) return;
      dragState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [min, max, side]);

  return { width, onDragStart };
}

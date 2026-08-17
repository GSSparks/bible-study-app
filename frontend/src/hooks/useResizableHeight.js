import { useCallback, useEffect, useRef, useState } from 'react';

/** A height in px that can be dragged via a handle and persists across
 * reloads. `side` controls which edge the drag delta is measured from
 * ('top' for a panel below the handle, 'bottom' for one above it). */
export function useResizableHeight({ key, defaultHeight, min = 160, max = 800, side = 'top' }) {
  const [height, setHeight] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? Number(saved) : defaultHeight;
    } catch {
      return defaultHeight;
    }
  });
  const dragState = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(key, String(height));
    } catch {
      // storage unavailable (private browsing etc.) — not worth failing over
    }
  }, [key, height]);

  const onDragStart = useCallback(
    (e) => {
      dragState.current = { startY: e.clientY, startHeight: height };
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [height]
  );

  useEffect(() => {
    function onMove(e) {
      if (!dragState.current) return;
      const delta = e.clientY - dragState.current.startY;
      const signedDelta = side === 'top' ? -delta : delta;
      const next = Math.min(max, Math.max(min, dragState.current.startHeight + signedDelta));
      setHeight(next);
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

  return { height, onDragStart };
}
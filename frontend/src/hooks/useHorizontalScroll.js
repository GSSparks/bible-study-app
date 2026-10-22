import { useEffect, useRef } from 'react';

/** Attaches a wheel listener (non-passive) that redirects vertical scroll to
 * horizontal scroll when the element overflows. React's synthetic onWheel is
 * passive by default and can't call preventDefault, so we need a real listener. */
export function useHorizontalScroll() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onWheel(e) {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return ref;
}

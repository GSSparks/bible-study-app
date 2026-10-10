import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { osisToHuman } from '../utils/osisToHuman.js';

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function CrossRefPane({ reference, module, onVerseRefClick }) {
  const [tskInstalled, setTskInstalled] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { text, x, y }
  const cacheRef = useRef(new Map()); // osis → snippet text
  const hoverTimerRef = useRef(null);

  useEffect(() => {
    api.listInstalledModules('COMMENTARY')
      .then((mods) => setTskInstalled(mods.some((m) => m.name === 'TSK')))
      .catch(() => setTskInstalled(false));
  }, []);

  useEffect(() => {
    if (!tskInstalled || !reference) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.getPassage('TSK', reference)
      .then((res) => {
        if (cancelled) return;
        const parsed = (res.verses || []).map((v) => {
          const refs = new Set();
          const re1 = /data-ref="([^"]+)"/g;
          let m;
          while ((m = re1.exec(v.content)) !== null) {
            const r = m[1].trim();
            if (r) refs.add(r);
          }
          const re2 = /data-refs="([^"]+)"/g;
          while ((m = re2.exec(v.content)) !== null) {
            m[1].split(',').map((r) => r.trim()).filter(Boolean).forEach((r) => refs.add(r));
          }
          return {
            verseLabel: `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`,
            refs: [...refs],
          };
        });
        setItems(parsed.filter((p) => p.refs.length > 0));
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tskInstalled, reference]);

  function handleMouseEnter(e, ref) {
    if (!module) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left;
    const y = rect.bottom + 6;

    // Small delay so quick mouse-passes don't fire fetches
    hoverTimerRef.current = setTimeout(async () => {
      let text = cacheRef.current.get(ref);
      if (!text) {
        try {
          const res = await api.getPassage(module, ref);
          const verses = res.verses || [];
          text = verses.map((v) => `${v.verseNr} ${stripHtml(v.content)}`).join(' ');
          if (text.length > 220) text = text.slice(0, 220).replace(/\s\S*$/, '') + '…';
          cacheRef.current.set(ref, text || '');
        } catch {
          text = '';
        }
      }
      if (text) setTooltip({ text, x, y });
    }, 180);
  }

  function handleMouseLeave() {
    clearTimeout(hoverTimerRef.current);
    setTooltip(null);
  }

  if (tskInstalled === null) {
    return (
      <div className="flex h-full items-center justify-center bg-page px-6 text-center text-sm text-pageMuted">
        Checking for TSK…
      </div>
    );
  }

  if (!tskInstalled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-page px-8 text-center">
        <p className="text-sm text-pageText">Cross-References require the TSK module.</p>
        <p className="text-xs text-pageMuted">
          Install <span className="font-mono">TSK</span> (Treasury of Scripture Knowledge) via
          Admin → Modules to enable this pane.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-page px-4 py-4">
      {loading && <p className="text-sm text-pageMuted">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && reference && (
        <p className="text-sm text-pageMuted">No cross-references found for this passage.</p>
      )}

      {items.map((item) => (
        <div key={item.verseLabel} className="mb-4">
          <p className="mb-1 font-mono text-xs text-pageMuted">{item.verseLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {item.refs.map((ref) => (
              <button
                key={ref}
                onClick={() => onVerseRefClick?.(ref)}
                onMouseEnter={(e) => handleMouseEnter(e, ref)}
                onMouseLeave={handleMouseLeave}
                className="rounded border border-pageBorder px-2 py-0.5 text-xs text-verdigris hover:border-brass hover:text-brass"
              >
                {osisToHuman(ref)}
              </button>
            ))}
          </div>
        </div>
      ))}

      {tooltip && createPortal(
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-rule bg-panel px-3 py-2 shadow-xl"
          style={{ left: Math.min(tooltip.x, window.innerWidth - 320), top: tooltip.y }}
        >
          <p className="font-display text-xs leading-relaxed text-parchment/90">{tooltip.text}</p>
        </div>,
        document.body
      )}
    </div>
  );
}

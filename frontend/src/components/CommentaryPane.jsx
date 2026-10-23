import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import SelectableNoteRegion from './SelectableNoteRegion.jsx';
import FootnotePopup from './FootnotePopup.jsx';
import VerseHoverCard from './VerseHoverCard.jsx';
import VerseCommentaryEditor from './VerseCommentaryEditor.jsx';

const HIGHLIGHT_BG = {
  yellow: 'bg-amber-300/30',
  blue: 'bg-sky-300/30',
  green: 'bg-emerald-300/25',
  pink: 'bg-rose-300/25',
  purple: 'bg-violet-300/25',
};

const HIGHLIGHT_SWATCH = {
  yellow: 'bg-amber-400',
  blue: 'bg-sky-400',
  green: 'bg-emerald-400',
  pink: 'bg-rose-400',
  purple: 'bg-violet-400',
};

function stripMarkdown(text) {
  return text
    .replace(/^>\s*"[^"]*"\s*\n+/m, '') // strip the auto-filled quote block
    .replace(/^#+\s*/gm, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function NotePreviewCard({ reference, rect, onEdit, onMouseEnter, onMouseLeave }) {
  const [entry, setEntry] = useState(null); // null = loading, false = not found

  useEffect(() => {
    setEntry(null);
    api.getCommentaryEntry(reference)
      .then((e) => setEntry(e || false))
      .catch(() => setEntry(false));
  }, [reference]);

  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceBelow < 200;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 308));
  const style = {
    position: 'fixed',
    left,
    zIndex: 9999,
    ...(above
      ? { top: Math.max(8, rect.top - 8), transform: 'translateY(-100%)' }
      : { top: rect.bottom + 8 }),
  };

  if (entry === false) return null;

  const preview = entry ? stripMarkdown(entry.bodyMd || '').slice(0, 300) : null;

  return createPortal(
    <div
      className="w-72 rounded-lg border border-rule bg-panel p-3 shadow-2xl"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <p className="mb-1.5 font-mono text-xs text-brass">{reference}</p>
      {entry === null ? (
        <p className="text-xs text-muted">Loading…</p>
      ) : (
        <>
          {entry.title && (
            <p className="mb-1 text-sm font-medium text-parchment">{entry.title}</p>
          )}
          {preview && (
            <p className="line-clamp-4 text-sm leading-relaxed text-parchment/80">
              {preview}
              {(entry.bodyMd || '').length > 300 && <span className="text-muted"> …</span>}
            </p>
          )}
          <div className="mt-2.5 border-t border-rule/50 pt-2">
            <button onClick={onEdit} className="text-xs text-muted hover:text-brass">
              Edit →
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

function extractStrongsData(target) {
  let el = target;
  for (let depth = 0; el && depth < 4; depth++, el = el.parentElement) {
    if (el.dataset?.strong) {
      return { key: el.dataset.strong, morph: el.dataset.morph || null, word: el.textContent?.trim() || null };
    }
    const href = el.getAttribute?.('href') || '';
    if (href.startsWith('strong:')) return { key: href.slice(7), morph: null, word: el.textContent?.trim() || null };
    const title = el.getAttribute?.('title') || '';
    const titleMatch = title.match(/\b([GH]\d{1,5})\b/);
    if (titleMatch) return { key: titleMatch[1], morph: null, word: el.textContent?.trim() || null };
    if (el.classList?.contains('strongs')) {
      const text = el.textContent.trim();
      if (/^[GH]\d{1,5}$/.test(text)) return { key: text, morph: null, word: null };
    }
    const ownText = el.textContent?.trim();
    if (ownText && /^[GH]\d{1,5}$/.test(ownText)) return { key: ownText, morph: null, word: null };
  }
  return null;
}

export default function CommentaryPane({
  module,
  reference,
  bibleModule,
  onVerseRefClick,
  onStrongsClick,
  onNavigate,
  refreshNonce,
}) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [footnotePopup, setFootnotePopup] = useState(null);
  const [hoverCard, setHoverCard] = useState(null);
  const hoverCloseTimer = useRef(null);
  const [noteHoverCard, setNoteHoverCard] = useState(null); // { reference, rect }
  const noteHoverTimer = useRef(null);
  const [highlightMap, setHighlightMap] = useState(new Map());
  const [noteMap, setNoteMap] = useState(new Map()); // verseRef → true
  const [phraseSelection, setPhraseSelection] = useState(null); // { text, x, y, verseRef, verseIndices }
  const [verseNoteRef, setVerseNoteRef] = useState(null); // { reference, x, y, initialQuote? }
  const verseRefs = useRef(new Map()); // verseKey → DOM element

  useEffect(() => {
    if (!module || !reference) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setVerses([]);
    setHighlightMap(new Map());
    setNoteMap(new Map());

    api
      .getPassage(module, reference)
      .then(async (res) => {
        if (cancelled) return;
        const loadedVerses = res.verses || [];
        setVerses(loadedVerses);
        if (loadedVerses.length === 0) return;
        const v0 = loadedVerses[0];
        const prefix = `${v0.bibleBookShortTitle} ${v0.chapter}:`;
        try {
          const [hls, notes, personalRefs] = await Promise.all([
            api.listHighlights({ prefix }),
            api.listNotes({ prefix }),
            api.listPersonalCommentaryRefs(prefix),
          ]);
          if (cancelled) return;
          const hMap = new Map();
          for (const h of hls) hMap.set(h.reference, { id: h.id, color: h.color });
          setHighlightMap(hMap);
          const nMap = new Map();
          for (const n of notes) nMap.set(n.reference, true);
          for (const ref of personalRefs) nMap.set(ref, true);
          setNoteMap(nMap);
        } catch {} // non-fatal
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.status === 400 || err.status === 404) setVerses([]);
          else setError(err.message);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [module, reference, refreshNonce]);

  const phraseHasHighlight = useMemo(() => {
    if (!phraseSelection?.verseIndices) return false;
    const [lo, hi] = phraseSelection.verseIndices;
    if (lo === null || hi === null) return false;
    for (let i = lo; i <= hi; i++) {
      const v = verses[i];
      if (v) {
        const ref = `${v.bibleBookShortTitle} ${v.chapter}:${parseInt(v.verseNr, 10)}`;
        if (highlightMap.has(ref)) return true;
      }
    }
    return false;
  }, [phraseSelection, verses, highlightMap]);

  function scheduleHoverClose() {
    clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = setTimeout(() => setHoverCard(null), 150);
  }
  function cancelHoverClose() {
    clearTimeout(hoverCloseTimer.current);
  }

  function scheduleNoteHoverClose() {
    clearTimeout(noteHoverTimer.current);
    noteHoverTimer.current = setTimeout(() => setNoteHoverCard(null), 150);
  }
  function cancelNoteHoverClose() {
    clearTimeout(noteHoverTimer.current);
  }

  function handleContentClick(e) {
    const footnoteEl = e.target.closest('.footnote-marker');
    if (footnoteEl) {
      setFootnotePopup({ text: footnoteEl.dataset.note, x: e.clientX, y: e.clientY });
      return;
    }
    const xrefEl = e.target.closest('.xref-marker');
    if (xrefEl) {
      onVerseRefClick?.(xrefEl.dataset.refs, e);
      return;
    }
    const verseRefEl = e.target.closest('.verse-ref');
    if (verseRefEl) {
      onVerseRefClick?.(verseRefEl.dataset.ref, e);
      return;
    }
    if (!onStrongsClick) return;
    const result = extractStrongsData(e.target);
    if (result) onStrongsClick(result.key, e, result.morph, result.word, module);
  }

  function handleContentMouseUp(e) {
    const selection = window.getSelection();
    const rawText = selection?.toString().trim();
    if (!rawText || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const container = e.currentTarget;
    if (!container.contains(range.commonAncestorContainer)) return;

    const verseByKey = new Map(verses.map((v, i) => [`${v.chapter}-${v.verseNr}`, i]));
    const spannedIndices = [];
    for (const [key, el] of verseRefs.current) {
      if (range.intersectsNode(el)) {
        const idx = verseByKey.get(key);
        if (idx !== undefined) spannedIndices.push(idx);
      }
    }
    const loIdx = spannedIndices.length ? Math.min(...spannedIndices) : null;
    const hiIdx = spannedIndices.length ? Math.max(...spannedIndices) : null;
    const firstVerse = loIdx !== null ? verses[loIdx] : null;
    const verseRef = firstVerse
      ? `${firstVerse.bibleBookShortTitle} ${firstVerse.chapter}:${parseInt(firstVerse.verseNr, 10)}`
      : null;

    const rect = range.getBoundingClientRect();
    setPhraseSelection({ text: rawText, x: rect.left, y: rect.bottom + 8, verseRef, verseIndices: [loIdx, hiIdx] });
  }

  function handleContentMouseOver(e) {
    const xref = e.target.closest('.xref-marker');
    if (xref) {
      cancelHoverClose();
      const refs = (xref.dataset.refs || xref.dataset.ref || '').split(',');
      const refStr = refs[0]?.trim();
      if (refStr && hoverCard?.refStr !== refStr) {
        setHoverCard({ refStr, rect: xref.getBoundingClientRect() });
      }
      return;
    }
    const span = e.target.closest('.verse-ref');
    if (span) {
      cancelHoverClose();
      const refStr = span.dataset.ref;
      if (refStr && hoverCard?.refStr !== refStr) {
        setHoverCard({ refStr, rect: span.getBoundingClientRect() });
      }
      return;
    }
    if (hoverCard) scheduleHoverClose();
  }

  async function handleHighlight(color) {
    if (!phraseSelection?.verseIndices) return;
    const [lo, hi] = phraseSelection.verseIndices;
    if (lo === null || hi === null) return;
    const refs = [];
    for (let i = lo; i <= hi; i++) {
      const v = verses[i];
      if (v) refs.push(`${v.bibleBookShortTitle} ${v.chapter}:${parseInt(v.verseNr, 10)}`);
    }
    setHighlightMap((prev) => {
      const next = new Map(prev);
      for (const ref of refs) next.set(ref, { id: null, color });
      return next;
    });
    setPhraseSelection(null);
    window.getSelection()?.removeAllRanges();
    try {
      const created = await Promise.all(refs.map((ref) => api.createHighlight({ reference: ref, module, color })));
      setHighlightMap((prev) => {
        const next = new Map(prev);
        refs.forEach((ref, i) => { if (created[i]?.id) next.set(ref, { id: created[i].id, color }); });
        return next;
      });
    } catch (e) {
      console.error('Failed to save highlight:', e);
    }
  }

  async function handleRemoveHighlight() {
    if (!phraseSelection?.verseIndices) return;
    const [lo, hi] = phraseSelection.verseIndices;
    if (lo === null || hi === null) return;
    const idsToDelete = [];
    const refsToRemove = [];
    for (let i = lo; i <= hi; i++) {
      const v = verses[i];
      if (!v) continue;
      const ref = `${v.bibleBookShortTitle} ${v.chapter}:${parseInt(v.verseNr, 10)}`;
      const hl = highlightMap.get(ref);
      if (hl) {
        refsToRemove.push(ref);
        if (hl.id) idsToDelete.push(hl.id);
      }
    }
    setHighlightMap((prev) => {
      const next = new Map(prev);
      for (const ref of refsToRemove) next.delete(ref);
      return next;
    });
    setPhraseSelection(null);
    window.getSelection()?.removeAllRanges();
    try {
      await Promise.all(idsToDelete.map((id) => api.deleteHighlight(id)));
    } catch (e) {
      console.error('Failed to delete highlight:', e);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-page px-6 py-6 text-pageText">
      {loading && verses.length === 0 && <p className="text-pageMuted">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && verses.length === 0 && reference && (
        <p className="text-pageMuted">No commentary for this passage in {module}.</p>
      )}

      {verses.length > 0 && (
        <SelectableNoteRegion
          reference={reference}
          module={module}
          showNoteButton={false}
          className="markdown-body markdown-body-page space-y-3 font-display text-base leading-relaxed text-pageText"
          onClick={handleContentClick}
          onMouseUp={handleContentMouseUp}
          onMouseOver={handleContentMouseOver}
          onMouseLeave={scheduleHoverClose}
        >
          {verses.map((v) => {
            const verseKey = `${v.chapter}-${v.verseNr}`;
            const verseRef = `${v.bibleBookShortTitle} ${v.chapter}:${parseInt(v.verseNr, 10)}`;
            const hlEntry = highlightMap.get(verseRef);
            const hasNote = noteMap.has(verseRef);
            return (
              <div
                key={verseKey}
                ref={(el) => { if (el) verseRefs.current.set(verseKey, el); else verseRefs.current.delete(verseKey); }}
                className={hlEntry ? `rounded-sm ${HIGHLIGHT_BG[hlEntry.color] ?? 'bg-amber-300/30'}` : undefined}
              >
                <sup className="mr-1 text-xs text-pageAccent">{v.verseNr}</sup>
                {hasNote && (
                  <span
                    className="mr-1 inline-block h-2 w-2 cursor-pointer rounded-full bg-brass align-middle hover:bg-brass/70"
                    title="View note"
                    onMouseEnter={(e) => {
                      cancelNoteHoverClose();
                      setNoteHoverCard({ reference: verseRef, rect: e.currentTarget.getBoundingClientRect() });
                    }}
                    onMouseLeave={scheduleNoteHoverClose}
                    onClick={(e) => { e.stopPropagation(); setVerseNoteRef({ reference: verseRef, x: e.clientX, y: e.clientY + 8 }); }}
                  />
                )}
                <span dangerouslySetInnerHTML={{ __html: v.content }} />
              </div>
            );
          })}
        </SelectableNoteRegion>
      )}

      {phraseSelection &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => { setPhraseSelection(null); window.getSelection()?.removeAllRanges(); }}
            />
            <div
              className="fixed z-40 flex items-center gap-1 rounded-md border border-rule bg-panel p-1 shadow-2xl"
              style={{ left: Math.min(phraseSelection.x, window.innerWidth - 360), top: Math.min(phraseSelection.y, window.innerHeight - 52) }}
            >
              {phraseSelection.verseIndices[0] !== null && (
                <div className="flex items-center gap-0.5 border-r border-rule pr-1.5">
                  {Object.entries(HIGHLIGHT_SWATCH).map(([color, swatchCls]) => (
                    <button
                      key={color}
                      onClick={() => handleHighlight(color)}
                      className={`h-4 w-4 rounded-full ring-1 ring-rule/60 hover:ring-2 hover:ring-rule ${swatchCls}`}
                      title={`Highlight ${color}`}
                    />
                  ))}
                  {phraseHasHighlight && (
                    <button
                      onClick={handleRemoveHighlight}
                      className="flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-rule/60 hover:bg-red-900/30 hover:ring-red-400"
                      title="Remove highlight"
                    >
                      <span className="text-[9px] leading-none text-muted">✕</span>
                    </button>
                  )}
                </div>
              )}
              {phraseSelection.verseRef && (
                <button
                  onClick={() => {
                    const ref = phraseSelection.verseRef;
                    setVerseNoteRef({ reference: ref, x: phraseSelection.x, y: phraseSelection.y + 32, initialQuote: phraseSelection.text });
                    setPhraseSelection(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-verdigris hover:text-parchment"
                >
                  Note
                </button>
              )}
              <button
                onClick={() => { setPhraseSelection(null); window.getSelection()?.removeAllRanges(); }}
                className="rounded px-1.5 py-1 text-xs text-muted hover:text-parchment"
              >
                ✕
              </button>
            </div>
          </>,
          document.body
        )}

      {verseNoteRef && (
        <VerseCommentaryEditor
          reference={verseNoteRef.reference}
          initialQuote={verseNoteRef.initialQuote}
          x={verseNoteRef.x}
          y={verseNoteRef.y}
          onClose={() => setVerseNoteRef(null)}
          onSaved={() => {
            // Optimistic update so the dot appears immediately, then re-fetch
            // to keep noteMap in sync if this pane refreshes for any other reason.
            const ref = verseNoteRef.reference;
            setNoteMap((prev) => new Map(prev).set(ref, true));
            if (verses.length > 0) {
              const v0 = verses[0];
              const prefix = `${v0.bibleBookShortTitle} ${v0.chapter}:`;
              api.listPersonalCommentaryRefs(prefix).then((personalRefs) => {
                setNoteMap((prev) => {
                  const next = new Map(prev);
                  for (const r of personalRefs) next.set(r, true);
                  return next;
                });
              }).catch(() => {});
            }
          }}
        />
      )}

      {footnotePopup && (
        <FootnotePopup
          text={footnotePopup.text}
          x={footnotePopup.x}
          y={footnotePopup.y}
          onClose={() => setFootnotePopup(null)}
        />
      )}

      {noteHoverCard && (
        <NotePreviewCard
          reference={noteHoverCard.reference}
          rect={noteHoverCard.rect}
          onEdit={() => {
            setVerseNoteRef({ reference: noteHoverCard.reference, x: noteHoverCard.rect.left, y: noteHoverCard.rect.bottom + 8 });
            setNoteHoverCard(null);
          }}
          onMouseEnter={cancelNoteHoverClose}
          onMouseLeave={scheduleNoteHoverClose}
        />
      )}

      {hoverCard && bibleModule && (
        <VerseHoverCard
          refStr={hoverCard.refStr}
          rect={hoverCard.rect}
          bibleModule={bibleModule}
          onNavigate={onNavigate}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={scheduleHoverClose}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages } from 'lucide-react';
import { api } from '../api/client.js';
import SelectableNoteRegion from './SelectableNoteRegion.jsx';
import VerseCommentaryEditor from './VerseCommentaryEditor.jsx';
import FootnotePopup from './FootnotePopup.jsx';
import { parseVerseTokens, collectStrongsKeys, cleanMorph } from '../utils/parseInterlinear.js';

function groupVerses(verses) {
  const segments = [];
  let prev = null;

  for (const v of verses) {
    const sameBook = prev && prev.bibleBookShortTitle === v.bibleBookShortTitle;
    const sameChapter = sameBook && prev.chapter === v.chapter;
    const contiguous = sameChapter && Number(v.absoluteVerseNr) === Number(prev.absoluteVerseNr) + 1;
    const hasTitles = v.titles && v.titles.length > 0;

    if (!contiguous || hasTitles) {
      segments.push({
        key: `${v.bibleBookShortTitle}-${v.chapter}-${v.verseNr}`,
        showHeader: !sameChapter,
        header: `${v.bibleBookShortTitle} ${v.chapter}`,
        sectionTitles: hasTitles ? v.titles : [],
        verses: [],
      });
    }
    segments[segments.length - 1].verses.push(v);
    prev = v;
  }

  return segments;
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

/** window.getSelection().toString() faithfully includes the text
 * content of every DOM node the selection passes through — including
 * our own xref/footnote marker superscripts (tiny inline elements
 * sitting immediately next to real words, e.g. a cross-reference letter
 * "b"), which a natural drag-selection can easily sweep over without
 * the person noticing. Confirmed as a real bug: a selection over
 * "...unless it has been given..." came back as "...unless it bhas
 * been given...", a stray marker letter fused into the middle of a
 * word, corrupting the phrase search. Cloning the selected range into a
 * detached fragment and stripping marker elements out of the clone
 * before reading textContent avoids reproducing that — the clone is
 * never attached to the page, so removing elements from it can't affect
 * anything the person actually sees. */
function extractCleanSelectionText(range) {
  const fragment = range.cloneContents();
  fragment.querySelectorAll('.xref-marker, .footnote-marker').forEach((el) => el.remove());
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.textContent.trim().replace(/\s+/g, ' ');
}

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

export default function ReaderPane({
  module,
  reference,
  focusMode = false,
  noScroll = false,
  onNavigate,
  onStrongsClick,
  onVerseRefClick,
  onAnnotate,
  onAskAboutPassage,
  onPhraseStudy,
  refreshNonce,
  onPersonalCommentarySaved,
}) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [footnotePopup, setFootnotePopup] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [phraseSelection, setPhraseSelection] = useState(null); // { text, strongsSequence, x, y }
  const [focusedVerseKey, setFocusedVerseKey] = useState(null);
  const [highlightMap, setHighlightMap] = useState(new Map()); // verseRef → { id, color }
  const [noteCount, setNoteCount] = useState(0);
  const [verseNoteRef, setVerseNoteRef] = useState(null); // { reference, x, y }
  const [interlinearMode, setInterlinearMode] = useState(false);
  const [strongsCache, setStrongsCache] = useState(new Map()); // strongsKey → transcription
  const verseRefs = useRef(new Map());

  useEffect(() => {
    if (!module || !reference) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedRange(null);
    setHighlightMap(new Map());
    setNoteCount(0);

    async function loadAnnotations(loadedVerses) {
      if (!loadedVerses.length) return;
      const v0 = loadedVerses[0];
      const chapterRef = `${v0.bibleBookShortTitle} ${v0.chapter}`;
      try {
        const [hls, nts] = await Promise.all([
          api.listHighlights({ prefix: `${chapterRef}:` }),
          api.listNotes({ reference: chapterRef }),
        ]);
        if (cancelled) return;
        const hMap = new Map();
        for (const h of hls) hMap.set(h.reference, { id: h.id, color: h.color });
        setHighlightMap(hMap);
        setNoteCount(nts.length);
      } catch {} // non-fatal
    }

    async function load() {
      let loadedVerses;
      if (!focusMode) {
        const res = await api.getPassage(module, reference);
        loadedVerses = res.verses || [];
        if (!cancelled) setVerses(loadedVerses);
      } else {
        const anchorRes = await api.getPassage(module, reference);
        const anchor = anchorRes.verses?.[0];
        if (!anchor) {
          loadedVerses = anchorRes.verses || [];
          if (!cancelled) setVerses(loadedVerses);
        } else {
          const chapterRes = await api.getPassage(module, `${anchor.bibleBookShortTitle} ${anchor.chapter}`);
          loadedVerses = chapterRes.verses || [];
          if (!cancelled) {
            setVerses(loadedVerses);
            setFocusedVerseKey(`${anchor.chapter}-${anchor.verseNr}`);
          }
        }
      }
      await loadAnnotations(loadedVerses || []);
    }

    load()
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [module, reference, focusMode, refreshNonce]);

  useEffect(() => {
    if (!focusMode || !focusedVerseKey) return;
    const el = verseRefs.current.get(focusedVerseKey);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusMode, focusedVerseKey, verses]);

  // Fetch Strong's transcriptions for all words in the passage when
  // interlinear mode is active. Results are cached so toggling off/on
  // doesn't re-fetch. Uses the existing /api/strongs/:key endpoint.
  useEffect(() => {
    if (!interlinearMode || verses.length === 0) return;
    const keys = collectStrongsKeys(verses);
    const missing = keys.filter((k) => !strongsCache.has(k));
    if (missing.length === 0) return;
    Promise.allSettled(missing.map((k) => api.getStrongsEntry(k).then((e) => [k, e?.transcription || ''])))
      .then((results) => {
        setStrongsCache((prev) => {
          const next = new Map(prev);
          for (const r of results) {
            if (r.status === 'fulfilled') next.set(r.value[0], r.value[1]);
          }
          return next;
        });
      });
  }, [interlinearMode, verses]);

  const indexedVerses = useMemo(() => verses.map((v, i) => ({ ...v, __index: i })), [verses]);
  const segments = useMemo(() => groupVerses(indexedVerses), [indexedVerses]);
  const first = verses[0];

  const selectionVerseCount = useMemo(() => {
    if (!selectedRange) return 0;
    return Math.abs(selectedRange.focus - selectedRange.anchor) + 1;
  }, [selectedRange]);

  const selectionHasHighlight = useMemo(() => {
    if (!selectedRange) return false;
    const lo = Math.min(selectedRange.anchor, selectedRange.focus);
    const hi = Math.max(selectedRange.anchor, selectedRange.focus);
    for (let i = lo; i <= hi; i++) {
      const v = verses[i];
      if (v && highlightMap.has(`${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`)) return true;
    }
    return false;
  }, [selectedRange, verses, highlightMap]);

  const phraseSelectionHasHighlight = useMemo(() => {
    if (!phraseSelection?.verseIndices) return false;
    const [loIdx, hiIdx] = phraseSelection.verseIndices;
    if (loIdx === null || hiIdx === null) return false;
    for (let i = loIdx; i <= hiIdx; i++) {
      const v = verses[i];
      if (v && highlightMap.has(`${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`)) return true;
    }
    return false;
  }, [phraseSelection, verses, highlightMap]);

  function goToChapter(delta) {
    if (!first) return;
    const nextChapter = Number(first.chapter) + delta;
    if (nextChapter < 1) return;
    onNavigate?.(focusMode ? `${first.bibleBookShortTitle} ${nextChapter}:1` : `${first.bibleBookShortTitle} ${nextChapter}`);
  }

  function handleVerseNumberClick(e, v) {
    e.stopPropagation();
    setPhraseSelection(null);
    if (e.shiftKey && selectedRange) {
      setSelectedRange((prev) => ({ ...prev, focus: v.__index, x: e.clientX, y: e.clientY + 16 }));
      return;
    }
    if (focusMode) {
      onNavigate?.(`${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`);
    }
    setSelectedRange({ anchor: v.__index, focus: v.__index, x: e.clientX, y: e.clientY + 16 });
  }

  function isIndexSelected(index) {
    if (!selectedRange) return false;
    const lo = Math.min(selectedRange.anchor, selectedRange.focus);
    const hi = Math.max(selectedRange.anchor, selectedRange.focus);
    return index >= lo && index <= hi;
  }

  function getSelectedReference() {
    if (!selectedRange) return null;
    const lo = Math.min(selectedRange.anchor, selectedRange.focus);
    const hi = Math.max(selectedRange.anchor, selectedRange.focus);
    const startV = verses[lo];
    const endV = verses[hi];
    if (!startV || !endV) return null;
    if (startV.bibleBookShortTitle === endV.bibleBookShortTitle && startV.chapter === endV.chapter) {
      return lo === hi
        ? `${startV.bibleBookShortTitle} ${startV.chapter}:${startV.verseNr}`
        : `${startV.bibleBookShortTitle} ${startV.chapter}:${startV.verseNr}-${endV.verseNr}`;
    }
    return `${startV.bibleBookShortTitle} ${startV.chapter}:${startV.verseNr}-${endV.chapter}:${endV.verseNr}`;
  }

  function handleAskAboutSelection() {
    const selectedRef = getSelectedReference();
    if (!selectedRef) return;
    onAskAboutPassage?.(module, selectedRef);
    setSelectedRange(null);
  }

  function handleCopySelection() {
    if (!selectedRange) return;
    const lo = Math.min(selectedRange.anchor, selectedRange.focus);
    const hi = Math.max(selectedRange.anchor, selectedRange.focus);
    const ref = getSelectedReference();
    const tempEl = document.createElement('div');
    const text = verses
      .slice(lo, hi + 1)
      .map((v) => {
        tempEl.innerHTML = v.content;
        return `${v.verseNr} ${tempEl.textContent.trim()}`;
      })
      .join(' ');
    navigator.clipboard?.writeText(`${ref}\n${text}`).catch(() => {});
    setSelectedRange(null);
  }

  async function handleHighlight(color) {
    if (!selectedRange) return;
    const lo = Math.min(selectedRange.anchor, selectedRange.focus);
    const hi = Math.max(selectedRange.anchor, selectedRange.focus);
    const refs = [];
    for (let i = lo; i <= hi; i++) {
      const v = verses[i];
      if (v) refs.push(`${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`);
    }
    // Optimistic update (no ID yet)
    setHighlightMap((prev) => {
      const next = new Map(prev);
      for (const ref of refs) next.set(ref, { id: null, color });
      return next;
    });
    setSelectedRange(null);
    try {
      const created = await Promise.all(refs.map((ref) => api.createHighlight({ reference: ref, module, color })));
      // Fill in real IDs
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
    if (!selectedRange) return;
    const lo = Math.min(selectedRange.anchor, selectedRange.focus);
    const hi = Math.max(selectedRange.anchor, selectedRange.focus);
    const idsToDelete = [];
    const refsToRemove = [];
    for (let i = lo; i <= hi; i++) {
      const v = verses[i];
      if (!v) continue;
      const ref = `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`;
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
    setSelectedRange(null);
    try {
      await Promise.all(idsToDelete.map((id) => api.deleteHighlight(id)));
    } catch (e) {
      console.error('Failed to delete highlight:', e);
    }
  }

  async function handleHighlightFromPhrase(color) {
    if (!phraseSelection?.verseIndices) return;
    const [loIdx, hiIdx] = phraseSelection.verseIndices;
    if (loIdx === null || hiIdx === null) return;
    const refs = [];
    for (let i = loIdx; i <= hiIdx; i++) {
      const v = verses[i];
      if (v) refs.push(`${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`);
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

  async function handleRemoveHighlightFromPhrase() {
    if (!phraseSelection?.verseIndices) return;
    const [loIdx, hiIdx] = phraseSelection.verseIndices;
    if (loIdx === null || hiIdx === null) return;
    const idsToDelete = [];
    const refsToRemove = [];
    for (let i = loIdx; i <= hiIdx; i++) {
      const v = verses[i];
      if (!v) continue;
      const ref = `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`;
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

  /**
   * Detects a real inline text selection (dragging over rendered words,
   * as opposed to clicking a verse number) via the browser's native
   * window.getSelection() — the standard DOM API for this, not
   * anything SWORD/app-specific. Distinct from selectedRange above,
   * which tracks whole-verse selection by index; this tracks an
   * arbitrary mid-sentence text span, which is what a "phrase" actually
   * is. The two are mutually exclusive (this clears selectedRange, and
   * handleVerseNumberClick clears this) so only one floating toolbar
   * ever shows at once.
   *
   * Also collects the Strong's key of every tagged word the selection
   * overlaps, in reading order, via Range.intersectsNode (again,
   * standard DOM API) — this is what powers "study this phrase by
   * original words" as well as by exact text, without needing any
   * SWORD-specific selection machinery.
   */
  function handleContentMouseUp(e) {
    const selection = window.getSelection();
    const rawText = selection?.toString().trim();
    if (!rawText || selection.isCollapsed) {
      return;
    }
    const range = selection.getRangeAt(0);
    const container = e.currentTarget;
    if (!container.contains(range.commonAncestorContainer)) {
      return;
    }
    setSelectedRange(null);

    const text = extractCleanSelectionText(range);
    if (!text) return;

    const taggedWords = container.querySelectorAll('[data-strong]');
    const strongsSequence = [];
    for (const el of taggedWords) {
      if (range.intersectsNode(el)) {
        const keys = (el.dataset.strong || '').split(',').map((k) => k.trim()).filter(Boolean);
        if (keys.length > 0) strongsSequence.push(keys[0]);
      }
    }

    // Find which verse indices are spanned by this text selection so
    // the phrase toolbar can apply highlights and open the note editor
    // with the correct reference.
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
      ? `${firstVerse.bibleBookShortTitle} ${firstVerse.chapter}:${firstVerse.verseNr}`
      : null;

    const rect = range.getBoundingClientRect();
    setPhraseSelection({ text, strongsSequence, x: rect.left, y: rect.bottom + 8, verseIndices: [loIdx, hiIdx], verseRef });
  }

  function handlePhraseStudyClick(useOriginalWords) {
    if (!phraseSelection) return;
    onPhraseStudy?.(
      phraseSelection.text,
      module,
      useOriginalWords ? phraseSelection.strongsSequence : undefined
    );
    setPhraseSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div className={`${noScroll ? '' : 'h-full overflow-y-auto '}bg-page px-6 py-6 text-pageText`}>
      {!focusMode && (
        <header className="mb-4 flex items-baseline gap-3">
          <h1 className="font-display text-2xl text-pageText">{reference || 'Select a passage'}</h1>
          {module && <span className="font-mono text-xs uppercase tracking-wide text-pageMuted">{module}</span>}
          {first && (
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => goToChapter(-1)}
                className="rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
                title="Previous chapter"
              >
                ‹
              </button>
              <button
                onClick={() => goToChapter(1)}
                className="rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
                title="Next chapter"
              >
                ›
              </button>
            </div>
          )}
        </header>
      )}

      {loading && <p className="text-pageMuted">Loading passage…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && verses.length > 0 && (
        <div className="flex gap-3">
          <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
            <button
              className={`marginalia-tick cursor-pointer${highlightMap.size > 0 || noteCount > 0 ? ' marginalia-tick--active' : ''}`}
              title={noteCount > 0 ? `${noteCount} note${noteCount !== 1 ? 's' : ''} on this passage` : 'Add a note or highlight on this passage'}
              onClick={() => onAnnotate?.(reference)}
              aria-label="Annotate this passage"
            />
            <button
              onClick={() => setInterlinearMode((m) => !m)}
              title={interlinearMode ? 'Switch to normal reading mode' : 'Switch to interlinear mode'}
              className={`rounded p-0.5 transition-colors ${interlinearMode ? 'text-brass' : 'text-pageMuted/40 hover:text-pageMuted'}`}
            >
              <Languages size={13} strokeWidth={2} />
            </button>
          </div>
          <SelectableNoteRegion
            reference={reference}
            module={module}
            showNoteButton={false}
            className={`verse-content max-w-2xl flex-1 space-y-4 font-display text-base leading-relaxed text-pageText ${
              focusMode ? '' : 'markdown-body markdown-body-page'
            }`}
            onClick={handleContentClick}
            onMouseUp={handleContentMouseUp}
          >
            {segments.map((seg, i) => (
              <div key={seg.key}>
                {seg.showHeader ? (
                  <h2 className="mb-1 font-sans text-xs uppercase tracking-wide text-verdigris">{seg.header}</h2>
                ) : (
                  i > 0 && seg.sectionTitles.length === 0 && <div className="mb-1 text-xs text-pageMuted">⋯</div>
                )}
                {seg.sectionTitles.length > 0 && (
                  <h3 className="mb-2 mt-1 font-display text-lg italic text-pageAccent">{seg.sectionTitles.join(' — ')}</h3>
                )}
                {interlinearMode ? (
                  <div className="flex flex-wrap items-end gap-x-2 gap-y-4">
                    {seg.verses.map((v) => {
                      const verseKey = `${v.chapter}-${v.verseNr}`;
                      const verseRef = `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`;
                      const hlColor = highlightMap.get(verseRef)?.color;
                      const tokens = parseVerseTokens(v.content);
                      return (
                        <span
                          key={verseKey}
                          ref={(el) => { if (el) verseRefs.current.set(verseKey, el); else verseRefs.current.delete(verseKey); }}
                          className={`inline-flex flex-wrap items-end gap-x-2 gap-y-4 ${hlColor ? (HIGHLIGHT_BG[hlColor] ?? 'bg-amber-300/30') : ''}`}
                        >
                          <sup
                            className="self-start cursor-pointer text-xs text-pageAccent hover:text-brass"
                            onClick={(e) => handleVerseNumberClick(e, v)}
                          >
                            {v.verseNr}
                          </sup>
                          {tokens.map((tok, ti) =>
                            tok.type === 'text' ? (
                              tok.text.trim() ? (
                                <span key={ti} className="self-end pb-0.5 font-display text-sm text-pageText">{tok.text}</span>
                              ) : null
                            ) : (
                              <span key={ti} className="inline-flex flex-col items-center gap-0.5 text-center">
                                <span className="font-display text-sm leading-snug text-pageText">{tok.word}</span>
                                <button
                                  className="font-mono text-[10px] leading-none text-verdigris hover:text-brass"
                                  onClick={(e) => onStrongsClick?.(tok.strong, e, tok.morph, tok.word, module)}
                                >
                                  {tok.strong.split(',')[0]}
                                </button>
                                <span className="text-[10px] leading-none italic text-pageMuted">
                                  {strongsCache.get(tok.strong.split(',')[0]) || '…'}
                                </span>
                              </span>
                            )
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p>
                    {seg.verses.map((v) => {
                      const verseKey = `${v.chapter}-${v.verseNr}`;
                      const isFocused = focusMode && verseKey === focusedVerseKey;
                      const verseRef = `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`;
                      const hlColor = highlightMap.get(verseRef)?.color;
                      return (
                        <span
                          key={verseKey}
                          ref={(el) => {
                            if (el) verseRefs.current.set(verseKey, el);
                            else verseRefs.current.delete(verseKey);
                          }}
                          className={[
                            isIndexSelected(v.__index) ? 'rounded bg-pageAccent/20' : '',
                            isFocused ? 'border-l-2 border-pageAccent bg-pageAccent/10 pl-1' : '',
                            hlColor ? (HIGHLIGHT_BG[hlColor] ?? 'bg-amber-300/30') : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <sup
                            className="mr-1 cursor-pointer text-xs text-pageAccent hover:text-brass"
                            title={focusMode ? 'Click to focus this verse, shift-click to select a range' : 'Click to select, shift-click to select a range'}
                            onClick={(e) => handleVerseNumberClick(e, v)}
                          >
                            {v.verseNr}
                          </sup>
                          <span dangerouslySetInnerHTML={{ __html: v.content }} />{' '}
                        </span>
                      );
                    })}
                  </p>
                )}
              </div>
            ))}
          </SelectableNoteRegion>
        </div>
      )}

      {!loading && !error && verses.length === 0 && reference && (
        <p className="text-pageMuted">No text returned for this reference in {module}.</p>
      )}

      {selectedRange &&
        createPortal(
          <>
            <div className="fixed inset-0 z-30" onClick={() => setSelectedRange(null)} />
            <div
              className="fixed z-40 flex items-center gap-1 rounded-md border border-rule bg-panel p-1 shadow-2xl"
              style={{ left: selectedRange.x, top: selectedRange.y }}
            >
              <span className="px-1 font-mono text-xs text-muted">
                {getSelectedReference()}
                {selectionVerseCount > 1 && (
                  <span className="ml-1 text-muted/60">({selectionVerseCount}v)</span>
                )}
              </span>
              <div className="flex items-center gap-0.5 border-r border-rule pr-1.5">
                {Object.entries(HIGHLIGHT_SWATCH).map(([color, swatchCls]) => (
                  <button
                    key={color}
                    onClick={() => handleHighlight(color)}
                    className={`h-4 w-4 rounded-full ring-1 ring-rule/60 hover:ring-2 hover:ring-rule ${swatchCls}`}
                    title={`Highlight ${color}`}
                  />
                ))}
                {selectionHasHighlight && (
                  <button
                    onClick={handleRemoveHighlight}
                    className="flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-rule/60 hover:bg-red-900/30 hover:ring-red-400"
                    title="Remove highlight"
                  >
                    <span className="text-[9px] leading-none text-muted">✕</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  const ref = getSelectedReference();
                  if (ref) setVerseNoteRef({ reference: ref, x: selectedRange.x, y: selectedRange.y + 28 });
                  setSelectedRange(null);
                }}
                className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-verdigris hover:text-parchment"
                title="Write a note on this verse"
              >
                Note
              </button>
              <button
                onClick={handleCopySelection}
                className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
                title="Copy verse text to clipboard"
              >
                Copy
              </button>
              {onAskAboutPassage && (
                <button
                  onClick={handleAskAboutSelection}
                  className="rounded bg-brass px-2 py-1 text-xs font-medium text-ink hover:bg-brass/90"
                >
                  Ask about this →
                </button>
              )}
              <button
                onClick={() => setSelectedRange(null)}
                className="rounded px-1.5 py-1 text-xs text-muted hover:text-parchment"
              >
                ✕
              </button>
            </div>
          </>,
          document.body
        )}

      {phraseSelection &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => { setPhraseSelection(null); window.getSelection()?.removeAllRanges(); }}
            />
            <div
              className="fixed z-40 flex max-w-lg flex-wrap items-center gap-1 rounded-md border border-rule bg-panel p-1 shadow-2xl"
              style={{ left: phraseSelection.x, top: phraseSelection.y }}
            >
              {/* Highlight swatches — only if we know which verse(s) are spanned */}
              {phraseSelection.verseIndices[0] !== null && (
                <div className="flex items-center gap-0.5 border-r border-rule pr-1.5">
                  {Object.entries(HIGHLIGHT_SWATCH).map(([color, swatchCls]) => (
                    <button
                      key={color}
                      onClick={() => handleHighlightFromPhrase(color)}
                      className={`h-4 w-4 rounded-full ring-1 ring-rule/60 hover:ring-2 hover:ring-rule ${swatchCls}`}
                      title={`Highlight ${color}`}
                    />
                  ))}
                  {phraseSelectionHasHighlight && (
                    <button
                      onClick={handleRemoveHighlightFromPhrase}
                      className="flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-rule/60 hover:bg-red-900/30 hover:ring-red-400"
                      title="Remove highlight"
                    >
                      <span className="text-[9px] leading-none text-muted">✕</span>
                    </button>
                  )}
                </div>
              )}

              {/* Note — opens commentary editor pre-filled with the selected quote */}
              {phraseSelection.verseRef && (
                <button
                  onClick={() => {
                    setVerseNoteRef({
                      reference: phraseSelection.verseRef,
                      x: phraseSelection.x,
                      y: phraseSelection.y + 32,
                      initialQuote: phraseSelection.text,
                    });
                    setPhraseSelection(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-verdigris hover:text-parchment"
                >
                  Note
                </button>
              )}

              {/* Phrase AI study — only when that feature is wired up */}
              {onPhraseStudy && (
                <>
                  <span className="text-muted/30">|</span>
                  <button
                    onClick={() => handlePhraseStudyClick(false)}
                    className="rounded bg-brass px-2 py-1 text-xs font-medium text-ink hover:bg-brass/90"
                    title="Search this exact wording across the whole Bible in this translation"
                  >
                    Study exact wording →
                  </button>
                  {phraseSelection.strongsSequence.length > 0 && (
                    <button
                      onClick={() => handlePhraseStudyClick(true)}
                      className="rounded bg-verdigris px-2 py-1 text-xs font-medium text-ink hover:bg-verdigris/90"
                      title="Search for the same underlying original-language words, regardless of English wording"
                    >
                      Study original words →
                    </button>
                  )}
                </>
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
            setNoteCount((n) => n + 1);
            onPersonalCommentarySaved?.();
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
    </div>
  );
}
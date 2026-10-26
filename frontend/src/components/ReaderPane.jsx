import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { getAdjacentChapter } from '../utils/bibleBooks.js';
import { parseVerseTokens, collectStrongsKeys } from '../utils/parseInterlinear.js';
import VerseCommentaryEditor from './VerseCommentaryEditor.jsx';
import ShareFindingModal from './ShareFindingModal.jsx';

// ─── constants ────────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow' },
  { id: 'blue',   label: 'Blue'   },
  { id: 'green',  label: 'Green'  },
  { id: 'pink',   label: 'Pink'   },
  { id: 'purple', label: 'Purple' },
];

// Tailwind classes — full strings so JIT picks them up
const HIGHLIGHT_BG = {
  yellow: 'bg-amber-300/30',
  blue:   'bg-sky-300/30',
  green:  'bg-emerald-300/25',
  pink:   'bg-rose-300/25',
  purple: 'bg-violet-300/25',
};

const HIGHLIGHT_SWATCH = {
  yellow: 'bg-amber-400',
  blue:   'bg-sky-400',
  green:  'bg-emerald-400',
  pink:   'bg-rose-400',
  purple: 'bg-violet-400',
};

const MAX_SLOTS = 5;

// ─── pure helpers ─────────────────────────────────────────────────────────────

function groupVerses(verses) {
  const segments = [];
  let prev = null;
  for (const v of verses) {
    const sameChapter =
      prev &&
      prev.bibleBookShortTitle === v.bibleBookShortTitle &&
      prev.chapter === v.chapter;
    const contiguous =
      sameChapter && Number(v.absoluteVerseNr) === Number(prev.absoluteVerseNr) + 1;
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

function parseRefToChapter(ref) {
  if (!ref) return null;
  const m = ref.trim().match(/^(\S+)\s+(\d+)/);
  if (!m) return null;
  return { book: m[1], chapter: parseInt(m[2], 10) };
}

// Convert verseKey ("Matt-5-3") → reference string ("Matt 5:3")
function verseKeyToRef(verseKey) {
  const parts = verseKey.split('-');
  return `${parts.slice(0, -2).join('-')} ${parts[parts.length - 2]}:${parts[parts.length - 1]}`;
}

// Extract clean text from a selection range, stripping xref/footnote marker
// elements that a drag-selection can silently sweep over, which would otherwise
// fuse stray marker characters ("b", "†") into the phrase query text.
function extractCleanSelectionText(range) {
  const fragment = range.cloneContents();
  fragment.querySelectorAll('.xref-marker, .footnote-marker').forEach((el) => el.remove());
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.textContent.trim().replace(/\s+/g, ' ');
}

// Strip HTML tags to get plain readable text from SWORD verse content.
function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || '';
}

// Walk up to 4 ancestors looking for a Strong's key in the SWORD markup.
function extractStrongsData(target) {
  let el = target;
  for (let d = 0; el && d < 4; d++, el = el.parentElement) {
    if (el.dataset?.strong)
      return { key: el.dataset.strong, morph: el.dataset.morph || null, word: el.textContent?.trim() || null };
    const href = el.getAttribute?.('href') || '';
    if (href.startsWith('strong:'))
      return { key: href.slice(7), morph: null, word: el.textContent?.trim() || null };
    const titleMatch = (el.getAttribute?.('title') || '').match(/\b([GH]\d{1,5})\b/);
    if (titleMatch)
      return { key: titleMatch[1], morph: null, word: el.textContent?.trim() || null };
    if (el.classList?.contains('strongs')) {
      const t = el.textContent.trim();
      if (/^[GH]\d{1,5}$/.test(t)) return { key: t, morph: null, word: null };
    }
    const ownText = el.textContent?.trim();
    if (ownText && /^[GH]\d{1,5}$/.test(ownText))
      return { key: ownText, morph: null, word: null };
  }
  return null;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ReaderPane({
  module,
  reference,
  focusMode = false,
  noScroll = false,
  onNavigate,
  onScrollNavigate,
  onStrongsClick,
  onVerseRefClick,
  refreshNonce,
  isLoggedIn: _il,
  showMarginalia = false,
  onOpenInTab: _ooit, onAnnotate: _oa,
  onAskAboutPassage, onPhraseStudy,
  onPersonalCommentarySaved: _opcs,
  interlinearMode: interlinearModeProp,
  onInterlinearToggle,
}) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focusedVerseKey, setFocusedVerseKey] = useState(null);
  const [loadingAdjacent, setLoadingAdjacent] = useState(false);
  const [highlightMap, setHighlightMap] = useState({}); // verseKey → { id, color }
  const [contextMenu, setContextMenu] = useState(null);   // { verseKey, verseRef, x, y }
  const [noteEditor, setNoteEditor] = useState(null);     // { verseRef, x, y }
  const [shareFinding, setShareFinding] = useState(null);   // { verseRef, verseText, x, y }
  const [phraseSelection, setPhraseSelection] = useState(null); // { text, strongsSequence, x, y, verseRef }
  const [interlinearInternal, setInterlinearInternal] = useState(false);
  const [strongsCache, setStrongsCache] = useState(new Map()); // strongsKey → transcription string
  const interlinearMode = interlinearModeProp !== undefined ? interlinearModeProp : interlinearInternal;

  // ── continuous-reading refs ──────────────────────────────────────────────
  const loadedSlotKeys  = useRef(new Set());   // chapter keys currently in `verses`
  const loadingSlotKeys = useRef(new Set());   // chapter keys being fetched right now
  const slotMetaRef     = useRef([]);          // ordered [{ key, book, chapter }]
  const scrollContainerRef = useRef(null);     // this component's root div
  const actualScrollRef    = useRef(null);     // resolved scroll ancestor (differs when noScroll=true)
  const topSentinelRef     = useRef(null);
  const bottomSentinelRef  = useRef(null);
  const verseRefs          = useRef(new Map()); // verseKey → span DOM element
  const fetchedKeys        = useRef(new Set()); // keys already fetched or in-flight
  const prependScrollAnchor = useRef(null);    // { el, savedTop } — compensate scroll after prepend/trim
  const lastEmittedKey      = useRef(null);     // dedup: verseKey last emitted by scroll tracker
  const scrollEmittedRefs  = useRef(new Set()); // Set of ref strings emitted by scroll tracker (unconsumed)
  const programmaticActive = useRef(false);    // true while scrollIntoView is animating
  const pendingScroll      = useRef(false);    // set true to trigger the scroll-to effect once

  // ── highlight loader ─────────────────────────────────────────────────────

  const loadHighlights = useCallback(async (book, chapter, mod) => {
    try {
      const highlights = await api.listHighlights({ prefix: `${book} ${chapter}:` });
      setHighlightMap((prev) => {
        const next = { ...prev };
        // Clear stale entries for this chapter
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${book}-${chapter}-`)) delete next[k];
        }
        for (const hl of highlights) {
          if (hl.module !== mod) continue;
          const m = hl.reference.match(/^(\S+)\s+(\d+):(\d+)$/);
          if (m) next[`${m[1]}-${m[2]}-${m[3]}`] = { id: hl.id, color: hl.color };
        }
        return next;
      });
    } catch {
      // Not logged in or network error — silently ignore
    }
  }, []);

  // ── chapter loader ───────────────────────────────────────────────────────

  const loadSlot = useCallback(async (mod, book, chapter, position) => {
    const key = `${book}|${chapter}`;
    if (loadedSlotKeys.current.has(key) || loadingSlotKeys.current.has(key)) return;
    loadingSlotKeys.current.add(key);
    if (position !== 'reset') setLoadingAdjacent(true);
    try {
      const res = await api.getPassage(mod, `${book} ${chapter}`);
      const newVerses = res.verses || [];
      if (!newVerses.length) return;

      // Manage the rolling window of MAX_SLOTS chapters
      const current = slotMetaRef.current;
      let newSlots, trimmed = null;
      if (position === 'prepend') {
        newSlots = [{ key, book, chapter }, ...current];
        if (newSlots.length > MAX_SLOTS) trimmed = newSlots.pop();
      } else if (position === 'append') {
        newSlots = [...current, { key, book, chapter }];
        if (newSlots.length > MAX_SLOTS) trimmed = newSlots.shift();
      } else {
        newSlots = [{ key, book, chapter }];
      }
      slotMetaRef.current = newSlots;
      if (trimmed) loadedSlotKeys.current.delete(trimmed.key);
      loadedSlotKeys.current.add(key);

      // Capture a visible verse as scroll anchor before the DOM changes above the
      // viewport (prepend inserts above; trim removes from above when appending).
      // Use content-relative coordinates (el.top + scrollTop - containerTop) so the
      // saved position is stable even if the user scrolls during the async API call.
      if (position === 'prepend' || (position === 'append' && trimmed !== null)) {
        const container = actualScrollRef.current;
        if (container) {
          const containerTop = container.getBoundingClientRect().top;
          for (const [, el] of verseRefs.current) {
            const { top } = el.getBoundingClientRect();
            if (top >= containerTop) {
              prependScrollAnchor.current = {
                el,
                savedContentTop: top + container.scrollTop - containerTop,
              };
              break;
            }
          }
        }
      }

      const drop = (arr, slot) =>
        arr.filter((v) => !(v.bibleBookShortTitle === slot.book && String(v.chapter) === String(slot.chapter)));

      setVerses((prev) => {
        if (position === 'prepend') return trimmed ? [...newVerses, ...drop(prev, trimmed)] : [...newVerses, ...prev];
        if (position === 'append')  return trimmed ? [...drop(prev, trimmed), ...newVerses] : [...prev, ...newVerses];
        return newVerses;
      });

      // Remove highlights for any trimmed chapter
      if (trimmed) {
        setHighlightMap((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            if (k.startsWith(`${trimmed.book}-${trimmed.chapter}-`)) delete next[k];
          }
          return next;
        });
      }

      // Load highlights for the new chapter (non-blocking)
      loadHighlights(book, chapter, mod);
    } finally {
      loadingSlotKeys.current.delete(key);
      setLoadingAdjacent(false);
    }
  }, [loadHighlights]);

  // ── main navigation effect ───────────────────────────────────────────────

  useEffect(() => {
    if (!module || !reference) return;
    let cancelled = false;

    if (focusMode) {
      const parsed = parseRefToChapter(reference);
      if (!parsed) return;
      const slotKey = `${parsed.book}|${parsed.chapter}`;
      const verseNum = reference.includes(':') ? parseInt(reference.split(':')[1], 10) : null;

      if (loadedSlotKeys.current.has(slotKey)) {
        if (verseNum && !isNaN(verseNum)) {
          if (scrollEmittedRefs.current.has(reference)) {
            // Came from our scroll tracker — consume the entry, skip scrollIntoView
            scrollEmittedRefs.current.delete(reference);
          } else {
            // Explicit navigation — scroll to the verse
            setFocusedVerseKey(`${parsed.book}-${parsed.chapter}-${verseNum}`);
            pendingScroll.current = true;
          }
        }
        return;
      }

      // New location — full reset, then load anchor + neighbours
      loadedSlotKeys.current.clear();
      loadingSlotKeys.current.clear();
      slotMetaRef.current = [];
      lastEmittedKey.current = null;
      scrollEmittedRefs.current.clear();
      prependScrollAnchor.current = null; // discard any in-flight anchor from previous location
      setVerses([]);
      setHighlightMap({});
      setFocusedVerseKey(null);
      setError(null);
      setLoading(true);

      const prevAdj = getAdjacentChapter(parsed.book, parsed.chapter, -1);
      const nextAdj = getAdjacentChapter(parsed.book, parsed.chapter,  1);

      (async () => {
        await loadSlot(module, parsed.book, parsed.chapter, 'reset');
        if (cancelled) return;
        if (verseNum && !isNaN(verseNum)) {
          pendingScroll.current = true;
          setFocusedVerseKey(`${parsed.book}-${parsed.chapter}-${verseNum}`);
        }
        const tasks = [];
        if (prevAdj) tasks.push(loadSlot(module, prevAdj.book, prevAdj.chapter, 'prepend'));
        if (nextAdj) tasks.push(loadSlot(module, nextAdj.book, nextAdj.chapter, 'append'));
        await Promise.allSettled(tasks);
      })()
        .catch((e) => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });

      return () => { cancelled = true; };
    }

    // Non-focusMode: single chapter
    setLoading(true);
    setError(null);
    setVerses([]);
    setHighlightMap({});
    api.getPassage(module, reference)
      .then((res) => {
        if (cancelled) return;
        setVerses(res.verses || []);
        const parsed = parseRefToChapter(reference);
        if (parsed) loadHighlights(parsed.book, parsed.chapter, module);
      })
      .catch((e)  => { if (!cancelled) setError(e.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [module, reference, focusMode, refreshNonce, loadSlot, loadHighlights]);

  // ── scroll to pending verse ──────────────────────────────────────────────

  useEffect(() => {
    if (!focusMode || !focusedVerseKey || !pendingScroll.current) return;
    const el = verseRefs.current.get(focusedVerseKey);
    if (!el) return;
    pendingScroll.current = false;
    programmaticActive.current = true;
    lastEmittedKey.current = null;
    scrollEmittedRefs.current.clear();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { programmaticActive.current = false; }, 600);
  }, [focusMode, focusedVerseKey, verses]);

  // ── resolve actual scroll container ─────────────────────────────────────

  useEffect(() => {
    if (!focusMode) return;
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    let container = null;
    let p = sentinel.parentElement;
    while (p && p !== document.body) {
      const { overflowY } = getComputedStyle(p);
      if (overflowY === 'auto' || overflowY === 'scroll') { container = p; break; }
      p = p.parentElement;
    }
    if (!container) container = scrollContainerRef.current;
    actualScrollRef.current = container;
    // Disable browser scroll anchoring so our useLayoutEffect compensation is the
    // sole adjuster — browser anchoring + manual compensation = double-correction.
    if (container) {
      container.style.overflowAnchor = 'none';
      return () => { container.style.overflowAnchor = ''; };
    }
  }, [focusMode]);

  // ── IntersectionObserver: lazy-load chapters at scroll edges ────────────

  useEffect(() => {
    if (!focusMode) return;
    const topEl = topSentinelRef.current;
    const botEl = bottomSentinelRef.current;
    if (!topEl || !botEl) return;
    const root = actualScrollRef.current || undefined;
    const io = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        if (target === topEl) {
          const first = slotMetaRef.current[0];
          if (first) {
            const adj = getAdjacentChapter(first.book, first.chapter, -1);
            if (adj) loadSlot(module, adj.book, adj.chapter, 'prepend');
          }
        } else {
          const last = slotMetaRef.current[slotMetaRef.current.length - 1];
          if (last) {
            const adj = getAdjacentChapter(last.book, last.chapter, 1);
            if (adj) loadSlot(module, adj.book, adj.chapter, 'append');
          }
        }
      }
    }, { root, rootMargin: '600px 0px 600px 0px' });
    io.observe(topEl);
    io.observe(botEl);
    return () => io.disconnect();
  }, [focusMode, module, loadSlot]);

  // ── scroll tracker ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!focusMode) return;
    const emit = onScrollNavigate || onNavigate;
    if (!emit) return;
    let raf = null;
    let endTimer = null;

    function evaluate() {
      if (programmaticActive.current) return;
      // User is manually scrolling — cancel any deferred programmatic scroll
      pendingScroll.current = false;
      const container = actualScrollRef.current;
      if (!container) return;
      const containerTop = container.getBoundingClientRect().top;
      const threshold = container.clientHeight * 0.35;
      let bestKey = null, bestY = -Infinity, fallbackKey = null, fallbackY = Infinity;
      for (const [key, el] of verseRefs.current) {
        const relTop = el.getBoundingClientRect().top - containerTop;
        if (relTop <= threshold && relTop > bestY) { bestY = relTop; bestKey = key; }
        if (relTop > threshold && relTop < fallbackY) { fallbackY = relTop; fallbackKey = key; }
      }
      const verseKey = bestKey || fallbackKey;
      if (!verseKey || verseKey === lastEmittedKey.current) return;
      lastEmittedKey.current = verseKey;
      const parts = verseKey.split('-');
      const refString = `${parts.slice(0, -2).join('-')} ${parts[parts.length - 2]}:${parts[parts.length - 1]}`;
      scrollEmittedRefs.current.add(refString);
      emit(refString);
      setFocusedVerseKey(verseKey);
    }

    function onScroll() {
      // Throttle live updates to one per animation frame
      if (!raf) {
        raf = requestAnimationFrame(() => { raf = null; evaluate(); });
      }
      // Final evaluation after scroll settles — fixes cases where the rAF snapshot
      // landed mid-animation on the wrong verse (e.g. one scroll-wheel click)
      clearTimeout(endTimer);
      endTimer = setTimeout(evaluate, 100);
    }

    const timer = setTimeout(() => {
      const c = actualScrollRef.current;
      if (c) c.addEventListener('scroll', onScroll, { passive: true });
    }, 50);
    return () => {
      clearTimeout(timer);
      clearTimeout(endTimer);
      const c = actualScrollRef.current;
      if (c) c.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [focusMode, onNavigate, onScrollNavigate]);

  // ── scroll position compensation after prepend / trim ───────────────────
  // Runs synchronously after commit so the correction is invisible to the user.

  useLayoutEffect(() => {
    const anchor = prependScrollAnchor.current;
    if (!anchor) return;
    prependScrollAnchor.current = null;
    const container = actualScrollRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    const newContentTop = anchor.el.getBoundingClientRect().top + container.scrollTop - containerTop;
    const delta = newContentTop - anchor.savedContentTop;
    if (Math.abs(delta) > 0) container.scrollTop += delta;
  }, [verses]);

  // ── interlinear: fetch Strong's transcriptions ───────────────────────────

  useEffect(() => {
    if (!interlinearMode || verses.length === 0) return;
    const keys = collectStrongsKeys(verses);
    const missing = keys.filter((k) => !fetchedKeys.current.has(k));
    if (missing.length === 0) return;
    for (const k of missing) fetchedKeys.current.add(k);
    Promise.allSettled(missing.map((k) => api.getStrongsEntry(k).then((entry) => ({ k, entry }))))
      .then((results) => {
        const updates = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.entry?.transcription) {
            updates.push([r.value.k, r.value.entry.transcription]);
          }
        }
        if (updates.length > 0) {
          setStrongsCache((prev) => {
            const next = new Map(prev);
            for (const [k, t] of updates) next.set(k, t);
            return next;
          });
        }
      });
  }, [interlinearMode, verses]);

  function toggleInterlinear() {
    if (onInterlinearToggle) {
      onInterlinearToggle(!interlinearMode);
    } else {
      setInterlinearInternal((v) => !v);
    }
  }

  // ── highlight actions ────────────────────────────────────────────────────

  async function handleHighlightToggle(color) {
    if (!contextMenu) return;
    const { verseKey, selectedVerseKeys } = contextMenu;
    setContextMenu(null);

    // When a text selection spans multiple verses, highlight all of them;
    // otherwise fall back to the single right-clicked verse.
    const keys = selectedVerseKeys?.length ? selectedVerseKeys : (verseKey ? [verseKey] : []);
    if (keys.length === 0) return;

    const snapshot = { ...highlightMap };

    // If every verse in the selection already has this color, toggle all off.
    if (keys.every((k) => snapshot[k]?.color === color)) {
      setHighlightMap((prev) => {
        const n = { ...prev };
        for (const k of keys) delete n[k];
        return n;
      });
      for (const k of keys) {
        const existing = snapshot[k];
        if (existing) api.deleteHighlight(existing.id).catch(() => {
          setHighlightMap((prev) => ({ ...prev, [k]: existing }));
        });
      }
      return;
    }

    // Optimistic: apply color to all selected verses immediately.
    const now = Date.now();
    const tempIds = Object.fromEntries(keys.map((k) => [k, `temp-${now}-${k}`]));
    setHighlightMap((prev) => {
      const n = { ...prev };
      for (const k of keys) n[k] = { id: tempIds[k], color };
      return n;
    });

    await Promise.allSettled(keys.map(async (k) => {
      const ref = verseKeyToRef(k);
      const existing = snapshot[k];
      const tempId = tempIds[k];
      try {
        if (existing) await api.deleteHighlight(existing.id);
        const created = await api.createHighlight({ reference: ref, module, color });
        setHighlightMap((prev) => {
          if (prev[k]?.id !== tempId) return prev;
          return { ...prev, [k]: { id: created.id, color } };
        });
      } catch {
        setHighlightMap((prev) => {
          if (prev[k]?.id !== tempId) return prev;
          const n = { ...prev };
          if (existing) n[k] = existing; else delete n[k];
          return n;
        });
      }
    }));
  }

  function getVerseText(verseKey) {
    const parts = verseKey.split('-');
    const book = parts.slice(0, -2).join('-');
    const chapter = parts[parts.length - 2];
    const verseNr = parts[parts.length - 1];
    const v = verses.find(
      (x) => x.bibleBookShortTitle === book && String(x.chapter) === chapter && String(x.verseNr) === verseNr
    );
    return v ? stripHtml(v.content) : '';
  }

  async function handleCopy() {
    if (!contextMenu) return;
    const { verseRef } = contextMenu;
    const text = contextMenu.selectionText ?? getVerseText(contextMenu.verseKey);
    const content = `${text}${verseRef ? `\n— ${verseRef} (${module})` : ''}`;
    setContextMenu(null);
    window.getSelection()?.removeAllRanges();
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* nothing more we can do */ }
      document.body.removeChild(ta);
    }
  }

  function handleShare() {
    if (!contextMenu) return;
    const { verseRef, x, y } = contextMenu;
    const verseText = contextMenu.selectionText ?? getVerseText(contextMenu.verseKey);
    setShareFinding({ verseRef, verseText, x, y });
    setContextMenu(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleAskAbout() {
    if (!contextMenu) return;
    onAskAboutPassage?.(module, contextMenu.verseRef);
    setContextMenu(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleContentMouseUp(e) {
    const selection = window.getSelection();
    const rawText = selection?.toString().trim();
    if (!rawText || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const container = e.currentTarget;
    if (!container.contains(range.commonAncestorContainer)) return;

    const text = extractCleanSelectionText(range);
    if (!text) return;

    // Only show phrase toolbar for short selections (≤ 5 words).
    // Longer selections stay highlighted so the user can right-click to copy/share.
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount > 5) return;

    // Collect one Strong's key per tagged word the selection overlaps (reading order)
    const strongsSequence = [];
    for (const el of container.querySelectorAll('[data-strong]')) {
      if (range.intersectsNode(el)) {
        const keys = (el.dataset.strong || '').split(',').map((k) => k.trim()).filter(Boolean);
        if (keys.length > 0) strongsSequence.push(keys[0]);
      }
    }

    // Find the first verse span the selection touches for the note editor
    let verseRef = null;
    for (const [key, el] of verseRefs.current) {
      if (range.intersectsNode(el)) { verseRef = verseKeyToRef(key); break; }
    }

    const rect = range.getBoundingClientRect();
    setContextMenu(null);
    setPhraseSelection({ text, strongsSequence, x: rect.left, y: rect.bottom + 8, verseRef });
  }

  function handlePhraseStudy(useOriginalWords) {
    if (!phraseSelection) return;
    onPhraseStudy?.(
      phraseSelection.text,
      module,
      useOriginalWords ? phraseSelection.strongsSequence : undefined,
    );
    setPhraseSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  // ── event handlers ───────────────────────────────────────────────────────

  function handleContextMenu(e) {
    e.preventDefault();
    setPhraseSelection(null);
    setNoteEditor(null);

    // Always try to find the right-clicked verse span (for highlights + note).
    const span = e.target.closest('[data-versekey]');
    const verseKey = span?.dataset.versekey ?? null;
    let verseRef = verseKey ? verseKeyToRef(verseKey) : null;

    // Also check for an active text selection — use its text for copy/share,
    // and collect every verse the selection spans so highlights cover all of them.
    let selectionText = null;
    let selectedVerseKeys = null; // all verse keys the selection overlaps
    const sel = window.getSelection();
    const selRaw = sel?.toString().trim();
    if (selRaw && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      if (e.currentTarget.contains(range.commonAncestorContainer)) {
        selectionText = extractCleanSelectionText(range);
        const keys = [];
        for (const [key, el] of verseRefs.current) {
          if (range.intersectsNode(el)) keys.push(key);
        }
        if (keys.length > 0) {
          selectedVerseKeys = keys;
          if (!verseRef) verseRef = verseKeyToRef(keys[0]);
        }
      }
    }

    if (!verseKey && !verseRef) return;
    setContextMenu({ verseKey, verseRef, selectionText, selectedVerseKeys, x: e.clientX, y: e.clientY });
  }

  function handleClick(e) {
    // Verse number superscript → navigate to that verse
    const sup = e.target.closest('sup[data-verse-number]');
    if (sup) {
      const verseSpan = sup.closest('[data-versekey]');
      if (verseSpan) { onNavigate?.(verseKeyToRef(verseSpan.dataset.versekey)); return; }
    }
    const xref = e.target.closest('.xref-marker');
    if (xref) { onVerseRefClick?.(xref.dataset.refs, e); return; }
    const vref = e.target.closest('.verse-ref');
    if (vref) { onVerseRefClick?.(vref.dataset.ref, e); return; }
    if (onStrongsClick) {
      const s = extractStrongsData(e.target);
      if (s) onStrongsClick(s.key, e, s.morph, s.word, module);
    }
  }

  // ── derived ──────────────────────────────────────────────────────────────

  const segments = useMemo(() => groupVerses(verses), [verses]);
  const firstVerse = verses[0];

  function goToChapter(delta) {
    if (!firstVerse) return;
    const adj = getAdjacentChapter(firstVerse.bibleBookShortTitle, Number(firstVerse.chapter), delta);
    if (adj) onNavigate?.(`${adj.book} ${adj.chapter}`);
  }

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={scrollContainerRef}
      className={`${noScroll ? '' : 'h-full overflow-y-auto '}bg-page px-6 py-6 text-pageText`}
    >
      {!focusMode && (
        <header className="mb-4 flex items-baseline gap-3">
          <h1 className="font-display text-2xl text-pageText">{reference || 'Select a passage'}</h1>
          {module && <span className="font-mono text-xs uppercase tracking-wide text-pageMuted">{module}</span>}
          <div className="ml-auto flex items-center gap-2">
            {showMarginalia && (
              <button
                onClick={toggleInterlinear}
                title="Toggle interlinear mode"
                className={`rounded border px-2 py-1 text-xs transition-colors ${interlinearMode ? 'border-verdigris text-verdigris' : 'border-pageBorder text-pageMuted hover:border-pageAccent hover:text-pageText'}`}
              >
                Interlinear
              </button>
            )}
            {firstVerse && (
              <>
                <button
                  onClick={() => goToChapter(-1)}
                  className="rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
                >‹</button>
                <button
                  onClick={() => goToChapter(1)}
                  className="rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
                >›</button>
              </>
            )}
          </div>
        </header>
      )}

      {focusMode && <div ref={topSentinelRef} className="pointer-events-none h-1" />}

      {loading && verses.length === 0 && <p className="text-pageMuted">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {verses.length > 0 && (
        <div
          className="max-w-2xl font-display text-base leading-relaxed text-pageText verse-content"
          onClick={handleClick}
          onMouseUp={handleContentMouseUp}
          onContextMenu={handleContextMenu}
        >
          {segments.map((seg) => (
            <div key={seg.key}>
              {seg.showHeader && (
                <h2 className="mb-1 mt-4 border-t border-pageBorder pt-4 font-sans text-xs uppercase tracking-wide text-verdigris first:mt-0 first:border-t-0 first:pt-0">
                  {seg.header}
                </h2>
              )}
              {seg.sectionTitles.length > 0 && (
                <h3 className="mb-2 mt-1 font-display text-lg italic text-pageAccent">
                  {seg.sectionTitles.join(' — ')}
                </h3>
              )}
              {interlinearMode ? (
                <div className="flex flex-wrap items-start gap-x-2 gap-y-4">
                  {seg.verses.map((v) => {
                    const verseKey = `${v.bibleBookShortTitle}-${v.chapter}-${v.verseNr}`;
                    const isFocused = focusMode && verseKey === focusedVerseKey;
                    const hlEntry = highlightMap[verseKey];
                    const tokens = parseVerseTokens(v.content);
                    return (
                      <span
                        key={verseKey}
                        data-versekey={verseKey}
                        ref={(el) => {
                          if (el) verseRefs.current.set(verseKey, el);
                          else verseRefs.current.delete(verseKey);
                        }}
                        className={[
                          'inline-flex flex-wrap items-start gap-x-1.5 gap-y-2',
                          hlEntry ? HIGHLIGHT_BG[hlEntry.color] : '',
                          isFocused ? 'bg-brass/10' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <sup data-verse-number="true" className="mt-1 cursor-pointer select-none text-xs text-pageAccent hover:text-brass">{v.verseNr}</sup>
                        {tokens.map((tok, ti) =>
                          tok.type === 'text' ? (
                            <span key={ti} className="font-display text-sm text-pageText">{tok.text}</span>
                          ) : (
                            <span key={ti} className="inline-flex flex-col items-center gap-0.5 text-center">
                              <span className="font-display text-sm leading-snug text-pageText">{tok.word}</span>
                              <button
                                className="font-mono text-[10px] leading-none text-verdigris hover:text-brass"
                                onClick={(e) => { e.stopPropagation(); onStrongsClick?.(tok.strong, e, tok.morph, tok.word, module); }}
                              >
                                {tok.strong.split(',')[0]}
                              </button>
                              <span className="text-[10px] leading-none italic text-pageMuted">
                                {strongsCache.get(tok.strong.split(',')[0]) ?? '…'}
                              </span>
                            </span>
                          )
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="break-words">
                  {seg.verses.map((v) => {
                    const verseKey = `${v.bibleBookShortTitle}-${v.chapter}-${v.verseNr}`;
                    const isFocused = focusMode && verseKey === focusedVerseKey;
                    const hlEntry = highlightMap[verseKey];
                    return (
                      <span
                        key={verseKey}
                        data-versekey={verseKey}
                        ref={(el) => {
                          if (el) verseRefs.current.set(verseKey, el);
                          else verseRefs.current.delete(verseKey);
                        }}
                        className={[
                          'rounded',
                          hlEntry ? HIGHLIGHT_BG[hlEntry.color] : '',
                          isFocused ? 'bg-brass/10' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <sup data-verse-number="true" className="mr-1 cursor-pointer select-none text-xs text-pageAccent hover:text-brass">{v.verseNr}</sup>
                        <span dangerouslySetInnerHTML={{ __html: v.content }} />{' '}
                      </span>
                    );
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {focusMode && <div ref={bottomSentinelRef} className="pointer-events-none h-1" />}

      {!loading && !error && verses.length === 0 && reference && (
        <p className="text-pageMuted">No text for {reference} in {module}.</p>
      )}

      {/* Right-click context menu */}
      {contextMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => { setContextMenu(null); window.getSelection()?.removeAllRanges(); }}
          />
          <div
            className="fixed z-[70] rounded-lg border border-rule bg-panel shadow-xl"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 240),
              top: Math.min(contextMenu.y + 4, window.innerHeight - 120),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Highlight swatches + note — only when a specific verse was right-clicked */}
            {contextMenu.verseKey && (
              <div className="flex items-center gap-1.5 px-2.5 py-2">
                {HIGHLIGHT_COLORS.map((c) => {
                  const isActive = highlightMap[contextMenu.verseKey]?.color === c.id;
                  return (
                    <button
                      key={c.id}
                      title={c.label}
                      onClick={() => handleHighlightToggle(c.id)}
                      className={`h-6 w-6 rounded-full ${HIGHLIGHT_SWATCH[c.id]} border-2 transition-transform hover:scale-110 ${
                        isActive ? 'border-parchment scale-110' : 'border-transparent hover:border-parchment/50'
                      }`}
                    />
                  );
                })}
                <div className="mx-1 h-5 w-px bg-rule" />
                <button
                  title="Add note"
                  onClick={() => {
                    setNoteEditor({ verseRef: contextMenu.verseRef, x: contextMenu.x, y: contextMenu.y });
                    setContextMenu(null);
                  }}
                  className="px-2 py-1 text-xs text-muted hover:text-parchment"
                >
                  ✎
                </button>
              </div>
            )}
            {/* Copy / Share / Ask AI */}
            <div className={`flex items-center gap-0.5 px-2 py-1.5 ${contextMenu.verseKey ? 'border-t border-rule' : ''}`}>
              <button onClick={handleCopy} className="flex-1 rounded px-2 py-1 text-xs text-muted hover:bg-brass/10 hover:text-parchment">
                Copy
              </button>
              <button onClick={handleShare} className="flex-1 rounded px-2 py-1 text-xs text-muted hover:bg-brass/10 hover:text-parchment">
                Share
              </button>
              {onAskAboutPassage && (
                <button onClick={handleAskAbout} className="flex-1 rounded px-2 py-1 text-xs text-muted hover:bg-brass/10 hover:text-parchment">
                  Ask AI
                </button>
              )}
            </div>
            {/* Footer: verse ref */}
            {contextMenu.verseRef && (
              <div className="border-t border-rule px-2.5 py-1">
                <span className="font-mono text-[10px] text-muted">{contextMenu.verseRef}</span>
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      {/* Note editor */}
      {noteEditor && (
        <VerseCommentaryEditor
          reference={noteEditor.verseRef}
          x={noteEditor.x}
          y={noteEditor.y}
          onClose={() => setNoteEditor(null)}
          onSaved={() => setNoteEditor(null)}
        />
      )}

      {/* Phrase / word study toolbar */}
      {phraseSelection && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => { setPhraseSelection(null); window.getSelection()?.removeAllRanges(); }}
          />
          <div
            className="fixed z-[70] flex flex-wrap items-center gap-1 rounded-md border border-rule bg-panel p-1.5 shadow-2xl"
            style={{
              left: Math.min(phraseSelection.x, window.innerWidth - 480),
              top: Math.min(phraseSelection.y, window.innerHeight - 60),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="max-w-[200px] truncate px-1 font-mono text-[10px] text-muted">
              "{phraseSelection.text}"
            </span>
            <div className="h-4 w-px bg-rule" />
            <button
              onClick={() => handlePhraseStudy(false)}
              className="rounded bg-brass px-2 py-1 text-xs font-medium text-ink hover:bg-brass/90"
              title="Search this exact wording across the whole Bible in this translation"
            >
              Study wording →
            </button>
            {phraseSelection.strongsSequence.length > 0 && (
              <button
                onClick={() => handlePhraseStudy(true)}
                className="rounded bg-verdigris px-2 py-1 text-xs font-medium text-ink hover:bg-verdigris/90"
                title="Search for the same underlying original-language words, regardless of English wording"
              >
                Study original words →
              </button>
            )}
            {phraseSelection.verseRef && (
              <button
                onClick={() => {
                  setNoteEditor({ verseRef: phraseSelection.verseRef, x: phraseSelection.x, y: phraseSelection.y + 32 });
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

      {/* Share finding to Study */}
      {shareFinding && (
        <ShareFindingModal
          reference={shareFinding.verseRef}
          module={module}
          verseText={shareFinding.verseText}
          x={shareFinding.x}
          y={shareFinding.y}
          onClose={() => setShareFinding(null)}
          onShared={() => setShareFinding(null)}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Bookmark, BookMarked, BookOpen, ChevronLeft, ChevronRight, ExternalLink, Maximize2, Minus, Pencil, Plus, ScanText, Search, StickyNote, Trash2, X } from 'lucide-react';
import { BOOK_HIGHLIGHT_COLORS } from '../utils/bookHtml.js';
import { detectBibleRefs } from '../utils/bibleRefDetect.js';
import { api } from '../api/client.js';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const COLORS = Object.entries(BOOK_HIGHLIGHT_COLORS).map(([id, { bg, label }]) => ({ id, bg, label }));
const SWATCH_RING = { yellow: '#ca8a04', green: '#16a34a', blue: '#3b82f6', pink: '#db2777' };

/**
 * Apply stored highlights to the react-pdf text layer by span-level overlap.
 *
 * PDF.js absolutely-positions each span so adjacent words have no space
 * characters between their textContent values, but the browser's
 * getSelection().toString() DOES insert spaces at visual word boundaries.
 * We normalise whitespace in both the stored quote and the concatenated span
 * text before matching, then use character-position overlap to colour spans.
 */
function applyHighlightsToTextLayer(textLayer, highlights) {
  textLayer.querySelectorAll('[data-pdf-hl]').forEach((span) => {
    span.style.backgroundColor = '';
    span.style.borderRadius = '';
    delete span.dataset.pdfHl;
  });
  if (!highlights.length) return;

  const spans = Array.from(textLayer.querySelectorAll('span'))
    .filter((s) => s.textContent.trim().length > 0);

  const spanTexts = spans.map((s) => s.textContent.replace(/\s+/g, ' ').trim());
  const fullNorm = spanTexts.join(' ');

  const spanMap = [];
  let pos = 0;
  for (let i = 0; i < spans.length; i++) {
    spanMap.push({ span: spans[i], start: pos, end: pos + spanTexts[i].length });
    pos += spanTexts[i].length + 1;
  }

  for (const hl of highlights) {
    if (!hl.quote) continue;
    const quoteNorm = hl.quote.replace(/\s+/g, ' ').trim();
    if (!quoteNorm) continue;
    const colorId = hl.tags?.find((t) => BOOK_HIGHLIGHT_COLORS[t]) || 'yellow';
    const bg = BOOK_HIGHLIGHT_COLORS[colorId]?.bg ?? BOOK_HIGHLIGHT_COLORS.yellow.bg;
    const idx = fullNorm.indexOf(quoteNorm);
    if (idx === -1) continue;
    const end = idx + quoteNorm.length;
    for (const { span, start, end: spanEnd } of spanMap) {
      if (start < end && spanEnd > idx) {
        span.style.backgroundColor = bg;
        span.style.borderRadius = '3px';
        span.dataset.pdfHl = hl.id;
      }
    }
  }
}

function applySearchToTextLayer(textLayer, query) {
  textLayer.querySelectorAll('[data-pdf-search]').forEach((span) => {
    span.style.removeProperty('box-shadow');
    delete span.dataset.pdfSearch;
  });
  if (!query.trim()) return;
  const q = query.toLowerCase();
  textLayer.querySelectorAll('span').forEach((span) => {
    if (span.textContent.toLowerCase().includes(q)) {
      span.style.boxShadow = '0 0 0 2px rgba(232,164,65,0.55), inset 0 0 0 99px rgba(232,164,65,0.18)';
      span.dataset.pdfSearch = '1';
    }
  });
}

function TocEntry({ item, depth, onNavigate }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = item.items?.length > 0;
  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: `${8 + depth * 16}px` }}>
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mr-1 shrink-0 rounded p-0.5 text-pageMuted hover:text-pageText"
          >
            <ChevronRight size={11} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="mr-1 w-4 shrink-0" />
        )}
        <button
          onClick={() => onNavigate(item)}
          className={`flex-1 truncate py-1.5 pr-3 text-left transition-colors hover:text-pageAccent ${
            depth === 0 ? 'text-sm font-medium text-pageText' : 'text-xs text-pageMuted'
          }`}
        >
          {item.title}
        </button>
      </div>
      {hasChildren && expanded && item.items.map((child, i) => (
        <TocEntry key={i} item={child} depth={depth + 1} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export default function PDFBody({ documentId, doc, isAdmin, isLoggedIn, onOcr, ocrRunning, ocrError, onOpenInCell }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [pageRefs, setPageRefs] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [nativePageWidth, setNativePageWidth] = useState(null);
  const scaleRef = useRef(1.2);
  const scrollAreaRef = useRef(null);

  // TOC
  const [tocItems, setTocItems] = useState([]);
  const [showToc, setShowToc] = useState(false);
  const pdfDocRef = useRef(null);

  // Annotations
  const [docHighlights, setDocHighlights] = useState([]);
  const [selectionInfo, setSelectionInfo] = useState(null); // { text, page, rect }
  const [noteMode, setNoteMode] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [noteColor, setNoteColor] = useState(null);
  const [savingAnnotation, setSavingAnnotation] = useState(false);
  const [annotationRefresh, setAnnotationRefresh] = useState(0);
  const [removeTarget, setRemoveTarget] = useState(null); // { id, rect }

  // Bookmarks
  const [docBookmarks, setDocBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkRefresh, setBookmarkRefresh] = useState(0);
  const [editingBmId, setEditingBmId] = useState(null);
  const [editingBmLabel, setEditingBmLabel] = useState('');
  const bmEditRef = useRef(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]); // { page, prefix, match, suffix }[]
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const pageTextsRef = useRef(null); // Map<pageNum, string>, built lazily
  const searchInputRef = useRef(null);

  const pageWrapperRef = useRef(null);
  const popupRef = useRef(null);
  const noteInputRef = useRef(null);
  const fileUrl = api.documentFileUrl(documentId);

  // ── Arrow-key navigation ───────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      const active = document.activeElement;
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.isContentEditable) return;
      if (e.key === 'ArrowLeft') setPageNumber((p) => Math.max(1, p - 1));
      if (e.key === 'ArrowRight') setPageNumber((p) => Math.min(numPages ?? p, p + 1));
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [numPages]);

  // Keep scaleRef in sync for pinch handler closure
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // ── Pinch-to-zoom ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    let startDist = null;
    let startScale = 1;

    function pinchDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        startDist = pinchDist(e.touches);
        startScale = scaleRef.current;
      }
    }

    function onTouchMove(e) {
      if (e.touches.length !== 2 || startDist === null) return;
      e.preventDefault();
      const newScale = Math.min(3, Math.max(0.5, +(startScale * pinchDist(e.touches) / startDist).toFixed(2)));
      setScale(newScale);
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) startDist = null;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ── Load highlights ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    api.listNotes({ prefix: `pdf-highlight:${documentId}` })
      .then((notes) => setDocHighlights(notes.filter((n) => n.tags?.includes('pdf-highlight'))))
      .catch(() => {});
  }, [documentId, isLoggedIn, annotationRefresh]);

  // ── Load bookmarks ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    api.listBookmarks({ reference: `pdf-bookmark:${documentId}` })
      .then(setDocBookmarks)
      .catch(() => {});
  }, [documentId, isLoggedIn, bookmarkRefresh]);

  // ── Re-apply highlights ────────────────────────────────────────────────────
  // PDF.js adds text spans incrementally via requestAnimationFrame.  An early
  // "try immediately" return races with partial span injection — the text is
  // incomplete so indexOf misses, returns true anyway, and no observer is set
  // up.  Fix: always apply immediately (harmless if incomplete) AND always
  // set up a debounced observer that fires after 200 ms of no DOM mutations,
  // guaranteeing a final apply once ALL spans are present.
  useEffect(() => {
    const wrapper = pageWrapperRef.current;
    if (!wrapper) return;

    const pageHls = docHighlights.filter((n) => n.module === String(pageNumber));

    function getTextLayer() {
      return (
        wrapper.querySelector('.react-pdf__Page__textContent') ||
        wrapper.querySelector('.textLayer')
      );
    }

    function applyNow() {
      const tl = getTextLayer();
      if (!tl) return;
      applyHighlightsToTextLayer(tl, pageHls);
    }

    // Apply immediately — works when text layer is already fully rendered
    // (e.g. after docHighlights refresh on the current page).
    applyNow();

    if (pageHls.length === 0) return;

    // Also watch for text layer mutations so we catch page turns where PDF.js
    // adds spans incrementally.  Debounce 200 ms after the last mutation.
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyNow, 200);
    });
    observer.observe(wrapper, { childList: true, subtree: true });
    const bail = setTimeout(() => observer.disconnect(), 10_000);
    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
      clearTimeout(bail);
    };
  }, [pageNumber, docHighlights]);

  // ── PDF document load ──────────────────────────────────────────────────────
  function onDocumentLoadSuccess(pdfDoc) {
    pdfDocRef.current = pdfDoc;
    pageTextsRef.current = null;
    setNumPages(pdfDoc.numPages);
    setLoadError(null);
    setPageNumber(1);
    setNativePageWidth(null);
    setSearchQuery('');
    setSearchResults([]);
    pdfDoc.getOutline()
      .then((outline) => setTocItems(outline ?? []))
      .catch(() => setTocItems([]));
  }

  function onPageRenderSuccess({ width }) {
    setNativePageWidth((prev) => prev ?? Math.round(width / scaleRef.current));
  }

  const onGetTextSuccess = useCallback(({ items }) => {
    setPageRefs(detectBibleRefs(items.map((i) => i.str).join(' ')));
  }, []);

  // ── TOC navigation ─────────────────────────────────────────────────────────
  async function navigateTocItem(item) {
    const pdfDoc = pdfDocRef.current;
    if (!pdfDoc || !item.dest) return;
    try {
      const dest = typeof item.dest === 'string' ? await pdfDoc.getDestination(item.dest) : item.dest;
      if (!dest?.[0]) return;
      setPageNumber(await pdfDoc.getPageIndex(dest[0]) + 1);
      setShowToc(false);
    } catch {}
  }

  // ── Page controls ──────────────────────────────────────────────────────────
  function prevPage() { setPageNumber((p) => Math.max(1, p - 1)); setPageRefs([]); }
  function nextPage() { setPageNumber((p) => Math.min(numPages ?? p, p + 1)); setPageRefs([]); }
  function zoomIn()   { setScale((s) => Math.min(3, +(s + 0.2).toFixed(1))); }
  function zoomOut()  { setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1))); }
  function fitWidth() {
    const el = scrollAreaRef.current;
    if (!el || !nativePageWidth) return;
    const availW = el.clientWidth - 32;
    setScale(Math.min(3, Math.max(0.5, +(availW / nativePageWidth).toFixed(2))));
  }

  // ── Annotation handlers ────────────────────────────────────────────────────
  function handleMouseUp(e) {
    if (popupRef.current?.contains(e.target)) return;

    const sel = window.getSelection();
    const selText = sel?.toString().trim() ?? '';

    if (!selText) {
      // Click on an existing highlight → offer removal.
      const hlEl = e.target.dataset?.pdfHl
        ? e.target
        : e.target.closest?.('[data-pdf-hl]');
      if (hlEl?.dataset.pdfHl) {
        setRemoveTarget({ id: hlEl.dataset.pdfHl, rect: hlEl.getBoundingClientRect() });
        setSelectionInfo(null);
        setNoteMode(false);
        return;
      }

      setRemoveTarget(null);
      dismissPopup();

      // If the click was inside the text layer, leave it alone (cursor positioning).
      // Outside the text layer (canvas, gray background) → navigate by page half.
      const textLayer =
        pageWrapperRef.current?.querySelector('.react-pdf__Page__textContent') ||
        pageWrapperRef.current?.querySelector('.textLayer');
      if (!textLayer?.contains(e.target)) {
        const midX = e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2;
        if (e.clientX < midX) {
          setPageNumber((p) => Math.max(1, p - 1));
        } else {
          setPageNumber((p) => Math.min(numPages ?? p, p + 1));
        }
      }
      return;
    }

    const range = sel.getRangeAt(0);
    const textLayer =
      pageWrapperRef.current?.querySelector('.react-pdf__Page__textContent') ||
      pageWrapperRef.current?.querySelector('.textLayer');
    if (!textLayer?.contains(range.commonAncestorContainer)) { dismissPopup(); return; }

    setRemoveTarget(null);
    setSelectionInfo({ text: selText, page: pageNumber, rect: range.getBoundingClientRect() });
    setNoteMode(false);
    setNoteBody('');
    setNoteColor(null);
  }

  function dismissPopup() {
    setSelectionInfo(null);
    setNoteMode(false);
    setRemoveTarget(null);
    window.getSelection()?.removeAllRanges();
  }

  async function saveHighlight(colorId) {
    if (!selectionInfo) return;
    const { text, page } = selectionInfo;
    dismissPopup();
    setSavingAnnotation(true);
    try {
      await api.createNote({
        reference: `pdf-highlight:${documentId}`,
        module: String(page),
        quote: text,
        tags: ['pdf-highlight', colorId],
        body: '',
        title: text.slice(0, 80),
      });
      setAnnotationRefresh((r) => r + 1);
    } catch {}
    setSavingAnnotation(false);
  }

  async function saveNote() {
    if (!selectionInfo || !noteBody.trim()) return;
    const { text, page } = selectionInfo;
    setSavingAnnotation(true);
    try {
      await api.createNote({
        reference: `pdf-highlight:${documentId}`,
        module: String(page),
        quote: text,
        tags: noteColor ? ['pdf-highlight', noteColor] : ['pdf-highlight'],
        body: noteBody.trim(),
        title: text.slice(0, 80),
      });
      setAnnotationRefresh((r) => r + 1);
      dismissPopup();
    } catch {}
    setSavingAnnotation(false);
  }

  async function removeHighlight(id) {
    try {
      await api.deleteNote(id);
      setAnnotationRefresh((r) => r + 1);
    } catch {}
    setRemoveTarget(null);
  }

  // ── Bookmark handlers ──────────────────────────────────────────────────────
  async function addBookmark() {
    const label = `Page ${pageNumber}`;
    try {
      const bm = await api.createBookmark({
        reference: `pdf-bookmark:${documentId}`,
        module: String(pageNumber),
        label,
      });
      setDocBookmarks((prev) => [...prev, bm].sort((a, b) => Number(a.module) - Number(b.module)));
      setEditingBmId(bm.id);
      setEditingBmLabel(label);
      setTimeout(() => bmEditRef.current?.select(), 30);
    } catch {}
  }

  async function saveBookmarkLabel(id) {
    const label = editingBmLabel.trim();
    if (!label) return;
    try {
      const updated = await api.updateBookmark(id, { label });
      setDocBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch {}
    setEditingBmId(null);
  }

  async function deleteBookmark(id) {
    try {
      await api.deleteBookmark(id);
      setDocBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch {}
  }

  const currentPageBookmark = docBookmarks.find((b) => b.module === String(pageNumber));

  // ── Search ─────────────────────────────────────────────────────────────────
  async function buildPageIndex() {
    if (pageTextsRef.current) return pageTextsRef.current;
    const pdfDoc = pdfDocRef.current;
    if (!pdfDoc) return null;
    const map = new Map();
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      map.set(i, content.items.map((it) => it.str).join(' '));
    }
    pageTextsRef.current = map;
    return map;
  }

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const index = await buildPageIndex();
      if (cancelled || !index) { setSearchLoading(false); return; }
      const lower = q.toLowerCase();
      const results = [];
      for (const [page, text] of index) {
        const idx = text.toLowerCase().indexOf(lower);
        if (idx === -1) continue;
        const snipStart = Math.max(0, idx - 45);
        const snipEnd = Math.min(text.length, idx + q.length + 45);
        results.push({
          page,
          prefix: (snipStart > 0 ? '…' : '') + text.slice(snipStart, idx),
          match: text.slice(idx, idx + q.length),
          suffix: text.slice(idx + q.length, snipEnd) + (snipEnd < text.length ? '…' : ''),
        });
      }
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

  // Apply search term highlights to text layer spans (box-shadow, non-conflicting)
  useEffect(() => {
    const wrapper = pageWrapperRef.current;
    if (!wrapper) return;
    function getTextLayer() {
      return wrapper.querySelector('.react-pdf__Page__textContent') || wrapper.querySelector('.textLayer');
    }
    function applySearch() {
      const tl = getTextLayer();
      if (tl) applySearchToTextLayer(tl, searchQuery);
    }
    applySearch();
    if (!searchQuery.trim()) return;
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(applySearch, 200);
    });
    observer.observe(wrapper, { childList: true, subtree: true });
    const bail = setTimeout(() => observer.disconnect(), 10_000);
    return () => { observer.disconnect(); clearTimeout(timer); clearTimeout(bail); };
  }, [searchQuery, pageNumber]);

  const annotationPos = (rect, offsetUp = 48) => rect
    ? { top: rect.top + window.scrollY - offsetUp, left: rect.left + window.scrollX + rect.width / 2 }
    : {};

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* ── PDF canvas column ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-1 border-b border-pageBorder bg-page/80 px-2 py-2 lg:gap-2 lg:px-4">
          <button onClick={prevPage} disabled={pageNumber <= 1}
            className="rounded p-1 text-pageMuted hover:text-pageText disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono text-xs text-pageMuted">
            {numPages ? `${pageNumber} / ${numPages}` : '…'}
          </span>
          <button onClick={nextPage} disabled={!numPages || pageNumber >= numPages}
            className="rounded p-1 text-pageMuted hover:text-pageText disabled:opacity-30">
            <ChevronRight size={16} />
          </button>

          <div className="mx-0.5 h-4 w-px bg-pageBorder lg:mx-2" />

          <button onClick={zoomOut} disabled={scale <= 0.5}
            className="rounded p-1 text-pageMuted hover:text-pageText disabled:opacity-30">
            <Minus size={14} />
          </button>
          <span className="w-9 text-center font-mono text-xs text-pageMuted lg:w-10">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 3}
            className="rounded p-1 text-pageMuted hover:text-pageText disabled:opacity-30">
            <Plus size={14} />
          </button>
          <button onClick={fitWidth} disabled={!nativePageWidth} title="Fit width"
            className="rounded p-1 text-pageMuted hover:text-pageText disabled:opacity-30">
            <Maximize2 size={13} />
          </button>

          {tocItems.length > 0 && (
            <>
              <div className="mx-0.5 h-4 w-px bg-pageBorder lg:mx-2" />
              <button
                onClick={() => { setShowToc((v) => !v); setShowBookmarks(false); }}
                className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors lg:px-2.5 ${
                  showToc
                    ? 'border-pageAccent bg-pageAccent/10 text-pageAccent'
                    : 'border-pageBorder text-pageMuted hover:border-pageAccent hover:text-pageText'
                }`}
              >
                <BookOpen size={12} />
                <span className="hidden sm:inline">Contents</span>
              </button>
            </>
          )}

          {isLoggedIn && (
            <>
              <div className="mx-0.5 h-4 w-px bg-pageBorder lg:mx-2" />
              <button
                onClick={() => { setShowBookmarks((v) => !v); setShowToc(false); }}
                className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors lg:px-2.5 ${
                  showBookmarks
                    ? 'border-pageAccent bg-pageAccent/10 text-pageAccent'
                    : currentPageBookmark
                      ? 'border-pageAccent/40 text-pageAccent hover:border-pageAccent'
                      : 'border-pageBorder text-pageMuted hover:border-pageAccent hover:text-pageText'
                }`}
              >
                <Bookmark size={12} className={currentPageBookmark ? 'fill-pageAccent' : ''} />
                <span className="hidden sm:inline">Bookmarks</span>
                {docBookmarks.length > 0 && (
                  <span className="hidden rounded-full bg-pageAccent/20 px-1.5 py-px text-[10px] text-pageAccent sm:inline">
                    {docBookmarks.length}
                  </span>
                )}
              </button>
            </>
          )}

          <div className="flex-1" />

          {/* Refs panel toggle — mobile only */}
          <button
            onClick={() => setShowRefPanel((v) => !v)}
            title="Bible references on this page"
            className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors lg:hidden ${
              showRefPanel
                ? 'border-pageAccent bg-pageAccent/10 text-pageAccent'
                : 'border-pageBorder text-pageMuted hover:border-pageAccent hover:text-pageText'
            }`}
          >
            <BookMarked size={12} />
            {pageRefs.length > 0 && (
              <span className="font-mono text-[10px]">{pageRefs.length}</span>
            )}
          </button>

          <button
            onClick={() => {
              setShowSearch((v) => {
                if (!v) { setShowToc(false); setShowBookmarks(false); setTimeout(() => searchInputRef.current?.focus(), 30); }
                return !v;
              });
            }}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors lg:px-2.5 ${
              showSearch
                ? 'border-pageAccent bg-pageAccent/10 text-pageAccent'
                : 'border-pageBorder text-pageMuted hover:border-pageAccent hover:text-pageText'
            }`}
          >
            <Search size={12} />
            <span className="hidden sm:inline">Search</span>
          </button>

          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded border border-pageBorder px-2.5 py-1 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText lg:flex">
            <ExternalLink size={12} /> Open file
          </a>
        </div>

        {/* TOC panel */}
        {showToc && tocItems.length > 0 && (
          <div className="shrink-0 max-h-[40vh] overflow-y-auto border-b border-pageBorder bg-page shadow-sm">
            <div className="px-2 py-2">
              <p className="mb-1 px-2 font-ui text-[10px] font-semibold uppercase tracking-widest text-pageMuted/60">
                Contents
              </p>
              {tocItems.map((item, i) => (
                <TocEntry key={i} item={item} depth={0} onNavigate={navigateTocItem} />
              ))}
            </div>
          </div>
        )}

        {/* Bookmarks panel */}
        {showBookmarks && (
          <div className="shrink-0 max-h-[40vh] overflow-y-auto border-b border-pageBorder bg-page shadow-sm">
            <div className="flex items-center justify-between px-4 py-2">
              <p className="font-ui text-[10px] font-semibold uppercase tracking-widest text-pageMuted/60">
                Bookmarks
              </p>
              <button
                onClick={addBookmark}
                className="flex items-center gap-1 rounded border border-pageBorder px-2 py-0.5 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
              >
                <Plus size={10} /> Page {pageNumber}
              </button>
            </div>
            {docBookmarks.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-pageMuted/60">
                No bookmarks yet. Click "+ Page {pageNumber}" to add one.
              </p>
            ) : (
              <div className="pb-2">
                {docBookmarks
                  .slice()
                  .sort((a, b) => Number(a.module) - Number(b.module))
                  .map((bm) => (
                    <div
                      key={bm.id}
                      className={`flex items-center gap-2 px-3 py-1.5 ${
                        bm.module === String(pageNumber) ? 'bg-pageAccent/8' : ''
                      }`}
                    >
                      <span className="w-9 shrink-0 rounded bg-pageBorder/60 px-1.5 py-0.5 text-center font-mono text-[11px] text-pageMuted">
                        {bm.module}
                      </span>
                      {editingBmId === bm.id ? (
                        <input
                          ref={bmEditRef}
                          value={editingBmLabel}
                          onChange={(e) => setEditingBmLabel(e.target.value)}
                          onBlur={() => saveBookmarkLabel(bm.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveBookmarkLabel(bm.id);
                            if (e.key === 'Escape') setEditingBmId(null);
                          }}
                          className="flex-1 rounded border border-pageAccent bg-white/70 px-2 py-0.5 text-xs text-pageText focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => { setPageNumber(Number(bm.module)); setShowBookmarks(false); }}
                          className="flex-1 truncate text-left text-sm text-pageText hover:text-pageAccent"
                        >
                          {bm.label || `Page ${bm.module}`}
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingBmId(bm.id); setEditingBmLabel(bm.label || `Page ${bm.module}`); setTimeout(() => bmEditRef.current?.select(), 30); }}
                        className="shrink-0 rounded p-1 text-pageMuted hover:text-pageText"
                        title="Rename"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => deleteBookmark(bm.id)}
                        className="shrink-0 rounded p-1 text-pageMuted hover:text-red-500"
                        title="Delete bookmark"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Search panel */}
        {showSearch && (
          <div className="shrink-0 border-b border-pageBorder bg-page shadow-sm">
            <div className="flex items-center gap-2 border-b border-pageBorder/50 px-3 py-2">
              <Search size={13} className="shrink-0 text-pageMuted" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search document…"
                className="flex-1 bg-transparent text-sm text-pageText placeholder:text-pageMuted/60 focus:outline-none"
              />
              {searchLoading && <span className="shrink-0 text-xs text-pageMuted">Searching…</span>}
              {!searchLoading && searchQuery && (
                <span className="shrink-0 text-xs text-pageMuted">
                  {searchResults.length} {searchResults.length === 1 ? 'page' : 'pages'}
                </span>
              )}
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="shrink-0 text-pageMuted hover:text-pageText"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-[32vh] overflow-y-auto">
                {searchResults.map(({ page, prefix, match, suffix }) => (
                  <button
                    key={page}
                    onClick={() => setPageNumber(page)}
                    className={`flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-pageAccent/8 ${
                      page === pageNumber ? 'bg-pageAccent/8' : ''
                    }`}
                  >
                    <span className="mt-0.5 w-9 shrink-0 rounded bg-pageBorder/60 px-1 py-0.5 text-center font-mono text-[11px] text-pageMuted">
                      {page}
                    </span>
                    <p className="flex-1 truncate text-xs leading-relaxed text-pageMuted">
                      {prefix}
                      <mark className="rounded bg-pageAccent/35 px-px text-pageText not-italic">{match}</mark>
                      {suffix}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && !searchLoading && searchResults.length === 0 && (
              <p className="px-4 py-3 text-xs text-pageMuted/60">No matches found.</p>
            )}
          </div>
        )}

        {/* Page canvas */}
        <div
          ref={scrollAreaRef}
          className="min-h-0 flex-1 select-text overflow-auto bg-[#525659] p-4"
          onMouseUp={handleMouseUp}
        >
          <div className="flex justify-center">
            {loadError ? (
              <div className="mt-16 text-center text-sm text-white/60">
                <p>Could not load PDF.{' '}
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="underline">Open in new tab</a>
                </p>
              </div>
            ) : (
              <div ref={pageWrapperRef}>
                <Document
                  file={fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={() => setLoadError(true)}
                  className="shadow-2xl"
                >
                  <Page
                    key={pageNumber}
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    onGetTextSuccess={onGetTextSuccess}
                    onRenderSuccess={onPageRenderSuccess}
                    className="bg-white"
                  />
                </Document>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Reference sidebar ── */}
      <aside className={`w-52 shrink-0 flex-col border-l border-pageBorder bg-page ${showRefPanel ? 'flex' : 'hidden'} lg:flex`}>
        <div className="shrink-0 border-b border-pageBorder px-3 py-2.5">
          <p className="font-ui text-[10px] font-semibold uppercase tracking-widest text-pageMuted">
            Passages on page {pageNumber}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {pageRefs.length === 0 ? (
            <p className="px-3 pt-3 font-ui text-xs text-pageMuted/60">No Bible references detected on this page.</p>
          ) : (
            pageRefs.map(({ display, ref }) => (
              <button
                key={display}
                onClick={() => onOpenInCell?.(ref)}
                disabled={!onOpenInCell}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-pageAccent/8 disabled:cursor-default"
                title={onOpenInCell ? `Open ${display} in Cell` : display}
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verdigris/60" />
                <span className="font-ui text-xs leading-snug text-pageText">{display}</span>
                {onOpenInCell && (
                  <span className="ml-auto shrink-0 font-ui text-[9px] text-pageMuted opacity-0 transition-opacity group-hover:opacity-100">↗</span>
                )}
              </button>
            ))
          )}
        </div>
        {isAdmin && !doc?.extractedText && (
          <div className="shrink-0 border-t border-pageBorder p-3">
            <p className="mb-2 font-ui text-[10px] leading-snug text-pageMuted">
              Reference detection requires selectable text. Run OCR for scanned PDFs.
            </p>
            <button onClick={onOcr} disabled={ocrRunning}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-pageAccent/40 bg-pageAccent/10 px-2 py-1.5 font-ui text-xs text-pageAccent hover:bg-pageAccent/20 disabled:opacity-60">
              <ScanText size={12} />
              {ocrRunning ? 'Running…' : 'Run OCR'}
            </button>
            {ocrError && <p className="mt-1 font-ui text-[10px] text-red-500">{ocrError}</p>}
          </div>
        )}
      </aside>

      {/* ── Remove-highlight popup ── */}
      {removeTarget && (
        <div
          className="fixed z-50 flex items-center gap-2 rounded-lg border border-pageBorder bg-page px-3 py-2 shadow-2xl"
          style={{ ...annotationPos(removeTarget.rect), transform: 'translateX(-50%)' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="text-xs text-pageMuted">Highlight</span>
          <button
            onClick={() => removeHighlight(removeTarget.id)}
            className="text-xs text-red-500 hover:text-red-600"
          >
            Remove
          </button>
          <button onClick={() => setRemoveTarget(null)} className="text-pageMuted/60 hover:text-pageMuted">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Annotation toolbar ── */}
      {selectionInfo && !noteMode && (
        <div
          ref={popupRef}
          className="fixed z-50 flex items-center gap-1.5 rounded-lg border border-pageBorder bg-page px-3 py-2 shadow-2xl"
          style={{ ...annotationPos(selectionInfo.rect), transform: 'translateX(-50%)' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {COLORS.map(({ id, bg }) => (
            <button key={id} onClick={() => saveHighlight(id)}
              className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
              style={{ backgroundColor: bg, borderColor: SWATCH_RING[id] }}
              title={`Highlight ${id}`}
            />
          ))}
          <div className="mx-1 h-4 w-px bg-pageBorder" />
          <button
            onClick={() => { setNoteMode(true); setTimeout(() => noteInputRef.current?.focus(), 50); }}
            className="flex items-center gap-1 text-xs text-pageMuted hover:text-pageText"
          >
            <StickyNote size={13} /> Note
          </button>
          <button onClick={dismissPopup} className="ml-0.5 text-pageMuted/60 hover:text-pageMuted">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Note editor ── */}
      {selectionInfo && noteMode && (
        <div
          ref={popupRef}
          className="fixed z-50 w-72 rounded-xl border border-pageBorder bg-page p-3.5 shadow-2xl"
          style={{ ...annotationPos(selectionInfo.rect, 210), transform: 'translateX(-50%)' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <p className="mb-2.5 line-clamp-2 rounded bg-pageAccent/8 px-2.5 py-1.5 font-mono text-xs leading-relaxed text-pageMuted">
            "{selectionInfo.text}"
          </p>
          <textarea
            ref={noteInputRef}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') dismissPopup();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote();
            }}
            placeholder="Add a note…"
            rows={3}
            className="w-full resize-none rounded border border-pageBorder bg-white/70 px-2.5 py-2 text-sm text-pageText placeholder:text-pageMuted/70 focus:border-pageAccent focus:outline-none"
          />
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="flex gap-1.5">
              {COLORS.map(({ id, bg }) => (
                <button key={id} onClick={() => setNoteColor(noteColor === id ? null : id)}
                  className="h-4 w-4 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: bg,
                    borderColor: noteColor === id ? SWATCH_RING[id] : 'transparent',
                    boxShadow: noteColor === id ? `0 0 0 1px ${SWATCH_RING[id]}` : 'none',
                  }}
                  title={id}
                />
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={dismissPopup} className="text-xs text-pageMuted hover:text-pageText">Cancel</button>
            <button onClick={saveNote} disabled={savingAnnotation || !noteBody.trim()}
              className="rounded bg-pageAccent/20 px-2.5 py-1 text-xs font-medium text-pageAccent hover:bg-pageAccent/30 disabled:opacity-50">
              {savingAnnotation ? '…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

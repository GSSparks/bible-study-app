import { useEffect, useRef, useState } from 'react';
import { List, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { extractToc, applyHighlightsToContainer, applyNoteMarkersToContainer, BOOK_HIGHLIGHT_COLORS } from '../utils/bookHtml.js';
import SelectionNotePopup from './SelectionNotePopup.jsx';
import VerseHoverCard from './VerseHoverCard.jsx';
import { osisToHuman } from '../utils/osisToHuman.js';

export default function BookPane({ module, initialScrollY = 0, onScrollChange, isLoggedIn = false, defaultBibleModule, onOpenInBible, onOpenInCell }) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toc, setToc] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [hoveredNote, setHoveredNote] = useState(null); // { note, x, y }
  const [hoverCard, setHoverCard] = useState(null); // { ref, rect }
  const [selection, setSelection] = useState(null); // { text, x, y }
  const [showNotePopup, setShowNotePopup] = useState(false);

  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const scrollDebounceRef = useRef(null);
  const verseCloseTimer = useRef(null);
  const notesRef = useRef([]);
  notesRef.current = notes;

  useEffect(() => {
    if (!module) return;
    setLoading(true);
    setError(null);
    setHtml('');
    setToc([]);
    setHighlights([]);
    setNotes([]);
    setHoveredNote(null);
    setSelection(null);

    api.getBookContent(module)
      .then((res) => {
        const { html: processed, toc: newToc } = extractToc(res.html || '');
        setHtml(processed);
        setToc(newToc);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    scrollRef.current?.scrollTo({ top: 0 });
  }, [module]);

  useEffect(() => {
    if (!module || !isLoggedIn) return;
    api.listNotes({ prefix: `book-highlight:${module}` })
      .then((fetched) => setHighlights(fetched.filter((n) => n.tags?.includes('book-highlight'))))
      .catch(() => {});
    api.listNotes({ reference: `book:${module}` })
      .then(setNotes)
      .catch(() => {});
  }, [module, isLoggedIn]);

  // Restore scroll after initial load
  useEffect(() => {
    if (loading) return;
    if (scrollRef.current) scrollRef.current.scrollTop = initialScrollY;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Re-apply highlights and note markers after content renders
  useEffect(() => {
    if (loading) return;
    if (highlights.length) applyHighlightsToContainer(contentRef.current, highlights);
    if (notes.length) applyNoteMarkersToContainer(contentRef.current, notes);
  }, [loading, highlights, notes]);

  useEffect(() => {
    return () => { if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current); };
  }, []);

  function handleScroll(e) {
    if (!onScrollChange) return;
    const el = e.currentTarget;
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => onScrollChange(el.scrollTop), 300);
  }

  function handleMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || !sel.rangeCount || !contentRef.current?.contains(sel.anchorNode)) {
      setSelection(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelection({ text, x: rect.left, y: rect.bottom + 6 });
  }

  async function handleHighlight(color) {
    if (!selection?.text) return;
    try {
      const note = await api.createNote({
        quote: selection.text,
        reference: `book-highlight:${module}`,
        module,
        body: '',
        tags: ['book-highlight', color],
      });
      setHighlights((prev) => [...prev, note]);
      applyHighlightsToContainer(contentRef.current, [note]);
    } catch { /* non-fatal */ }
    closeSelection();
  }

  function closeSelection() {
    setSelection(null);
    setShowNotePopup(false);
    window.getSelection()?.removeAllRanges();
  }

  function scheduleVerseClose() {
    verseCloseTimer.current = setTimeout(() => setHoverCard(null), 150);
  }

  function cancelVerseClose() {
    clearTimeout(verseCloseTimer.current);
  }

  function handleContentMouseOver(e) {
    const marker = e.target.closest?.('.book-note-marker');
    if (marker) {
      const note = notesRef.current.find((n) => n.id === marker.dataset.noteId);
      if (note) {
        const rect = marker.getBoundingClientRect();
        setHoveredNote({ note, x: rect.left, y: rect.bottom + 4 });
      }
      return;
    }
    if (defaultBibleModule) {
      const verseEl = e.target.closest('.verse-ref');
      if (verseEl?.dataset.ref) {
        cancelVerseClose();
        setHoverCard({ ref: verseEl.dataset.ref, rect: verseEl.getBoundingClientRect() });
        return;
      }
      const xrefEl = e.target.closest('.xref-marker');
      if (xrefEl?.dataset.refs) {
        cancelVerseClose();
        const firstRef = xrefEl.dataset.refs.split(/\s+/)[0];
        const humanRef = osisToHuman(firstRef);
        if (humanRef) setHoverCard({ ref: humanRef, rect: xrefEl.getBoundingClientRect() });
        return;
      }
    }
    setHoveredNote(null);
    scheduleVerseClose();
  }

  function handleContentClick(e) {
    const verseEl = e.target.closest('.verse-ref');
    if (verseEl?.dataset.ref) {
      e.stopPropagation();
      onOpenInBible?.(verseEl.dataset.ref);
      return;
    }
    const xrefEl = e.target.closest('.xref-marker');
    if (xrefEl?.dataset.refs) {
      e.stopPropagation();
      const firstRef = xrefEl.dataset.refs.split(/\s+/)[0];
      const humanRef = osisToHuman(firstRef);
      if (humanRef) onOpenInBible?.(humanRef);
    }
  }

  function jumpToSection(id) {
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (!el || !scrollRef.current) return;
    // Compute offset relative to the scroll container rather than using
    // scrollIntoView — that call fires before setTocOpen(false) reflows
    // the layout, so the heading ends up above the scroll position after
    // the TOC sidebar closes and widens the content area.
    const containerRect = scrollRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const target = elRect.top - containerRect.top + scrollRef.current.scrollTop - 32;
    scrollRef.current.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-page">
      {/* Desktop: sliding TOC panel */}
      {toc.length > 0 && (
        <div
          className={[
            'hidden lg:flex lg:shrink-0 overflow-hidden bg-page transition-[width] duration-300 ease-in-out',
            tocOpen ? 'w-52 border-r border-pageBorder' : 'w-0',
          ].join(' ')}
        >
          <div className="w-52 shrink-0 overflow-y-auto px-3 py-4">
            <p className="mb-3 font-ui text-[9px] uppercase tracking-widest text-pageMuted">Contents</p>
            <nav className="flex flex-col">
              {toc.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => jumpToSection(item.id)}
                  className={`block w-full text-left text-xs leading-snug transition-colors hover:text-pageAccent ${
                    item.level === 1
                      ? `${i > 0 ? 'mt-2 pt-2 border-t border-pageBorder' : ''} py-0.5 font-ui font-semibold text-pageText/90`
                      : item.level === 2
                      ? 'py-0.5 pl-3 text-pageMuted'
                      : 'py-0.5 pl-5 text-pageMuted/70'
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop: static toggle tab — flex sibling, never animates position */}
      {toc.length > 0 && (
        <button
          onClick={() => setTocOpen((o) => !o)}
          title={tocOpen ? 'Close contents' : 'Open contents'}
          className="mt-16 hidden h-8 w-5 shrink-0 items-center justify-center self-start rounded-r border border-l-0 border-pageBorder bg-page text-pageMuted shadow-sm hover:text-pageAccent lg:flex"
        >
          <List size={11} />
        </button>
      )}

      {/* Mobile: TOC drops from top with close button in header */}
      {toc.length > 0 && (
        <div
          className={[
            'absolute left-0 right-0 top-0 z-20 overflow-hidden border-b border-pageBorder bg-page transition-[max-height] duration-300 ease-in-out lg:hidden',
            tocOpen ? 'max-h-64' : 'max-h-0',
          ].join(' ')}
        >
          <div className="px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-ui text-[9px] uppercase tracking-widest text-pageMuted">Contents</p>
              <button onClick={() => setTocOpen(false)} className="rounded p-0.5 text-pageMuted hover:text-pageAccent">
                <X size={11} />
              </button>
            </div>
            <nav className="flex max-h-48 flex-col overflow-y-auto">
              {toc.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => { jumpToSection(item.id); setTocOpen(false); }}
                  className={`block w-full text-left text-xs leading-snug transition-colors hover:text-pageAccent ${
                    item.level === 1
                      ? `${i > 0 ? 'mt-1.5 pt-1.5 border-t border-pageBorder' : ''} py-0.5 font-ui font-semibold text-pageText/90`
                      : item.level === 2
                      ? 'py-0.5 pl-3 text-pageMuted'
                      : 'py-0.5 pl-5 text-pageMuted/70'
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile: open button — only shown when TOC is closed */}
      {toc.length > 0 && !tocOpen && (
        <button
          onClick={() => setTocOpen(true)}
          title="Open contents"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded border border-pageBorder bg-page text-pageMuted shadow-sm hover:text-pageAccent lg:hidden"
        >
          <List size={11} />
        </button>
      )}

      {/* Scroll area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-page px-8 py-6 font-display text-base leading-relaxed text-ink"
      >
        {loading ? (
          <p className="text-sm text-pageMuted">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : !html ? (
          <p className="text-sm text-pageMuted">No content found for this module.</p>
        ) : (
          <div
            ref={contentRef}
            className={[
              'prose prose-sm max-w-2xl [&_p]:mb-6',
              // h1 — book/chapter title from source content
              '[&_h1]:mt-12 [&_h1]:mb-2 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-center [&_h1]:text-ink [&_h1]:tracking-tight',
              // h2 — major section from source content (not book-section-heading)
              '[&_h2:not(.book-section-heading)]:mt-16 [&_h2:not(.book-section-heading)]:mb-6 [&_h2:not(.book-section-heading)]:pb-3 [&_h2:not(.book-section-heading)]:font-display [&_h2:not(.book-section-heading)]:text-2xl [&_h2:not(.book-section-heading)]:font-semibold [&_h2:not(.book-section-heading)]:text-center [&_h2:not(.book-section-heading)]:text-ink [&_h2:not(.book-section-heading)]:tracking-tight [&_h2:not(.book-section-heading)]:border-b [&_h2:not(.book-section-heading)]:border-brass/30',
              // .book-section-heading — injected tree-node heading (h2 or h3)
              '[&_.book-section-heading]:mt-14 [&_.book-section-heading]:mb-4 [&_.book-section-heading]:pb-2 [&_.book-section-heading]:font-ui [&_.book-section-heading]:text-lg [&_.book-section-heading]:font-semibold [&_.book-section-heading]:text-ink [&_.book-section-heading]:border-b [&_.book-section-heading]:border-brass/20',
              // h3 — sub-section from source content
              '[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-ui [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-inkMuted [&_h3]:uppercase [&_h3]:tracking-wider',
              // h4 — minor heading
              '[&_h4]:mt-6 [&_h4]:mb-1 [&_h4]:font-ui [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-inkMuted',
              // Epigraph (scripture citation / motto after a heading)
              '[&_.book-epigraph]:mt-2 [&_.book-epigraph]:mb-8 [&_.book-epigraph]:text-center [&_.book-epigraph]:italic [&_.book-epigraph]:text-sm [&_.book-epigraph]:text-inkMuted',
              // Note marker dot
              '[&_.book-note-marker]:mx-0.5 [&_.book-note-marker]:cursor-default [&_.book-note-marker]:rounded-full [&_.book-note-marker]:bg-verdigris/80 [&_.book-note-marker]:px-1 [&_.book-note-marker]:py-px [&_.book-note-marker]:text-[10px] [&_.book-note-marker]:font-ui [&_.book-note-marker]:text-white [&_.book-note-marker]:leading-none',
              // Images — centered with auto-sizing
              '[&_img]:mx-auto [&_img]:block [&_img]:max-w-full [&_img]:my-6',
            ].join(' ')}
            dangerouslySetInnerHTML={{ __html: html }}
            onMouseUp={handleMouseUp}
            onClick={handleContentClick}
            onMouseOver={handleContentMouseOver}
            onMouseLeave={() => { setHoveredNote(null); scheduleVerseClose(); }}
          />
        )}
      </div>

      {/* Verse hover card */}
      {hoverCard && defaultBibleModule && (
        <VerseHoverCard
          refStr={hoverCard.ref}
          rect={hoverCard.rect}
          bibleModule={defaultBibleModule}
          onNavigate={onOpenInCell}
          onMouseEnter={cancelVerseClose}
          onMouseLeave={scheduleVerseClose}
        />
      )}

      {/* Note hover tooltip */}
      {hoveredNote &&
        createPortal(
          <div
            className="fixed z-50 max-w-xs rounded-lg border border-rule bg-panel px-3 py-2 shadow-2xl"
            style={{ top: hoveredNote.y, left: Math.min(hoveredNote.x, window.innerWidth - 280) }}
            onMouseEnter={() => { /* keep open while hovering tooltip */ }}
            onMouseLeave={() => setHoveredNote(null)}
          >
            {hoveredNote.note.quote && (
              <blockquote className="mb-1.5 border-l-2 border-verdigris pl-2 text-xs italic text-muted line-clamp-3">
                {hoveredNote.note.quote}
              </blockquote>
            )}
            <p className="text-xs text-parchment/90 leading-snug">{hoveredNote.note.body}</p>
          </div>,
          document.body
        )}

      {/* Selection action bar */}
      {selection && !showNotePopup &&
        createPortal(
          <div
            className="fixed z-50 flex items-center gap-1.5 rounded-lg border border-rule bg-panel px-2.5 py-1.5 shadow-2xl"
            style={{ top: selection.y, left: Math.min(selection.x, window.innerWidth - 260) }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {Object.entries(BOOK_HIGHLIGHT_COLORS).map(([color, { bg, label }]) => (
              <button
                key={color}
                onClick={() => isLoggedIn ? handleHighlight(color) : null}
                title={isLoggedIn ? `Highlight ${label}` : 'Log in to highlight'}
                disabled={!isLoggedIn}
                className="h-5 w-5 rounded-full border border-white/20 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: bg }}
              />
            ))}
            {isLoggedIn && (
              <>
                <div className="mx-0.5 h-4 w-px bg-rule" />
                <button
                  onClick={() => setShowNotePopup(true)}
                  className="rounded px-2 py-0.5 text-xs text-brass hover:bg-brass/10"
                >
                  + note
                </button>
              </>
            )}
            <button
              onClick={closeSelection}
              className="ml-0.5 rounded p-0.5 text-xs text-muted hover:text-parchment"
            >
              ✕
            </button>
          </div>,
          document.body
        )}

      {showNotePopup && selection && (
        <SelectionNotePopup
          quote={selection.text}
          reference={`book:${module}`}
          module={module}
          x={selection.x}
          y={selection.y}
          onClose={() => {
            closeSelection();
            // Refresh note markers after a new note is saved
            if (isLoggedIn) {
              api.listNotes({ reference: `book:${module}` })
                .then((fetched) => setNotes(fetched))
                .catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { List } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { extractToc, applyHighlightsToContainer, applyNoteMarkersToContainer, BOOK_HIGHLIGHT_COLORS } from '../utils/bookHtml.js';
import SelectionNotePopup from './SelectionNotePopup.jsx';

export default function BookPane({ module, initialScrollY = 0, onScrollChange, isLoggedIn = false }) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toc, setToc] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [hoveredNote, setHoveredNote] = useState(null); // { note, x, y }
  const [selection, setSelection] = useState(null); // { text, x, y }
  const [showNotePopup, setShowNotePopup] = useState(false);

  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const scrollDebounceRef = useRef(null);
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

  function handleContentMouseOver(e) {
    const marker = e.target.closest?.('.book-note-marker');
    if (!marker) { setHoveredNote(null); return; }
    const note = notesRef.current.find((n) => n.id === marker.dataset.noteId);
    if (!note) return;
    const rect = marker.getBoundingClientRect();
    setHoveredNote({ note, x: rect.left, y: rect.bottom + 4 });
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
    <div className="relative flex h-full min-h-0 overflow-hidden">
      {/* TOC: drops from top on mobile, slides from left on desktop */}
      {toc.length > 0 && (
        <div
          className={[
            'bg-panel border-rule',
            'absolute left-0 right-0 top-0 z-20 border-b transition-[max-height] duration-300 ease-in-out',
            'lg:relative lg:top-auto lg:border-b-0 lg:border-r lg:shrink-0 lg:transition-[width]',
            tocOpen
              ? 'max-h-64 overflow-y-auto lg:max-h-none lg:w-52 lg:overflow-y-auto'
              : 'max-h-0 overflow-hidden lg:max-h-none lg:w-0 lg:overflow-hidden',
          ].join(' ')}
        >
          <div className="min-w-52 px-3 py-4">
            <p className="mb-2 font-ui text-[9px] uppercase tracking-widest text-muted">Contents</p>
            <nav className="space-y-0.5">
              {toc.map((item) => (
                <button
                  key={item.id}
                  onClick={() => jumpToSection(item.id)}
                  className={`block w-full text-left text-xs leading-snug transition-colors hover:text-brass ${
                    item.level === 1
                      ? 'py-1 font-ui font-semibold text-parchment/80'
                      : item.level === 2
                      ? 'py-0.5 pl-2 text-muted'
                      : 'py-0.5 pl-4 text-muted/70'
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile TOC toggle — fixed top-left square button */}
      {toc.length > 0 && (
        <button
          onClick={() => setTocOpen((o) => !o)}
          title={tocOpen ? 'Close contents' : 'Open contents'}
          className="absolute left-2 top-2 z-30 flex h-7 w-7 items-center justify-center rounded border border-rule bg-panel text-muted shadow-sm hover:text-brass lg:hidden"
        >
          <List size={11} />
        </button>
      )}

      {/* Desktop TOC toggle — animated left-edge tab */}
      {toc.length > 0 && (
        <button
          onClick={() => setTocOpen((o) => !o)}
          title={tocOpen ? 'Close contents' : 'Open contents'}
          style={{ left: tocOpen ? '13rem' : 0 }}
          className="absolute top-16 z-10 hidden h-8 w-5 items-center justify-center rounded-r border border-l-0 border-rule bg-panel text-muted shadow-sm transition-[left] duration-300 ease-in-out hover:text-brass lg:flex"
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
              // h1 — book title (front matter, rarely seen mid-content)
              '[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-center [&_h1]:text-ink [&_h1]:tracking-tight',
              // h2 — chapter heading: large, centered, brass underline
              '[&_h2]:mt-16 [&_h2]:mb-6 [&_h2]:pb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-center [&_h2]:text-ink [&_h2]:tracking-tight [&_h2]:border-b [&_h2]:border-brass/30',
              // h3 / .book-section-heading — sub-section
              '[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-ui [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-inkMuted [&_h3]:uppercase [&_h3]:tracking-wider',
              '[&_.book-section-heading]:mt-8 [&_.book-section-heading]:mb-2 [&_.book-section-heading]:font-ui [&_.book-section-heading]:font-semibold [&_.book-section-heading]:text-inkMuted',
              // h4 — minor heading
              '[&_h4]:mt-6 [&_h4]:mb-1 [&_h4]:font-ui [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-inkMuted',
              // Epigraph (scripture citation / motto after a heading)
              '[&_.book-epigraph]:mt-2 [&_.book-epigraph]:mb-8 [&_.book-epigraph]:text-center [&_.book-epigraph]:italic [&_.book-epigraph]:text-sm [&_.book-epigraph]:text-inkMuted',
              // Note marker dot
              '[&_.book-note-marker]:mx-0.5 [&_.book-note-marker]:cursor-default [&_.book-note-marker]:rounded-full [&_.book-note-marker]:bg-verdigris/80 [&_.book-note-marker]:px-1 [&_.book-note-marker]:py-px [&_.book-note-marker]:text-[10px] [&_.book-note-marker]:font-ui [&_.book-note-marker]:text-white [&_.book-note-marker]:leading-none',
            ].join(' ')}
            dangerouslySetInnerHTML={{ __html: html }}
            onMouseUp={handleMouseUp}
            onMouseOver={handleContentMouseOver}
            onMouseLeave={() => setHoveredNote(null)}
          />
        )}
      </div>

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

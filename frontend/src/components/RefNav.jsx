import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BIBLE_BOOKS } from '../utils/bibleBooks.js';
import BookChapterPicker from './BookChapterPicker.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveBook(bookStr) {
  if (!bookStr) return null;
  const norm = bookStr.toLowerCase().replace(/\s+/g, '');
  return (
    BIBLE_BOOKS.find((b) => b.osis.toLowerCase() === norm) ||
    BIBLE_BOOKS.find((b) => b.name.toLowerCase().replace(/\s+/g, '') === norm) ||
    null
  );
}

function parseRef(ref) {
  if (!ref) return null;
  const s = ref.replace(/\./g, ' ').trim();
  const m = s.match(/^(.+?)\s+(\d+)(?::(\d+))?/);
  if (!m) return null;
  return {
    bookStr: m[1].trim(),
    chapter: parseInt(m[2], 10),
    verse: m[3] ? parseInt(m[3], 10) : null,
  };
}

// ─── Chapter popup ────────────────────────────────────────────────────────────

function ChapterPopup({ anchorRef, book, currentChapter, onSelect, onClose }) {
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const left = Math.min(rect.left, window.innerWidth - 272);
  const top = rect.bottom + 6;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-64 overflow-y-auto rounded-md border border-rule bg-panel p-2 shadow-2xl"
        style={{ left, top, maxHeight: '50vh' }}
      >
        <p className="mb-1.5 px-1 text-xs uppercase tracking-wide text-muted">{book.name}</p>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
            <button
              key={ch}
              onClick={() => onSelect(ch)}
              className={`rounded py-1.5 text-center text-sm transition-colors ${
                ch === currentChapter
                  ? 'bg-brass font-semibold text-ink'
                  : 'border border-rule text-parchment/90 hover:border-brass hover:text-brass'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Verse popup ──────────────────────────────────────────────────────────────

function VersePopup({ anchorRef, book, chapter, verse, onNavigate, onClose }) {
  const [val, setVal] = useState(String(verse ?? 1));
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const left = Math.min(rect.left, window.innerWidth - 192);
  const top = rect.bottom + 6;

  function go(v) {
    const n = parseInt(v, 10);
    if (n > 0) onNavigate(`${book.osis} ${chapter}:${n}`);
  }

  function step(delta) {
    const next = Math.max(1, (parseInt(val, 10) || verse || 1) + delta);
    setVal(String(next));
    go(next);
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-md border border-rule bg-panel p-2 shadow-2xl"
        style={{ left, top }}
      >
        <p className="mb-1.5 text-center text-xs uppercase tracking-wide text-muted">
          {book.name} {chapter}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => step(-1)}
            className="rounded border border-rule px-2.5 py-1 text-sm text-muted hover:border-brass hover:text-parchment"
          >
            ‹
          </button>
          <input
            autoFocus
            type="number"
            min="1"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') go(val); }}
            className="w-14 rounded border border-rule bg-ink px-2 py-1 text-center font-mono text-sm text-parchment focus:border-brass focus:outline-none"
          />
          <button
            onClick={() => step(1)}
            className="rounded border border-rule px-2.5 py-1 text-sm text-muted hover:border-brass hover:text-parchment"
          >
            ›
          </button>
          <button
            onClick={() => go(val)}
            className="rounded bg-brass/90 px-2.5 py-1 text-xs font-medium text-ink hover:bg-brass"
          >
            Go
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── RefNav ───────────────────────────────────────────────────────────────────

export default function RefNav({ reference, onNavigate }) {
  const [bookPickerPos, setBookPickerPos] = useState(null);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [verseOpen, setVerseOpen] = useState(false);
  const chapterBtnRef = useRef(null);
  const verseBtnRef = useRef(null);

  const parsed = parseRef(reference);
  const book = parsed ? resolveBook(parsed.bookStr) : null;

  if (!parsed || !book) {
    return <span className="px-1 font-mono text-sm text-muted">{reference || '—'}</span>;
  }

  const { chapter, verse } = parsed;

  function closeAll() {
    setChapterOpen(false);
    setVerseOpen(false);
    setBookPickerPos(null);
  }

  return (
    <div className="flex shrink-0 items-center font-mono text-sm">
      {/* Book name → full BookChapterPicker */}
      <button
        onClick={(e) => {
          closeAll();
          const r = e.currentTarget.getBoundingClientRect();
          setBookPickerPos({ x: r.left, y: r.bottom + 8 });
        }}
        className="rounded px-1.5 py-1 text-parchment/80 hover:bg-panel hover:text-brass"
        title="Browse books"
      >
        {book.name}
      </button>

      {/* Chapter → compact grid for this book */}
      <button
        ref={chapterBtnRef}
        onClick={() => { closeAll(); setChapterOpen(true); }}
        className={`rounded px-1.5 py-1 hover:bg-panel hover:text-brass ${
          chapterOpen ? 'bg-panel text-brass' : 'text-parchment'
        }`}
        title="Jump to chapter"
      >
        {chapter}
      </button>

      {chapterOpen && (
        <ChapterPopup
          anchorRef={chapterBtnRef}
          book={book}
          currentChapter={chapter}
          onSelect={(ch) => { onNavigate(`${book.osis} ${ch}:1`); closeAll(); }}
          onClose={closeAll}
        />
      )}

      <span className="select-none text-muted/60">:</span>

      {/* Verse → ‹ n › picker */}
      {verse !== null ? (
        <button
          ref={verseBtnRef}
          onClick={() => { closeAll(); setVerseOpen(true); }}
          className={`rounded px-1.5 py-1 hover:bg-panel hover:text-brass ${
            verseOpen ? 'bg-panel text-brass' : 'text-parchment'
          }`}
          title="Jump to verse"
        >
          {verse}
        </button>
      ) : (
        <span className="px-1 text-muted">—</span>
      )}

      {verseOpen && (
        <VersePopup
          anchorRef={verseBtnRef}
          book={book}
          chapter={chapter}
          verse={verse}
          onNavigate={(ref) => { onNavigate(ref); closeAll(); }}
          onClose={closeAll}
        />
      )}

      {/* Full book/chapter picker */}
      {bookPickerPos && (
        <BookChapterPicker
          x={bookPickerPos.x}
          y={bookPickerPos.y}
          onSelectChapter={(ref) => { onNavigate(ref); closeAll(); }}
          onClose={closeAll}
        />
      )}
    </div>
  );
}

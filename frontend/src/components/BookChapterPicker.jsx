import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { BIBLE_BOOKS } from '../utils/bibleBooks.js';

/** Two-step browse: book list (grouped OT/NT), then a chapter-number grid.
 * Fullscreen on small screens; a fixed-position dropdown on larger ones. */
export default function BookChapterPicker({ x, y, onSelectChapter, onClose }) {
  const [selectedBook, setSelectedBook] = useState(null);

  // Inline style only applies on non-mobile — on mobile we use inset-0 via
  // the Tailwind class so the style prop must be empty to avoid overriding it.
  const isMobile = window.innerWidth < 640;
  const positionStyle = isMobile ? {} : {
    left: Math.min(x, window.innerWidth - 340),
    top: Math.min(y, window.innerHeight - 420),
  };

  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div
        className={`fixed z-50 flex flex-col overflow-hidden bg-panel ${
          isMobile
            ? 'inset-0'
            : 'max-h-[70vh] w-80 rounded-md border border-rule shadow-2xl'
        }`}
        style={positionStyle}
      >
        {/* Header — always visible, provides close + back navigation */}
        <div className="flex shrink-0 items-center gap-2 border-b border-rule px-3 py-2">
          {selectedBook ? (
            <button
              onClick={() => setSelectedBook(null)}
              className="text-xs text-verdigris hover:text-brass"
            >
              ← Books
            </button>
          ) : (
            <span className="text-xs uppercase tracking-wide text-verdigris">Browse</span>
          )}
          {selectedBook && (
            <span className="font-display text-sm text-parchment">{selectedBook.name}</span>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded p-0.5 text-muted hover:text-parchment"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        {!selectedBook ? (
          <div className="overflow-y-auto p-2">
            <p className="mb-1 px-2 pt-1 text-xs uppercase tracking-wide text-muted">Old Testament</p>
            <div className="mb-3 grid grid-cols-2 gap-x-2">
              {otBooks.map((b) => (
                <button
                  key={b.osis}
                  onClick={() => setSelectedBook(b)}
                  className="truncate rounded px-2 py-1.5 text-left text-sm text-parchment/90 hover:bg-ink hover:text-brass"
                >
                  {b.name}
                </button>
              ))}
            </div>
            <p className="mb-1 px-2 text-xs uppercase tracking-wide text-muted">New Testament</p>
            <div className="grid grid-cols-2 gap-x-2">
              {ntBooks.map((b) => (
                <button
                  key={b.osis}
                  onClick={() => setSelectedBook(b)}
                  className="truncate rounded px-2 py-1.5 text-left text-sm text-parchment/90 hover:bg-ink hover:text-brass"
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto p-3">
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button
                  key={ch}
                  onClick={() => {
                    onSelectChapter(`${selectedBook.osis} ${ch}`);
                    onClose();
                  }}
                  className="rounded border border-rule py-1.5 text-center text-sm text-parchment/90 hover:border-brass hover:text-brass"
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
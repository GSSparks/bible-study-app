import { useState } from 'react';
import { createPortal } from 'react-dom';
import { BIBLE_BOOKS } from '../utils/bibleBooks.js';

/** Two-step browse: book list (grouped OT/NT), then a chapter-number
 * grid for whichever book was picked. Same portal + full-screen click-
 * outside-catcher pattern as ModulePicker/ContextZoomMenu. */
export default function BookChapterPicker({ x, y, onSelectChapter, onClose }) {
  const [selectedBook, setSelectedBook] = useState(null);

  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

  const style = {
    left: Math.min(x, window.innerWidth - 340),
    top: Math.min(y, window.innerHeight - 420),
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-md border border-rule bg-panel shadow-2xl"
        style={style}
      >
        {!selectedBook ? (
          <div className="overflow-y-auto p-2">
            <p className="mb-1 px-2 pt-1 text-xs uppercase tracking-wide text-verdigris">Old Testament</p>
            <div className="mb-3 grid grid-cols-2 gap-x-2">
              {otBooks.map((b) => (
                <button
                  key={b.osis}
                  onClick={() => setSelectedBook(b)}
                  className="truncate rounded px-2 py-1 text-left text-sm text-parchment/90 hover:bg-ink hover:text-brass"
                >
                  {b.name}
                </button>
              ))}
            </div>
            <p className="mb-1 px-2 text-xs uppercase tracking-wide text-verdigris">New Testament</p>
            <div className="grid grid-cols-2 gap-x-2">
              {ntBooks.map((b) => (
                <button
                  key={b.osis}
                  onClick={() => setSelectedBook(b)}
                  className="truncate rounded px-2 py-1 text-left text-sm text-parchment/90 hover:bg-ink hover:text-brass"
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto p-2">
            <button
              onClick={() => setSelectedBook(null)}
              className="mb-2 px-2 text-xs text-verdigris hover:text-brass"
            >
              ← all books
            </button>
            <p className="mb-2 px-2 font-display text-base text-parchment">{selectedBook.name}</p>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button
                  key={ch}
                  onClick={() => {
                    onSelectChapter(`${selectedBook.osis} ${ch}`);
                    onClose();
                  }}
                  className="rounded border border-rule py-1 text-center text-sm text-parchment/90 hover:border-brass hover:text-brass"
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
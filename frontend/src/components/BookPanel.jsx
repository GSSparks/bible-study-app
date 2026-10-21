import { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { api } from '../api/client.js';
import BookPane from './BookPane.jsx';

export default function BookPanel({ open, onClose, bookReader, onBookChange, onOpenInBooks, isLoggedIn, defaultBibleModule, onOpenInBible, onOpenInCell }) {
  const [books, setBooks] = useState([]);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    api.listInstalledBooks().then(setBooks).catch(() => {});
  }, []);

  const selectedModule = bookReader?.module ?? null;
  const selectedBook = books.find((b) => b.name === selectedModule);

  function selectBook(book) {
    onBookChange?.({ module: book.name, scrollY: 0 });
    setListOpen(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel — always mounted so scroll state persists */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-rule bg-page shadow-2xl transition-transform duration-300 ease-in-out sm:w-[600px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="relative flex shrink-0 items-center gap-2 border-b border-rule bg-panel px-3 py-2">
          {/* Book selector button */}
          <button
            onClick={() => setListOpen((o) => !o)}
            className="min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-sm text-parchment hover:bg-ink"
            title="Switch book"
          >
            {selectedBook ? (selectedBook.description || selectedBook.name) : 'Select a book…'}
            <span className="ml-1 text-muted">▾</span>
          </button>

          {selectedModule && (
            <button
              onClick={() => { onOpenInBooks?.(selectedModule); onClose(); }}
              title="Open in Books view"
              className="shrink-0 rounded p-1 text-muted hover:text-brass"
            >
              <ArrowUpRight size={15} />
            </button>
          )}

          <button
            onClick={onClose}
            title="Close (Ctrl+K)"
            className="shrink-0 rounded p-1 text-muted hover:text-parchment"
          >
            <X size={16} />
          </button>

          {/* Book list dropdown */}
          {listOpen && (
            <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-rule bg-panel shadow-2xl">
              {books.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">No books installed — upload one in Admin → Modules.</p>
              ) : (
                books.map((book) => (
                  <button
                    key={book.name}
                    onClick={() => selectBook(book)}
                    className={`block w-full truncate px-3 py-1.5 text-left text-xs transition-colors hover:bg-ink hover:text-brass ${
                      book.name === selectedModule ? 'text-brass' : 'text-parchment/90'
                    }`}
                  >
                    {book.description || book.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Reader */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {selectedModule ? (
            <BookPane
              module={selectedModule}
              initialScrollY={bookReader?.scrollY ?? 0}
              onScrollChange={(y) => onBookChange?.({ ...bookReader, scrollY: y })}
              isLoggedIn={isLoggedIn}
              defaultBibleModule={defaultBibleModule}
              onOpenInBible={onOpenInBible}
              onOpenInCell={onOpenInCell}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-pageMuted">
              Select a book above to start reading.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

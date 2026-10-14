import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import BookPane from './BookPane.jsx';

export default function BooksView({ bookReader, onBookChange, isLoggedIn = false }) {
  const [books, setBooks] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    api
      .listInstalledBooks()
      .then((b) => setBooks(b || []))
      .catch(() => setBooks([]))
      .finally(() => setLoadingList(false));
  }, []);

  const selectedModule = bookReader?.module ?? null;

  function handleSelectBook(book) {
    onBookChange?.({ module: book.name, scrollY: 0 });
  }

  function handleScrollChange(y) {
    onBookChange?.({ ...bookReader, scrollY: y });
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <div className="flex w-56 shrink-0 flex-col border-r border-rule bg-panel">
        <div className="shrink-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Books
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="px-4 py-2 text-xs text-muted">Loading…</p>
          ) : books.length === 0 ? (
            <p className="px-4 py-4 text-xs text-muted leading-relaxed">
              No books installed — upload one in Admin → Modules.
            </p>
          ) : (
            books.map((book) => {
              const active = book.name === selectedModule;
              return (
                <button
                  key={book.name}
                  onClick={() => handleSelectBook(book)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'border-l-2 border-brass bg-panel text-brass'
                      : 'border-l-2 border-transparent text-muted hover:bg-panel hover:text-parchment'
                  }`}
                >
                  {book.description || book.name}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Reader */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {!selectedModule ? (
          <div className="flex h-full items-center justify-center text-sm text-pageMuted">
            Select a book from the sidebar to start reading.
          </div>
        ) : (
          <BookPane
            module={selectedModule}
            initialScrollY={bookReader?.scrollY ?? 0}
            onScrollChange={handleScrollChange}
            isLoggedIn={isLoggedIn}
          />
        )}
      </div>
    </div>
  );
}

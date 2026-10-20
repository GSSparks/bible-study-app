import { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { api } from '../api/client.js';
import BookPane from './BookPane.jsx';

export default function BooksView({ bookReader, onBookChange, isLoggedIn = false, defaultBibleModule, onOpenInBible, onOpenInCell }) {
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
  const [mobileShowReader, setMobileShowReader] = useState(false);

  function handleSelectBook(book) {
    onBookChange?.({ module: book.name, scrollY: 0 });
    setMobileShowReader(true);
  }

  function handleScrollChange(y) {
    onBookChange?.({ ...bookReader, scrollY: y });
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <div className={`flex shrink-0 flex-col border-r border-rule bg-panel ${mobileShowReader ? 'hidden lg:flex lg:w-64' : 'w-full lg:w-64'}`}>
        <div className="shrink-0 border-b border-rule px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-brass" />
            <h1 className="font-display text-base font-semibold text-parchment">Books</h1>
          </div>
          <p className="mt-0.5 font-ui text-[10px] uppercase tracking-widest text-muted">Prose & Reference Books</p>
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
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${mobileShowReader ? 'flex' : 'hidden lg:flex'}`}>
        {mobileShowReader && (
          <button
            onClick={() => setMobileShowReader(false)}
            className="flex shrink-0 items-center gap-1.5 border-b border-rule px-4 py-2.5 text-sm text-muted hover:text-parchment lg:hidden"
          >
            <ChevronLeft size={15} />
            Books
          </button>
        )}
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
            defaultBibleModule={defaultBibleModule}
            onOpenInBible={onOpenInBible}
            onOpenInCell={onOpenInCell}
          />
        )}
      </div>
    </div>
  );
}

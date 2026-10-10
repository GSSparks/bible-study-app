import { useState } from 'react';

// Matches "John 3", "1 Cor 13:1", "Romans 8:28-30", "Gen.1.1" — anything
// that looks like a book name followed by a chapter/verse number.
function looksLikeReference(q) {
  return /^(\d\s+)?[a-z][a-z.]+\.?\s+\d/i.test(q.trim());
}

export default function SearchBar({ activeModule, onJump, onSearch }) {
  const [query, setQuery] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (looksLikeReference(q)) {
      onJump?.(q);
    } else {
      onSearch?.(q);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Reference (John 3:16) or search words…"
        className="w-full rounded-md border border-rule bg-panel px-4 py-2 font-sans text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-brass/90 px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-brass"
      >
        Go
      </button>
    </form>
  );
}

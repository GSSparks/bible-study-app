import { useState } from 'react';
import NotesSidebar from './NotesSidebar.jsx';
import Library from './Library.jsx';

const TABS = ['Notes', 'PDFs'];

/** Combines what used to be the dock's separate "notes" and "library"
 * tabs into one standalone page. NotesSidebar is passed reference={null}
 * — its own "This passage" tab already handles that gracefully (an
 * existing "open a passage to see notes here" message), so no changes
 * were needed there beyond which tab it defaults to on a page with no
 * passage concept at all.
 */
export default function LibraryView({ isLoggedIn }) {
  const [tab, setTab] = useState('Notes');

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-rule px-6 pt-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={tab === 'Notes' ? 'h-full' : 'hidden'}>
          <NotesSidebar reference={null} module={null} isLoggedIn={isLoggedIn} />
        </div>
        <div className={tab === 'PDFs' ? 'h-full' : 'hidden'}>
          <Library />
        </div>
      </div>
    </div>
  );
}
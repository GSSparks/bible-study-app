import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, BookMarked, BookText, Box, Compass, Library as LibraryIcon, Map, Settings as SettingsIcon, Shield, StickyNote, Users, Menu, X } from 'lucide-react';
import BiblePanel from './BiblePanel.jsx';
import BookPanel from './BookPanel.jsx';
import NotePanel from './NotePanel.jsx';
import BiblicaMapsView from './BiblicaMapsView.jsx';
import BooksView from './BooksView.jsx';
import CellView from './CellView.jsx';
import TopicGuidePane from './TopicGuidePane.jsx';
import PlaceholderView from './PlaceholderView.jsx';
import SettingsView from './SettingsView.jsx';
import AdminView from './AdminView.jsx';
import ScriptoriumsView from './ScriptoriumsView.jsx';
import LibraryView from './LibraryView.jsx';
import NotesView from './NotesView.jsx';
import FellowsView from './FellowsView.jsx';
import CursusView from './CursusView.jsx';
import LoginModal from './LoginModal.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import UserMenu from './UserMenu.jsx';
import { api } from '../api/client.js';

const NAV_GROUPS = [
  {
    label: 'Study',
    items: [
      { key: 'cell', label: 'Cell', Icon: BookOpen },
      { key: 'codex', label: 'Codex', Icon: Compass },
      { key: 'books', label: 'Books', Icon: BookText },
      { key: 'map', label: 'Map', Icon: Map },
    ],
  },
  {
    label: 'Personal',
    items: [
      { key: 'library', label: 'Library', Icon: LibraryIcon },
      { key: 'plans', label: 'Cursus', Icon: BookMarked },
      { key: 'notes', label: 'Notes', Icon: StickyNote, requiresAuth: true },
    ],
  },
  {
    label: 'Community',
    items: [
      { key: 'scriptoriums', label: 'Scriptoriums', Icon: Box, requiresAuth: true },
      { key: 'fellows', label: 'Fellows', Icon: Users, requiresAuth: true },
    ],
  },
  {
    items: [
      { key: 'settings', label: 'Settings', Icon: SettingsIcon, requiresAuth: true },
      { key: 'admin', label: 'Admin', Icon: Shield, requiresAuth: true, adminOnly: true },
    ],
  },
];

export default function AppShell({ auth }) {
  const location = useLocation();
  const routerNavigate = useNavigate();

  // Derive view + sub-param from URL rather than tracking in state.
  // pathParts[0] is the view key (e.g. "scriptoriums", "library");
  // pathParts[1] is the sub-param when present (username, studyId).
  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeView = pathParts[0] || 'cell';
  const locationSub = pathParts[1] ?? null;
  // /scriptoriums/:scriptoriumId/studies/:studyId[/builder]
  const urlScriptoriumId = activeView === 'scriptoriums' ? locationSub : null;
  const urlStudyId = activeView === 'scriptoriums' && pathParts[2] === 'studies' ? pathParts[3] ?? null : null;
  const urlIsBuilder = activeView === 'scriptoriums' && pathParts[4] === 'builder';

  const lastScriptoriumPath = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [biblePanelOpen, setBiblePanelOpen] = useState(false);
  const [pendingBiblePanel, setPendingBiblePanel] = useState(null);
  const [currentBibleRef, setCurrentBibleRef] = useState(null);
  // 'My Scriptorium' as the initial value matches the backend's own
  // default, so there's no flash of a different placeholder before the
  // real fetch resolves.
  const [brandName, setBrandName] = useState('My Scriptorium');

  // Lifted up from StudyMode (where it used to live entirely local) now
  // that "set default Bible" moves to Settings — with StudyMode staying
  // mounted across navigation (see the note on the Passages wrapper
  // below), it would otherwise only ever read this once, at its first
  // mount, and never notice a change made later from Settings. Lifting
  // it here means both places share the exact same live value.
  const [defaultBibleModule, setDefaultBibleModuleState] = useState(() => {
    try {
      return localStorage.getItem('scriptorium-default-bible') || '';
    } catch {
      return '';
    }
  });

  function setDefaultBibleModule(moduleCode) {
    setDefaultBibleModuleState(moduleCode);
    try {
      localStorage.setItem('scriptorium-default-bible', moduleCode);
    } catch {
      // storage unavailable — not worth failing over
    }
  }

  // If no default Bible has been chosen (fresh install or first mobile session),
  // auto-select the first installed Bible module so the Lexicon pane works
  // immediately without requiring the user to visit Settings first.
  useEffect(() => {
    if (defaultBibleModule) return;
    api.listInstalledModules('BIBLE')
      .then((mods) => { if (mods.length > 0) setDefaultBibleModule(mods[0].name); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-view deep links for CellView and AI Companion remain nonce-
  // based because those views don't have URL sub-params — the passage
  // open request and AI question are transient actions, not shareable
  // addresses. Studies deep-links now go through the URL instead.
  const [pendingBibleOpen, setPendingBibleOpen] = useState(null);
  const [pendingAiOverview, setPendingAiOverview] = useState(null);
  const [pendingAiPhraseStudy, setPendingAiPhraseStudy] = useState(null);
  const [pendingAiDocument, setPendingAiDocument] = useState(null);
  const [pendingCodexQuery, setPendingCodexQuery] = useState(null);

  const [bookReader, setBookReader] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scriptorium-book-reader')) || { module: null, scrollY: 0 }; }
    catch { return { module: null, scrollY: 0 }; }
  });
  const [bookPanelOpen, setBookPanelOpen] = useState(false);
  const [notePanelOpen, setNotePanelOpen] = useState(false);

  useEffect(() => {
    if (activeView === 'scriptoriums') {
      lastScriptoriumPath.current = location.pathname;
    }
  }, [location.pathname, activeView]);

  function navigate(key) {
    if (key === 'scriptoriums' && lastScriptoriumPath.current) {
      routerNavigate(lastScriptoriumPath.current);
    } else {
      routerNavigate('/' + key);
    }
    setDrawerOpen(false);
  }

  function updateBookReader(changes) {
    setBookReader((prev) => {
      const next = { ...prev, ...changes };
      try { localStorage.setItem('scriptorium-book-reader', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function openBook(module) {
    updateBookReader({ module, scrollY: 0 });
    navigate('books');
  }

  function openBiblePanel(reference, module) {
    setPendingBiblePanel({ reference, module: module || null, nonce: Date.now() });
    setBiblePanelOpen(true);
  }

  function openInPassages(module, reference) {
    setPendingBibleOpen({ module, reference, nonce: Date.now() });
    navigate('cell');
  }

  function askAiCompanionAbout(module, reference) {
    setPendingAiOverview({ module, reference, nonce: Date.now() });
    navigate('cell');
  }

  function askAiCompanionPhraseStudy(phrase, module, strongsSequence) {
    setPendingAiPhraseStudy({ phrase, module, strongsSequence, nonce: Date.now() });
    navigate('cell');
  }

  function askAiCompanionAboutDocument(docId) {
    setPendingAiDocument({ id: docId, nonce: Date.now() });
    navigate('cell');
  }

  function openCodex(term) {
    setPendingCodexQuery({ term, nonce: Date.now() });
    navigate('codex');
  }

  useEffect(() => {
    api.getBranding().then((b) => setBrandName(b.name)).catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setBiblePanelOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setBookPanelOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setNotePanelOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        if (biblePanelOpen) setBiblePanelOpen(false);
        if (bookPanelOpen) setBookPanelOpen(false);
        if (notePanelOpen) setNotePanelOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [biblePanelOpen, bookPanelOpen, notePanelOpen]);

  function isVisible(item) {
    if (item.adminOnly && auth.user?.role !== 'admin') return false;
    if (item.requiresAuth && !auth.user) return false;
    return true;
  }

  // Filtered per group, then any group left with zero visible items is
  // dropped entirely — otherwise an anonymous visitor (for whom the
  // entire second group requires auth) would see a stray divider line
  // with an empty gap below it and nothing in it.
  const visibleGroups = NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter(isVisible) }))
    .filter((group) => group.items.length > 0);

  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  const activeItem = allItems.find((item) => item.key === activeView) || allItems[0];

  return (
    <div className="flex min-h-0 bg-ink text-parchment" style={{ height: '100dvh' }}>
      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/70 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar — full-screen overlay on mobile, static column on lg+ */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-full shrink-0 flex-col border-r border-rule bg-ink transition-transform duration-200 ease-in-out lg:relative lg:w-56 lg:translate-x-0 lg:z-auto ${drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-md" />
          <span className="font-display text-lg tracking-wide">{brandName}</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="ml-auto rounded p-1 text-muted hover:text-parchment lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {visibleGroups.map((group, groupIndex) => (
            <div key={groupIndex} className={groupIndex > 0 ? 'mt-2 border-t border-rule pt-2' : ''}>
              {group.label && (
                <p className="px-5 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-widest text-muted/50">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.Icon;
                const active = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left text-sm lg:py-2 ${
                      active ? 'border-l-2 border-brass bg-panel text-brass' : 'border-l-2 border-transparent text-muted hover:bg-panel hover:text-parchment'
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} className="shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3">
          <button
            onClick={() => { setBookPanelOpen((prev) => !prev); setDrawerOpen(false); }}
            title="Book Reader (Ctrl+K)"
            className={`mb-1 flex w-full items-center gap-3 rounded px-2 py-3 text-sm transition-colors lg:py-2 ${bookPanelOpen ? 'text-brass' : 'text-muted hover:bg-panel hover:text-parchment'}`}
          >
            <BookText size={18} strokeWidth={2} className="shrink-0" />
            Book Reader
          </button>
          <button
            onClick={() => { setBiblePanelOpen((prev) => !prev); setDrawerOpen(false); }}
            title="Quick Bible (Ctrl+B)"
            className={`flex w-full items-center gap-3 rounded px-2 py-3 text-sm transition-colors lg:py-2 ${biblePanelOpen ? 'text-brass' : 'text-muted hover:bg-panel hover:text-parchment'}`}
          >
            <BookOpen size={18} strokeWidth={2} className="shrink-0" />
            Bible
          </button>
          <button
            onClick={() => { setNotePanelOpen((prev) => !prev); setDrawerOpen(false); }}
            title="Quick Note (Ctrl+`)"
            className={`mb-2 flex w-full items-center gap-3 rounded px-2 py-3 text-sm transition-colors lg:py-2 ${notePanelOpen ? 'text-brass' : 'text-muted hover:bg-panel hover:text-parchment'}`}
          >
            <StickyNote size={18} strokeWidth={2} className="shrink-0" />
            Notepad
          </button>
          {auth.user ? (
            <UserMenu
              username={auth.user.username}
              items={[{ label: 'Settings', onClick: () => { navigate('settings'); } }]}
              onLogout={() => auth.logout()}
            />
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full rounded border border-rule px-3 py-1.5 text-xs hover:border-brass"
            >
              Log in
            </button>
          )}
        </div>
      </aside>

      {/* Main area — flex-col so the mobile top bar sits above the view */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex shrink-0 items-center border-b border-rule px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-muted hover:text-parchment"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="ml-3 flex-1 font-display text-lg tracking-wide">{brandName}</span>
          <button
            onClick={() => setBiblePanelOpen((prev) => !prev)}
            title="Quick Bible (Ctrl+B)"
            className={`rounded p-1 transition-colors ${biblePanelOpen ? 'text-brass' : 'text-muted hover:text-parchment'}`}
          >
            <BookOpen size={18} />
          </button>
        </div>

      <main className="min-h-0 flex-1 overflow-hidden">
        {/* Deliberately always mounted, visibility toggled rather than
            conditionally rendered like every other view below — Passages
            carries real, valuable in-memory state (open tabs, reading
            history, the focused reference) that a plain {activeView ===
            'passages' && ...} would discard on every single navigation
            away, even just to glance at another tab for a second. Same
            "keep it mounted, toggle a class" pattern MainLayout already
            uses internally for its own open tabs — this just applies it
            one level up, to the whole reading session. */}
        <div className={activeView === 'cell' ? 'h-full' : 'hidden'}>
          <CellView
            auth={auth}
            onNavigateToLibrary={() => navigate('library')}
            pendingBibleOpen={pendingBibleOpen}
            onBibleOpenConsumed={() => setPendingBibleOpen(null)}
            defaultBibleModule={defaultBibleModule}
            pendingAiOverview={pendingAiOverview}
            onAiOverviewConsumed={() => setPendingAiOverview(null)}
            pendingAiPhraseStudy={pendingAiPhraseStudy}
            onAiPhraseStudyConsumed={() => setPendingAiPhraseStudy(null)}
            pendingAiDocument={pendingAiDocument}
            onAiDocumentConsumed={() => setPendingAiDocument(null)}
            onOpenCodex={openCodex}
            onFocusedReferenceChange={setCurrentBibleRef}
          />
        </div>
        <div className={activeView === 'codex' ? 'h-full' : 'hidden'}>
          <TopicGuidePane
            isLoggedIn={Boolean(auth.user)}
            initialQuery={pendingCodexQuery}
            defaultBibleModule={defaultBibleModule}
            onOpenInBible={(ref) => openBiblePanel(ref, null)}
            onOpenInCell={(ref) => openInPassages(null, ref)}
          />
        </div>
        {activeView === 'settings' && (
          <SettingsView
            username={auth.user?.username}
            onOpenChangePassword={() => setShowChangePasswordModal(true)}
            defaultBibleModule={defaultBibleModule}
            onSetDefaultBibleModule={setDefaultBibleModule}
          />
        )}
        {activeView === 'admin' && <AdminView />}
        {activeView === 'plans' && (
          <CursusView
            isLoggedIn={Boolean(auth.user)}
            isAdmin={auth.user?.role === 'admin'}
            onOpenInBible={(ref) => openBiblePanel(ref, null)}
          />
        )}
        <div className={activeView === 'scriptoriums' ? 'h-full' : 'hidden'}>
          <ScriptoriumsView
            currentUserId={auth.user?.id}
            currentUserRole={auth.user?.role}
            urlScriptoriumId={urlScriptoriumId}
            urlStudyId={urlStudyId}
            urlIsBuilder={urlIsBuilder}
            onOpenInPassages={openInPassages}
            onAskAiCompanionAbout={askAiCompanionAbout}
            onAskAiCompanionPhraseStudy={askAiCompanionPhraseStudy}
            onOpenBiblePanel={openBiblePanel}
            bibleModule={defaultBibleModule}
          />
        </div>
        <div className={activeView === 'library' ? 'h-full' : 'hidden'}>
          <LibraryView
            isLoggedIn={Boolean(auth.user)}
            isAdmin={auth.user?.role === 'admin'}
            onAskAI={askAiCompanionAboutDocument}
            onOpenInCell={(ref) => openInPassages(null, ref)}
          />
        </div>
        <div className={activeView === 'notes' ? 'h-full' : 'hidden'}>
          <NotesView
            isLoggedIn={Boolean(auth.user)}
            onOpenInCell={(ref) => openInPassages(null, ref)}
            onOpenInBible={(ref) => openBiblePanel(ref, null)}
            bibleModule={defaultBibleModule}
          />
        </div>
        {activeView === 'fellows' && (
          <FellowsView isLoggedIn={Boolean(auth.user)} />
        )}
        <div className={activeView === 'books' ? 'h-full' : 'hidden'}>
          <BooksView
            bookReader={bookReader}
            onBookChange={updateBookReader}
            isLoggedIn={Boolean(auth.user)}
            defaultBibleModule={defaultBibleModule}
            onOpenInBible={(ref) => openBiblePanel(ref, null)}
            onOpenInCell={(ref) => openInPassages(null, ref)}
          />
        </div>
        <div className={activeView === 'map' ? 'h-full' : 'hidden'}>
          <BiblicaMapsView />
        </div>
        {activeView !== 'cell' &&
          activeView !== 'codex' &&
          activeView !== 'settings' &&
          activeView !== 'admin' &&
          activeView !== 'plans' &&
          activeView !== 'scriptoriums' &&
          activeView !== 'library' &&
          activeView !== 'notes' &&
          activeView !== 'fellows' &&
          activeView !== 'books' &&
          activeView !== 'map' && (
          <PlaceholderView title={activeItem.label} description={activeItem.description} />
        )}
      </main>
      </div>

      <BiblePanel
        open={biblePanelOpen}
        onClose={() => setBiblePanelOpen(false)}
        pendingOpen={pendingBiblePanel}
        onPendingConsumed={() => setPendingBiblePanel(null)}
        defaultBibleModule={defaultBibleModule}
        onReferenceChange={setCurrentBibleRef}
      />
      <BookPanel
        open={bookPanelOpen}
        onClose={() => setBookPanelOpen(false)}
        bookReader={bookReader}
        onBookChange={updateBookReader}
        onOpenInBooks={(module) => { openBook(module); setBookPanelOpen(false); }}
        isLoggedIn={Boolean(auth.user)}
        defaultBibleModule={defaultBibleModule}
        onOpenInBible={(ref) => openBiblePanel(ref, null)}
        onOpenInCell={(ref) => openInPassages(null, ref)}
      />

      <NotePanel
        open={notePanelOpen}
        onClose={() => setNotePanelOpen(false)}
        isLoggedIn={Boolean(auth.user)}
        onOpenInNotes={() => navigate('notes')}
      />

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={auth.login} />}
      {showChangePasswordModal && <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />}
    </div>
  );
}
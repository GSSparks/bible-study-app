import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Box, Library as LibraryIcon, Sparkles, Bell, MessageCircle, UserCircle, Settings as SettingsIcon, Shield, Menu } from 'lucide-react';
import CellView from './CellView.jsx';
import PlaceholderView from './PlaceholderView.jsx';
import SettingsView from './SettingsView.jsx';
import AdminView from './AdminView.jsx';
import ScriptoriumsView from './ScriptoriumsView.jsx';
import HomeView from './HomeView.jsx';
import ChronicleView from './ChronicleView.jsx';
import LibraryView from './LibraryView.jsx';
import AICompanionView from './AICompanionView.jsx';
import LoginModal from './LoginModal.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import UserMenu from './UserMenu.jsx';
import { api } from '../api/client.js';

// Views with no `description` are ones with a real component below —
// everything else renders PlaceholderView with this text. `adminOnly`
// items are filtered out of the nav entirely for non-admins rather
// than shown-but-blocked, same reasoning as hiding "Manage modules"
// from non-admins elsewhere in the app. `requiresAuth` items are
// filtered out for anonymous visitors — no point linking to a page
// that only says "log in", when the Log in button is already right
// there at the bottom of this same sidebar.
//
// Grouped into two sections matching the mockup — a main-features
// group and an activity/account group, with a thin divider between
// them. Groups are arrays here (not objects with a label) since the
// mockup itself has no visible group headings, just the spacing/
// divider — nothing to actually render as a label.
const NAV_GROUPS = [
  [
    { key: 'home', label: 'Home', Icon: Home, requiresAuth: true },
    { key: 'cell', label: 'Cell', Icon: BookOpen },
    {
      key: 'scriptoriums',
      label: 'Scriptoriums',
      Icon: Box,
      requiresAuth: true,
    },
    { key: 'library', label: 'Library', Icon: LibraryIcon },
    { key: 'ai-companion', label: 'AI Companion', Icon: Sparkles },
  ],
  [
    {
      key: 'notifications',
      label: 'Notifications',
      Icon: Bell,
      requiresAuth: true,
      description: "You'll see comments, mentions, and Scriptorium activity here. Fellow requests live in the Fellows page.",
    },
    { key: 'messages', label: 'Messages', Icon: MessageCircle, requiresAuth: true, description: 'Direct messages with your Fellows.' },
    {
      key: 'chronicle',
      label: 'My Chronicle',
      Icon: UserCircle,
      requiresAuth: true,
    },
    { key: 'settings', label: 'Settings', Icon: SettingsIcon, requiresAuth: true },
    { key: 'admin', label: 'Admin', Icon: Shield, requiresAuth: true, adminOnly: true },
  ],
];

export default function AppShell({ auth }) {
  const location = useLocation();
  const routerNavigate = useNavigate();

  // Derive view + sub-param from URL rather than tracking in state.
  // pathParts[0] is the view key (e.g. "chronicle", "studies");
  // pathParts[1] is the sub-param when present (username, studyId).
  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeView = pathParts[0] || 'cell';
  const locationSub = pathParts[1] ?? null;
  const profileUsername = activeView === 'chronicle' ? locationSub : null;
  // /scriptoriums/:scriptoriumId/studies/:studyId
  const urlScriptoriumId = activeView === 'scriptoriums' ? locationSub : null;
  const urlStudyId = activeView === 'scriptoriums' && pathParts[2] === 'studies' ? pathParts[3] ?? null : null;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
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

  // Cross-view deep links for CellView and AI Companion remain nonce-
  // based because those views don't have URL sub-params — the passage
  // open request and AI question are transient actions, not shareable
  // addresses. Studies deep-links now go through the URL instead.
  const [pendingBibleOpen, setPendingBibleOpen] = useState(null);
  const [pendingAiOverview, setPendingAiOverview] = useState(null);
  const [pendingPhraseStudy, setPendingPhraseStudy] = useState(null);

  function navigate(key) {
    routerNavigate('/' + key);
    setDrawerOpen(false);
  }

  function openInPassages(module, reference) {
    setPendingBibleOpen({ module, reference, nonce: Date.now() });
    navigate('cell');
  }

  function askAiCompanionAbout(module, reference) {
    setPendingAiOverview({ module, reference, nonce: Date.now() });
    navigate('ai-companion');
  }

  function viewProfile(username) {
    if (username === auth.user?.username) {
      routerNavigate('/chronicle');
    } else {
      routerNavigate('/chronicle/' + encodeURIComponent(username));
    }
    setDrawerOpen(false);
  }

  function askAiCompanionPhraseStudy(phrase, module, strongsSequence) {
    setPendingPhraseStudy({ phrase, module, strongsSequence, nonce: Date.now() });
    navigate('ai-companion');
  }

  function openStudy(scriptoriumId, studyId) {
    if (scriptoriumId) {
      routerNavigate('/scriptoriums/' + scriptoriumId + '/studies/' + studyId);
    } else {
      routerNavigate('/scriptoriums');
    }
    setDrawerOpen(false);
  }

  function navigateToStudiesList() {
    routerNavigate('/scriptoriums');
    setDrawerOpen(false);
  }

  useEffect(() => {
    api.getBranding().then((b) => setBrandName(b.name)).catch(() => {});
  }, []);

  function isVisible(item) {
    if (item.adminOnly && auth.user?.role !== 'admin') return false;
    if (item.requiresAuth && !auth.user) return false;
    return true;
  }

  // Filtered per group, then any group left with zero visible items is
  // dropped entirely — otherwise an anonymous visitor (for whom the
  // entire second group requires auth) would see a stray divider line
  // with an empty gap below it and nothing in it.
  const visibleGroups = NAV_GROUPS.map((group) => group.filter(isVisible)).filter((group) => group.length > 0);

  const allItems = NAV_GROUPS.flat();
  const activeItem = allItems.find((item) => item.key === activeView) || allItems[0];

  return (
    <div className="flex h-screen min-h-0 bg-ink text-parchment">
      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/70 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static column on lg+ */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-rule bg-ink transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:z-auto ${drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2 px-5 py-4">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-md" />
          <span className="font-display text-lg tracking-wide">{brandName}</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {visibleGroups.map((group, groupIndex) => (
            <div key={groupIndex} className={groupIndex > 0 ? 'mt-2 border-t border-rule pt-2' : ''}>
              {group.map((item) => {
                const Icon = item.Icon;
                const active = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    className={`flex w-full items-center gap-3 px-5 py-2 text-left text-sm ${
                      active ? 'border-r-2 border-brass bg-panel text-brass' : 'text-muted hover:bg-panel hover:text-parchment'
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
          <span className="ml-3 font-display text-lg tracking-wide">{brandName}</span>
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
            onAskAiCompanionAbout={askAiCompanionAbout}
            onAskAiCompanionPhraseStudy={askAiCompanionPhraseStudy}
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
        {activeView === 'home' && (
          <HomeView
            currentUserId={auth.user?.id}
            currentUsername={auth.user?.username}
            onViewProfile={viewProfile}
            onNavigateToStudies={navigateToStudiesList}
            onOpenStudy={openStudy}
          />
        )}
        <div className={activeView === 'scriptoriums' ? 'h-full' : 'hidden'}>
          <ScriptoriumsView
            currentUserId={auth.user?.id}
            urlScriptoriumId={urlScriptoriumId}
            urlStudyId={urlStudyId}
            onOpenInPassages={openInPassages}
            onAskAiCompanionAbout={askAiCompanionAbout}
            onAskAiCompanionPhraseStudy={askAiCompanionPhraseStudy}
          />
        </div>
        {activeView === 'chronicle' && (
          <ChronicleView
            username={profileUsername}
            currentUserId={auth.user?.id}
            currentUsername={auth.user?.username}
            onBack={profileUsername ? () => navigate('chronicle') : null}
            onViewProfile={viewProfile}
          />
        )}
        {activeView === 'library' && <LibraryView isLoggedIn={Boolean(auth.user)} />}
        <div className={activeView === 'ai-companion' ? 'h-full' : 'hidden'}>
          <AICompanionView
            isLoggedIn={Boolean(auth.user)}
            username={auth.user?.displayName || auth.user?.username}
            pendingOverviewRequest={pendingAiOverview}
            onOverviewRequestConsumed={() => setPendingAiOverview(null)}
            pendingPhraseStudyRequest={pendingPhraseStudy}
            onPhraseStudyRequestConsumed={() => setPendingPhraseStudy(null)}
          />
        </div>
        {activeView !== 'cell' &&
          activeView !== 'settings' &&
          activeView !== 'admin' &&
          activeView !== 'scriptoriums' &&
          activeView !== 'library' &&
          activeView !== 'ai-companion' &&
          activeView !== 'home' &&
          activeView !== 'chronicle' && (
          <PlaceholderView title={activeItem.label} description={activeItem.description} />
        )}
      </main>
      </div>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={auth.login} />}
      {showChangePasswordModal && <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />}
    </div>
  );
}
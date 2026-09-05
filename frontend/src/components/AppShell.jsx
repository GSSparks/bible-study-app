import { useEffect, useState } from 'react';
import { Home, BookOpen, Box, FileText, Library as LibraryIcon, Sparkles, Bell, MessageCircle, Users, UserCircle, Settings as SettingsIcon, Shield } from 'lucide-react';
import StudyMode from './StudyMode.jsx';
import PlaceholderView from './PlaceholderView.jsx';
import SettingsView from './SettingsView.jsx';
import AdminView from './AdminView.jsx';
import FellowsView from './FellowsView.jsx';
import ScriptoriumsView from './ScriptoriumsView.jsx';
import HomeView from './HomeView.jsx';
import ProfileWallView from './ProfileWallView.jsx';
import LibraryView from './LibraryView.jsx';
import AICompanionView from './AICompanionView.jsx';
import StudiesView from './StudiesView.jsx';
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
    { key: 'passages', label: 'Passages', Icon: BookOpen },
    {
      key: 'scriptoriums',
      label: 'Scriptoriums',
      Icon: Box,
      requiresAuth: true,
    },
    {
      key: 'studies',
      label: 'Studies',
      Icon: FileText,
      requiresAuth: true,
      description: 'Structured, multi-session studies — for a Scriptorium or on your own. Planned for Phase 2.',
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
    { key: 'fellows', label: 'Fellows', Icon: Users, requiresAuth: true },
    {
      key: 'profile',
      label: 'Profile',
      Icon: UserCircle,
      requiresAuth: true,
    },
    { key: 'settings', label: 'Settings', Icon: SettingsIcon, requiresAuth: true },
    { key: 'admin', label: 'Admin', Icon: Shield, requiresAuth: true, adminOnly: true },
  ],
];

export default function AppShell({ auth }) {
  const [activeView, setActiveView] = useState('passages');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  // 'My Scriptorium' as the initial value matches the backend's own
  // default, so there's no flash of a different placeholder before the
  // real fetch resolves.
  const [brandName, setBrandName] = useState('My Scriptorium');

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
      <aside className="flex w-56 shrink-0 flex-col border-r border-rule">
        <div className="flex items-center gap-2 border-b border-rule px-5 py-4">
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
                    onClick={() => setActiveView(item.key)}
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

        <div className="border-t border-rule p-3">
          {auth.user ? (
            <UserMenu
              username={auth.user.username}
              items={[{ label: 'Settings', onClick: () => setActiveView('settings') }]}
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

      <main className="min-h-0 flex-1 overflow-hidden">
        {activeView === 'passages' && <StudyMode auth={auth} onNavigateToLibrary={() => setActiveView('library')} />}
        {activeView === 'settings' && (
          <SettingsView username={auth.user?.username} onOpenChangePassword={() => setShowChangePasswordModal(true)} />
        )}
        {activeView === 'admin' && <AdminView />}
        {activeView === 'home' && <HomeView currentUserId={auth.user?.id} />}
        {activeView === 'fellows' && <FellowsView currentUserId={auth.user?.id} />}
        {activeView === 'scriptoriums' && <ScriptoriumsView currentUserId={auth.user?.id} />}
        {activeView === 'profile' && <ProfileWallView currentUserId={auth.user?.id} />}
        {activeView === 'library' && <LibraryView isLoggedIn={Boolean(auth.user)} />}
        {activeView === 'ai-companion' && <AICompanionView isLoggedIn={Boolean(auth.user)} />}
        {activeView === 'studies' && <StudiesView currentUserId={auth.user?.id} />}
        {activeView !== 'passages' &&
          activeView !== 'settings' &&
          activeView !== 'admin' &&
          activeView !== 'fellows' &&
          activeView !== 'scriptoriums' &&
          activeView !== 'library' &&
          activeView !== 'ai-companion' &&
          activeView !== 'studies' &&
          activeView !== 'home' &&
          activeView !== 'profile' && (
          <PlaceholderView title={activeItem.label} description={activeItem.description} />
        )}
      </main>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={auth.login} />}
      {showChangePasswordModal && <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />}
    </div>
  );
}
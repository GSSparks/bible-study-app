import { useEffect, useState } from 'react';
import StudyMode from './StudyMode.jsx';
import PlaceholderView from './PlaceholderView.jsx';
import SettingsView from './SettingsView.jsx';
import AdminView from './AdminView.jsx';
import FellowsView from './FellowsView.jsx';
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
const NAV_ITEMS = [
  { key: 'home', label: 'Home', requiresAuth: true, description: 'A feed of what your Fellows and Scriptoriums are sharing.' },
  { key: 'passages', label: 'Passages' },
  {
    key: 'scriptoriums',
    label: 'Scriptoriums',
    requiresAuth: true,
    description: 'Create or join a Scriptorium — a group space with its own wall for studying together, private or public.',
  },
  {
    key: 'studies',
    label: 'Studies',
    requiresAuth: true,
    description: 'Structured, multi-session studies — for a Scriptorium or on your own. Planned for Phase 2.',
  },
  { key: 'library', label: 'Library', description: 'Your notes, highlights, bookmarks, and saved study library, as their own page rather than a docked panel.' },
  { key: 'ai-companion', label: 'AI Companion', description: 'The study assistant, as its own page for general use outside an open passage.' },
  { key: 'fellows', label: 'Fellows', requiresAuth: true },
  {
    key: 'notifications',
    label: 'Notifications',
    requiresAuth: true,
    description: "You'll see comments, mentions, and Scriptorium activity here. Fellow requests live in the Fellows page.",
  },
  { key: 'messages', label: 'Messages', requiresAuth: true, description: 'Direct messages with your Fellows.' },
  { key: 'settings', label: 'Settings', requiresAuth: true },
  {
    key: 'admin',
    label: 'Admin',
    requiresAuth: true,
    adminOnly: true,
  },
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

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && auth.user?.role !== 'admin') return false;
    if (item.requiresAuth && !auth.user) return false;
    return true;
  });

  const activeItem = NAV_ITEMS.find((item) => item.key === activeView) || NAV_ITEMS[0];

  return (
    <div className="flex h-screen min-h-0 bg-ink text-parchment">
      <aside className="flex w-56 shrink-0 flex-col border-r border-rule">
        <div className="flex items-center gap-2 border-b border-rule px-5 py-4">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-md" />
          <span className="font-display text-lg tracking-wide">{brandName}</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {visibleItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`block w-full px-5 py-2 text-left text-sm ${
                activeView === item.key ? 'border-r-2 border-brass bg-panel text-parchment' : 'text-muted hover:bg-panel hover:text-parchment'
              }`}
            >
              {item.label}
            </button>
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
        {activeView === 'passages' && <StudyMode auth={auth} />}
        {activeView === 'settings' && (
          <SettingsView username={auth.user?.username} onOpenChangePassword={() => setShowChangePasswordModal(true)} />
        )}
        {activeView === 'admin' && <AdminView />}
        {activeView === 'fellows' && <FellowsView />}
        {activeView !== 'passages' && activeView !== 'settings' && activeView !== 'admin' && activeView !== 'fellows' && (
          <PlaceholderView title={activeItem.label} description={activeItem.description} />
        )}
      </main>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={auth.login} />}
      {showChangePasswordModal && <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />}
    </div>
  );
}
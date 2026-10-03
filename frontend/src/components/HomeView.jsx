import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { api } from '../api/client.js';
import PostFeed from './PostFeed.jsx';
import Avatar from './Avatar.jsx';
import DailyDevotional from './DailyDevotional.jsx';
import { getAvatarColor } from '../utils/avatar.js';

export default function HomeView({ currentUserId, currentUsername, currentUserRole, onViewProfile, onNavigateToStudies, onOpenStudy }) {
  const [profile, setProfile] = useState(null);
  const [studies, setStudies] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);

  useEffect(() => {
    if (!currentUsername) return;
    api.getUserProfile(currentUsername).then(setProfile).catch(() => {});
    api.listMyStudies().then(setStudies).catch(() => {});
  }, [currentUsername]);

  function refresh() {
    setPostsLoading(true);
    setPostsError(null);
    api
      .getHomeFeed()
      .then(setPosts)
      .catch((e) => setPostsError(e.message))
      .finally(() => setPostsLoading(false));
  }

  useEffect(refresh, []);

  const user = profile?.user;
  const stats = profile?.stats;
  const bannerColor = user ? getAvatarColor(user.username) : '#888';
  const activeStudies = studies.filter((s) => s.myRole);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="flex flex-col items-start gap-5 lg:flex-row">

          {/* ── Left column ─────────────────────────────────── */}
          <div className="w-full space-y-3 lg:w-64 lg:shrink-0">

            {/* Profile card */}
            <div className="rounded-xl border border-rule bg-panel">
              {/* Mini banner */}
              <div className="relative h-20 overflow-hidden rounded-t-xl">
                <div className="absolute inset-0">
                  {user?.bannerUrl ? (
                    <img src={user.bannerUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 70%, ${bannerColor}55 0%, transparent 60%)` }} />
                      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 30%, ${bannerColor}22 0%, transparent 55%)` }} />
                    </>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-panel to-transparent" />
                </div>
              </div>

              {/* Avatar + name */}
              <div className="-mt-8 px-4 pb-4">
                <Avatar
                  username={user?.username}
                  avatarUrl={user?.avatarUrl}
                  size={56}
                  className="relative z-10 ring-4 ring-panel"
                />
                <div className="mt-2">
                  <p className="font-display text-base text-parchment">
                    {user?.displayName || user?.username || '—'}
                  </p>
                  {user?.displayName && (
                    <p className="text-xs text-muted">@{user.username}</p>
                  )}
                  {user?.bio && (
                    <p className="mt-1.5 text-xs leading-relaxed text-parchment/70 line-clamp-3">{user.bio}</p>
                  )}
                </div>

                {/* Stats */}
                {stats && (
                  <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-rule text-center">
                    <StatCell value={stats.postCount} label="Entries" />
                    <StatCell value={stats.fellowCount} label="Fellows" />
                    <StatCell value={stats.noteCount ?? '—'} label="Notes" />
                  </div>
                )}

                <button
                  onClick={() => onViewProfile?.(currentUsername)}
                  className="mt-3 w-full rounded-md border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
                >
                  View my Chronicle
                </button>
              </div>
            </div>

            {/* Active studies card */}
            <div className="rounded-xl border border-rule bg-panel">
              <div className="flex items-center justify-between border-b border-rule px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">My Studies</p>
                {onNavigateToStudies && (
                  <button onClick={onNavigateToStudies} className="text-xs text-muted hover:text-brass">
                    Scriptoriums
                  </button>
                )}
              </div>
              <div className="divide-y divide-rule">
                {activeStudies.length === 0 && (
                  <p className="px-4 py-4 text-xs text-muted">No active studies.</p>
                )}
                {activeStudies.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => s.scriptoriumId && onOpenStudy?.(s.scriptoriumId, s.id)}
                    disabled={!s.scriptoriumId}
                    className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-ink/30 disabled:cursor-default disabled:opacity-60"
                  >
                    <BookOpen size={14} className="mt-0.5 shrink-0 text-brass/70" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-parchment">{s.title}</p>
                      <p className="text-xs text-muted capitalize">
                        {s.scriptoriumId ? 'Group' : 'Solo'} · {s.myRole}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column (feed) ──────────────────────────── */}
          <div className="min-w-0 flex-1">
            <DailyDevotional isAdmin={currentUserRole === 'admin'} />
            <PostFeed
              posts={posts}
              loading={postsLoading}
              error={postsError}
              canPost
              currentUserId={currentUserId}
              onRefresh={refresh}
              onViewProfile={onViewProfile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ value, label }) {
  return (
    <div className="bg-ink/30 px-2 py-2">
      <div className="font-display text-lg leading-none text-brass">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

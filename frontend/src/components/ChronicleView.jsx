import { useEffect, useRef, useState } from 'react';
import { Pencil, UserPlus, Check, Clock, Camera } from 'lucide-react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';
import PostFeed from './PostFeed.jsx';
import { getAvatarColor } from '../utils/avatar.js';

export default function ChronicleView({ username, currentUserId, currentUsername, onBack, onViewProfile }) {
  const isOwnProfile = !username || username === currentUsername;
  const targetUsername = username || currentUsername;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [wallLocked, setWallLocked] = useState(false);
  const [fellows, setFellows] = useState(null);
  const [activeTab, setActiveTab] = useState('entries');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  function loadProfile() {
    if (!targetUsername) return;
    setLoading(true);
    setError(null);
    api
      .getUserProfile(targetUsername)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function loadPosts() {
    setPostsLoading(true);
    setWallLocked(false);
    const fetcher = isOwnProfile ? api.getMyWall() : api.getUserWall(targetUsername);
    fetcher
      .then((data) => setPosts(data.posts))
      .catch(() => setWallLocked(true))
      .finally(() => setPostsLoading(false));
  }

  useEffect(() => {
    setProfile(null);
    setFellows(null);
    setActiveTab('entries');
    loadProfile();
  }, [targetUsername]);

  useEffect(() => {
    if (profile) loadPosts();
  }, [profile?.user?.username]);

  useEffect(() => {
    if (!isOwnProfile || activeTab !== 'fellows' || fellows !== null) return;
    api
      .listConnections()
      .then(setFellows)
      .catch(() => setFellows([]));
  }, [activeTab, isOwnProfile, fellows]);

  async function handleConnectionAction() {
    if (!profile || actionLoading) return;
    setActionLoading(true);
    try {
      const { connectionStatus, connectionId, user } = profile;
      if (connectionStatus === 'none') {
        await api.sendConnectionRequest(user.username);
      } else if (connectionStatus === 'accepted' || connectionStatus === 'sent') {
        await api.removeConnection(connectionId);
      } else if (connectionStatus === 'received') {
        await api.acceptConnectionRequest(connectionId);
      }
      loadProfile();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeclineRequest() {
    if (!profile || actionLoading) return;
    setActionLoading(true);
    try {
      await api.declineConnectionRequest(profile.connectionId);
      loadProfile();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!profile) return null;

  const { user, stats, connectionStatus } = profile;
  const displayName = user.displayName || user.username;
  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const bannerColor = getAvatarColor(user.username);

  const bannerInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleBannerChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const { url } = await api.uploadUserBanner(file);
      setProfile((prev) => ({ ...prev, user: { ...prev.user, bannerUrl: url } }));
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { url } = await api.uploadAvatar(file);
      setProfile((prev) => ({ ...prev, user: { ...prev.user, avatarUrl: url } }));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero banner */}
      <div className="relative h-36 shrink-0 bg-ink">
        <div className="absolute inset-0 overflow-hidden">
          {user.bannerUrl ? (
            <img src={user.bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 70%, ${bannerColor}55 0%, transparent 60%)` }} />
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 30%, ${bannerColor}20 0%, transparent 55%)` }} />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink to-transparent" />
        </div>

        {!isOwnProfile && (
          <button onClick={onBack} className="absolute left-6 top-4 z-10 text-xs text-parchment/60 hover:text-parchment">
            ‹ My Chronicle
          </button>
        )}

        {isOwnProfile && (
          <>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-md bg-ink/60 px-2.5 py-1.5 text-xs text-parchment/80 backdrop-blur-sm hover:bg-ink/80 disabled:opacity-50"
            >
              <Camera size={13} />
              {uploadingBanner ? 'uploading…' : 'change banner'}
            </button>
          </>
        )}
      </div>

      {/* Profile header — avatar overlaps banner */}
      <div className="border-b border-rule px-6 pb-6">
        <div className="-mt-10 mb-4 flex items-end justify-between">
          <div className="relative">
            <Avatar username={user.username} avatarUrl={user.avatarUrl} size={80} className="relative z-10 ring-4 ring-ink" />
            {isOwnProfile && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-ink/50 opacity-0 transition-opacity hover:opacity-100 disabled:opacity-50"
                  style={{ width: 80, height: 80 }}
                >
                  <Camera size={20} className="text-parchment" />
                </button>
              </>
            )}
          </div>
          <div className="pb-1">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 rounded-md border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
              >
                <Pencil size={12} />
                Edit
              </button>
            ) : (
              <ConnectionButton
                status={connectionStatus}
                loading={actionLoading}
                onAction={handleConnectionAction}
                onDecline={handleDeclineRequest}
              />
            )}
          </div>
        </div>

        <h2 className="font-display text-2xl text-parchment">{displayName}</h2>
        {user.displayName && <p className="mt-0.5 text-sm text-muted">@{user.username}</p>}
        <p className="mt-0.5 text-xs text-muted">Member since {joinedDate}</p>

        <div className="mt-3">
          {user.bio ? (
            <p className="text-sm leading-relaxed text-parchment/80">{user.bio}</p>
          ) : isOwnProfile ? (
            <button
              onClick={() => setShowEditModal(true)}
              className="text-sm italic text-muted hover:text-parchment"
            >
              Add a word about yourself…
            </button>
          ) : null}
        </div>

        {/* Stats band */}
        <div className="mt-5 flex flex-wrap gap-3">
          <StatCard value={stats.postCount} label="Entries" />
          <StatCard value={stats.fellowCount} label="Fellows" />
          {isOwnProfile && stats.noteCount !== null && (
            <StatCard value={stats.noteCount} label="Annotations" />
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-rule px-6">
        <TabButton active={activeTab === 'entries'} onClick={() => setActiveTab('entries')}>
          Entries
        </TabButton>
        {isOwnProfile && (
          <TabButton active={activeTab === 'fellows'} onClick={() => setActiveTab('fellows')}>
            Fellows
          </TabButton>
        )}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'entries' &&
          (wallLocked ? (
            <div className="rounded-md border border-rule bg-panel p-6 text-center">
              <p className="text-sm text-muted">Become Fellows to read their Chronicle entries.</p>
            </div>
          ) : (
            <PostFeed
              posts={posts}
              loading={postsLoading}
              error={null}
              canPost={isOwnProfile}
              currentUserId={currentUserId}
              onRefresh={loadPosts}
              onViewProfile={onViewProfile}
            />
          ))}

        {activeTab === 'fellows' && isOwnProfile && (
          <FellowsList fellows={fellows} onViewProfile={onViewProfile} />
        )}
      </div>

      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setProfile((prev) => ({ ...prev, user: { ...prev.user, ...updated } }));
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="min-w-[80px] rounded-md border border-rule bg-panel px-4 py-3 text-center">
      <div className="font-display text-xl text-brass">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`mr-6 border-b-2 pb-2 pt-3 text-sm ${active ? 'border-brass text-parchment' : 'border-transparent text-muted hover:text-parchment'}`}
    >
      {children}
    </button>
  );
}

function ConnectionButton({ status, loading, onAction, onDecline }) {
  if (status === 'accepted') {
    return (
      <button
        onClick={onAction}
        disabled={loading}
        className="flex items-center gap-1.5 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
        title="Remove Fellow"
      >
        <Check size={12} />
        Fellow
      </button>
    );
  }
  if (status === 'sent') {
    return (
      <button
        onClick={onAction}
        disabled={loading}
        className="flex items-center gap-1.5 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
        title="Cancel request"
      >
        <Clock size={12} />
        Request Sent
      </button>
    );
  }
  if (status === 'received') {
    return (
      <div className="flex gap-2">
        <button
          onClick={onAction}
          disabled={loading}
          className="flex items-center gap-1.5 rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
        >
          <Check size={12} />
          Accept
        </button>
        <button
          onClick={onDecline}
          disabled={loading}
          className="rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onAction}
      disabled={loading}
      className="flex items-center gap-1.5 rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
    >
      <UserPlus size={12} />
      Add as Fellow
    </button>
  );
}

function FellowsList({ fellows, onViewProfile }) {
  if (fellows === null) return <p className="text-sm text-muted">Loading…</p>;
  if (fellows.length === 0) {
    return <p className="text-sm text-muted">No Fellows yet. Find people to connect with in the Fellows view.</p>;
  }
  return (
    <div className="space-y-2">
      {fellows.map((f) => (
        <button
          key={f.connectionId}
          onClick={() => onViewProfile?.(f.username)}
          className="flex w-full items-center gap-3 rounded-md border border-rule bg-panel p-3 text-left hover:border-brass"
        >
          <Avatar username={f.username} size={36} />
          <div>
            <p className="text-sm text-parchment">{f.username}</p>
            <p className="text-xs text-muted">
              Fellows since {new Date(f.since).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function EditProfileModal({ user, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await api.updateMyProfile({
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
      });
      onSaved(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-rule bg-panel p-6 shadow-xl">
        <h3 className="mb-4 font-display text-lg text-parchment">Edit Your Chronicle</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder={user.username}
              autoFocus
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
            <p className="mt-1 text-xs text-muted">Shown in place of @{user.username}. Leave blank to use your username.</p>
          </div>
          <div>
            <label className="mb-1 flex justify-between text-xs uppercase tracking-wide text-muted">
              <span>About you</span>
              <span className="normal-case">{bio.length}/300</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="A word about this scribe…"
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-rule px-4 py-2 text-xs text-muted hover:border-parchment hover:text-parchment"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-brass/90 px-4 py-2 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';

export default function SettingsView({ user, onUserUpdate, onOpenChangePassword, defaultBibleModule, onSetDefaultBibleModule }) {
  const username = user?.username ?? '';

  // --- Profile (display name, bio, avatar) ---
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setBio(user?.bio ?? '');
  }, [user?.displayName, user?.bio]);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await api.updateMyProfile({ displayName: displayName || null, bio: bio || null });
      await onUserUpdate();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      await api.uploadAvatar(file);
      await onUserUpdate();
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  // --- Bible module default ---
  const [bibleModules, setBibleModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);

  useEffect(() => {
    api
      .listInstalledModules('BIBLE')
      .then(setBibleModules)
      .catch(() => {})
      .finally(() => setLoadingModules(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-lg p-8">
      <h2 className="mb-6 font-display text-2xl text-parchment">Settings</h2>

      {/* Profile */}
      <div className="mb-4 rounded-md border border-rule bg-panel p-4">
        <div className="mb-3 text-sm text-parchment">Profile</div>
        <form onSubmit={handleProfileSave}>
          {/* Avatar row */}
          <div className="mb-4 flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar username={username} avatarUrl={user?.avatarUrl} size={72} />
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/60 text-xs text-parchment">
                  …
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment disabled:opacity-50"
              >
                {avatarUploading ? 'Uploading…' : 'Upload photo'}
              </button>
              <p className="mt-1 text-xs text-muted">JPEG, PNG, WebP or GIF, max 5 MB</p>
              {avatarError && <p className="mt-1 text-xs text-red-400">{avatarError}</p>}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Display name */}
          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-muted">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder={username}
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
            />
          </label>

          {/* Bio */}
          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-muted">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              className="w-full resize-none rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
            />
            <span className="mt-0.5 block text-right text-xs text-muted">{bio.length} / 300</span>
          </label>

          {profileError && <p className="mb-2 text-xs text-red-400">{profileError}</p>}
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment disabled:opacity-50"
          >
            {profileSaving ? 'Saving…' : profileSaved ? 'Saved' : 'Save profile'}
          </button>
        </form>
      </div>

      {/* Account */}
      <div className="mb-4 rounded-md border border-rule bg-panel p-4">
        <div className="mb-1 text-sm text-parchment">Account</div>
        <div className="mb-4 text-xs text-muted">
          Signed in as <span className="text-parchment">{username}</span>
        </div>
        <button
          onClick={onOpenChangePassword}
          className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment"
        >
          Change password
        </button>
      </div>

      {/* Reading */}
      <div className="rounded-md border border-rule bg-panel p-4">
        <div className="mb-1 text-sm text-parchment">Reading</div>
        <div className="mb-3 text-xs text-muted">
          The translation cross-references open in by default, and the starting Bible in Passages.
        </div>
        {loadingModules ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : bibleModules.length === 0 ? (
          <p className="text-xs text-muted">No Bible modules installed yet.</p>
        ) : (
          <select
            value={defaultBibleModule}
            onChange={(e) => onSetDefaultBibleModule(e.target.value)}
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
          >
            <option value="">No default set</option>
            {bibleModules.map((m) => (
              <option key={m.name} value={m.name}>
                {m.description || m.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

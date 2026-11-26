import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';

export default function SettingsView({ user, onUserUpdate, onOpenChangePassword, defaultBibleModule, onSetDefaultBibleModule, defaultCommentaryModule, onSetDefaultCommentaryModule, defaultDictionaryModule, onSetDefaultDictionaryModule }) {
  const username = user?.username ?? '';

  // --- Profile (display name, bio, avatar) ---
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteMyAccount(deletePassword);
      await onUserUpdate();
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scriptkata-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const [aiOptOut, setAiOptOut] = useState(user?.aiOptOut ?? false);
  const [aiToggleSaving, setAiToggleSaving] = useState(false);

  useEffect(() => {
    setAiOptOut(user?.aiOptOut ?? false);
  }, [user?.aiOptOut]);

  async function handleAiToggle() {
    const next = !aiOptOut;
    setAiToggleSaving(true);
    try {
      await api.updateMyProfile({ aiOptOut: next });
      setAiOptOut(next);
      await onUserUpdate();
    } finally {
      setAiToggleSaving(false);
    }
  }

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const avatarInputRef = useRef(null);

  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerRemoving, setBannerRemoving] = useState(false);
  const [bannerError, setBannerError] = useState(null);
  const bannerInputRef = useRef(null);

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

  async function handleBannerChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    setBannerError(null);
    try {
      await api.uploadUserBanner(file);
      await onUserUpdate();
    } catch (err) {
      setBannerError(err.message);
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  }

  async function handleBannerRemove() {
    setBannerRemoving(true);
    setBannerError(null);
    try {
      await api.removeUserBanner();
      await onUserUpdate();
    } catch (err) {
      setBannerError(err.message);
    } finally {
      setBannerRemoving(false);
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
  const [commentaryModules, setCommentaryModules] = useState([]);
  const [dictModules, setDictModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listInstalledModules('BIBLE'),
      api.listInstalledModules('COMMENTARY'),
      api.listInstalledModules('DICT'),
    ]).then(([bible, commentary, dict]) => {
      setBibleModules(bible);
      setCommentaryModules(commentary);
      setDictModules(dict);
    }).catch(() => {}).finally(() => setLoadingModules(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-lg p-8">
      <h2 className="mb-6 font-display text-2xl text-parchment">Settings</h2>

      {/* Profile */}
      <div className="mb-4 rounded-md border border-rule bg-panel p-4">
        <div className="mb-3 text-sm text-parchment">Profile</div>
        <form onSubmit={handleProfileSave}>
          {/* Banner */}
          <div className="mb-4">
            <div
              className="relative mb-2 h-24 w-full overflow-hidden rounded border border-rule bg-ink"
              style={user?.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!user?.bannerUrl && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">No banner</span>
              )}
              {bannerUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink/60 text-xs text-parchment">Uploading…</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={bannerUploading || bannerRemoving}
                className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment disabled:opacity-50"
              >
                {bannerUploading ? 'Uploading…' : 'Upload banner'}
              </button>
              {user?.bannerUrl && (
                <button
                  type="button"
                  onClick={handleBannerRemove}
                  disabled={bannerUploading || bannerRemoving}
                  className="rounded border border-rule px-3 py-1.5 text-xs hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                >
                  {bannerRemoving ? 'Removing…' : 'Remove'}
                </button>
              )}
              <span className="text-xs text-muted">JPEG, PNG, WebP or GIF, max 10 MB</span>
            </div>
            {bannerError && <p className="mt-1 text-xs text-red-400">{bannerError}</p>}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleBannerChange}
            />
          </div>

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
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={onOpenChangePassword}
            className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment"
          >
            Change password
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export my data'}
          </button>
        </div>
        {exportError && <p className="mb-3 text-xs text-red-400">{exportError}</p>}
        {user?.aiEnabled && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-parchment">AI features</div>
              <div className="text-xs text-muted">{aiOptOut ? 'Opted out — AI assistant and tools are disabled' : 'Enabled — opt out to disable AI features for your account'}</div>
            </div>
            <button
              type="button"
              onClick={handleAiToggle}
              disabled={aiToggleSaving}
              className={`ml-4 shrink-0 rounded border px-3 py-1.5 text-xs disabled:opacity-50 ${aiOptOut ? 'border-brass text-brass hover:border-rule hover:text-parchment' : 'border-rule hover:border-brass hover:text-parchment'}`}
            >
              {aiToggleSaving ? '…' : aiOptOut ? 'Re-enable' : 'Opt out'}
            </button>
          </div>
        )}
      </div>

      {/* Reading */}
      <div className="rounded-md border border-rule bg-panel p-4">
        <div className="mb-1 text-sm text-parchment">Reading</div>
        <div className="mb-3 text-xs text-muted">
          Default modules pre-load into new panes so you go straight to your preferred sources.
        </div>
        {loadingModules ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Default Bible</span>
              {bibleModules.length === 0 ? (
                <p className="text-xs text-muted">No Bible modules installed.</p>
              ) : (
                <select
                  value={defaultBibleModule}
                  onChange={(e) => onSetDefaultBibleModule(e.target.value)}
                  className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
                >
                  <option value="">No default set</option>
                  {bibleModules.map((m) => (
                    <option key={m.name} value={m.name}>{m.description || m.name}</option>
                  ))}
                </select>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Default Commentary</span>
              {commentaryModules.length === 0 ? (
                <p className="text-xs text-muted">No commentary modules installed.</p>
              ) : (
                <select
                  value={defaultCommentaryModule}
                  onChange={(e) => onSetDefaultCommentaryModule(e.target.value)}
                  className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
                >
                  <option value="">No default set</option>
                  {commentaryModules.map((m) => (
                    <option key={m.name} value={m.name}>{m.description || m.name}</option>
                  ))}
                </select>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Default Dictionary</span>
              {dictModules.length === 0 ? (
                <p className="text-xs text-muted">No dictionary modules installed.</p>
              ) : (
                <select
                  value={defaultDictionaryModule}
                  onChange={(e) => onSetDefaultDictionaryModule(e.target.value)}
                  className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
                >
                  <option value="">No default set</option>
                  {dictModules.map((m) => (
                    <option key={m.name} value={m.name}>{m.description || m.name}</option>
                  ))}
                </select>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="mt-4 rounded-md border border-red-900/50 bg-panel p-4">
        <div className="mb-1 text-sm text-red-400">Danger Zone</div>
        {!showDeleteForm ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Permanently delete your account and all your data.</p>
            <button
              onClick={() => setShowDeleteForm(true)}
              className="ml-4 shrink-0 rounded border border-red-900/50 px-3 py-1.5 text-xs text-red-400 hover:border-red-400"
            >
              Delete account
            </button>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount}>
            <p className="mb-3 text-xs text-muted">
              This will permanently delete your account, notes, highlights, bookmarks, and all other data. This cannot be undone. Enter your password to confirm.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              autoFocus
              autoComplete="current-password"
              className="mb-3 w-full rounded border border-red-900/50 bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-red-400 focus:outline-none"
            />
            {deleteError && <p className="mb-2 text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleting || !deletePassword}
                className="rounded border border-red-900/50 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Permanently delete my account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteForm(false); setDeletePassword(''); setDeleteError(null); }}
                className="rounded border border-rule px-3 py-1.5 text-xs hover:text-parchment"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

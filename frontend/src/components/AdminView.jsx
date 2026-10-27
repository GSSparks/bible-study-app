import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const TABS = ['Users', 'Modules', 'Posts', 'Media', 'Metrics', 'Branding', 'Codex'];
const MODULE_TYPES = ['BIBLE', 'COMMENTARY', 'DICT', 'BOOK'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso) {
  if (!iso) return 'never';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminView() {
  const [tab, setTab] = useState('Users');

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-4 font-display text-2xl text-parchment">Admin</h2>
        <div className="mb-6 flex border-b border-rule">
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
        {tab === 'Users' && <UsersTab />}
        {tab === 'Modules' && <ModulesTab />}
        {tab === 'Posts' && <PostsTab />}
        {tab === 'Media' && <MediaTab />}
        {tab === 'Metrics' && <MetricsTab />}
        {tab === 'Branding' && <BrandingTab />}
        {tab === 'Codex' && <CodexTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);
  const [updating, setUpdating] = useState(new Set()); // "${userId}:field"
  const [confirmDelete, setConfirmDelete] = useState(null); // userId

  function refresh() {
    setLoading(true);
    Promise.all([api.listUsers(), api.me()])
      .then(([userList, me]) => {
        setUsers(userList);
        setCurrentUserId(me.user?.id ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (password.length < 10) {
      setFormError('Password must be at least 10 characters.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await api.createUser({ username, password, role: newRole });
      setUsername('');
      setPassword('');
      setNewRole('user');
      setShowForm(false);
      refresh();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(userId, field, value) {
    const key = `${userId}:${field}`;
    setUpdating((prev) => new Set([...prev, key]));
    setError(null);
    try {
      const updated = await api.updateUser(userId, { [field]: value });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  }

  async function handleDelete(userId) {
    setConfirmDelete(null);
    setError(null);
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-muted">{users.length} account{users.length === 1 ? '' : 's'}</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass"
        >
          {showForm ? 'cancel' : '+ create user'}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 space-y-2 rounded-md border border-rule p-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (at least 10 characters)"
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded bg-verdigris/80 px-3 py-1.5 text-xs text-parchment hover:bg-verdigris disabled:opacity-50"
          >
            {creating ? 'creating…' : 'create'}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-md border border-rule">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">AI</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Last login</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className={`border-b border-rule last:border-0 ${u.suspended ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2 text-parchment">
                    {u.username}
                    {isSelf && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                  </td>

                  <td className="px-3 py-2">
                    <button
                      disabled={isSelf || updating.has(`${u.id}:role`)}
                      onClick={() => handleUpdate(u.id, 'role', u.role === 'admin' ? 'user' : 'admin')}
                      title={isSelf ? 'Cannot modify your own role' : u.role === 'admin' ? 'Admin — click to demote to user' : 'User — click to promote to admin'}
                      className={`rounded border px-2 py-0.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        u.role === 'admin'
                          ? 'border-brass text-brass hover:border-rule hover:text-muted'
                          : 'border-rule text-muted hover:border-brass hover:text-brass'
                      }`}
                    >
                      {updating.has(`${u.id}:role`) ? '…' : u.role}
                    </button>
                  </td>

                  <td className="px-3 py-2">
                    <button
                      disabled={isSelf || updating.has(`${u.id}:suspended`)}
                      onClick={() => handleUpdate(u.id, 'suspended', !u.suspended)}
                      title={isSelf ? 'Cannot suspend your own account' : u.suspended ? 'Suspended — click to reinstate' : 'Active — click to suspend'}
                      className={`rounded border px-2 py-0.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        u.suspended
                          ? 'border-red-500/60 text-red-400 hover:border-verdigris hover:text-verdigris'
                          : 'border-verdigris/60 text-verdigris hover:border-red-500/60 hover:text-red-400'
                      }`}
                    >
                      {updating.has(`${u.id}:suspended`) ? '…' : u.suspended ? 'suspended' : 'active'}
                    </button>
                  </td>

                  <td className="px-3 py-2">
                    <button
                      disabled={isSelf || updating.has(`${u.id}:aiEnabled`)}
                      onClick={() => handleUpdate(u.id, 'aiEnabled', !u.aiEnabled)}
                      title={isSelf ? 'Cannot modify your own AI access' : u.aiEnabled ? 'AI enabled — click to disable' : 'AI disabled — click to enable'}
                      className={`rounded border px-2 py-0.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        u.aiEnabled
                          ? 'border-verdigris/60 text-verdigris hover:border-rule hover:text-muted'
                          : 'border-rule text-muted hover:border-verdigris/60 hover:text-verdigris'
                      }`}
                    >
                      {updating.has(`${u.id}:aiEnabled`) ? '…' : u.aiEnabled ? 'on' : 'off'}
                    </button>
                  </td>

                  <td className="px-3 py-2 text-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-2 text-muted">{formatDate(u.lastLoginAt)}</td>

                  <td className="px-3 py-2 text-right">
                    {confirmDelete === u.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs text-muted">Delete?</span>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="rounded border border-red-500/60 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          yes
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="rounded border border-rule px-2 py-0.5 text-xs text-muted hover:text-parchment"
                        >
                          no
                        </button>
                      </span>
                    ) : (
                      <button
                        disabled={isSelf}
                        onClick={() => setConfirmDelete(u.id)}
                        title={isSelf ? 'Cannot delete your own account' : 'Delete user and all their data'}
                        className="rounded border border-rule px-2 py-0.5 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const langNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' });
  } catch {
    return null;
  }
})();

const LANG_OVERRIDES = {
  grc: 'Ancient Greek',
  hbo: 'Ancient Hebrew',
  ojp: 'Old Japanese',
  enm: 'Middle English',
  lat: 'Latin',
  cop: 'Coptic',
  syr: 'Syriac',
  arc: 'Aramaic',
  got: 'Gothic',
};

function langLabel(code) {
  if (!code) return code;
  if (LANG_OVERRIDES[code]) return LANG_OVERRIDES[code];
  try {
    const name = langNames?.of(code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
}

function ModulesTab() {
  const [type, setType] = useState('BIBLE');
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [available, setAvailable] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [installing, setInstalling] = useState(null);
  const [availableSearch, setAvailableSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [hideInstalled, setHideInstalled] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState(null);

  // listModuleVisibility already returns everything needed for the
  // "Installed" column — name, description, and availableToUsers — so
  // there's no separate listInstalledModules call here the way the
  // old standalone Module Manager needed; this merges what used to be
  // two different module screens into one.
  function refresh() {
    setLoading(true);
    setError(null);
    api
      .listModuleVisibility(type)
      .then(setInstalled)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.listRepositories().then(setRepos).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh();
    setAvailable([]);
    setAvailableSearch('');
    setLangFilter('');
    if (selectedRepo) {
      api.listAvailableModules(selectedRepo, type).then(setAvailable).catch((e) => setError(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (!selectedRepo) return;
    setAvailableSearch('');
    setLangFilter('');
    api.listAvailableModules(selectedRepo, type).then(setAvailable).catch((e) => setError(e.message));
  }, [selectedRepo, type]);

  async function handleInstall(moduleCode) {
    setInstalling(moduleCode);
    setError(null);
    try {
      await api.installModule(selectedRepo, moduleCode);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setInstalling(null);
    }
  }

  async function handleRemove(moduleCode) {
    if (!confirm(`Remove ${moduleCode}? This deletes the installed files — it would need to be reinstalled to use again.`)) {
      return;
    }
    setRemoving(moduleCode);
    setError(null);
    try {
      await api.removeModule(moduleCode);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setRemoving(null);
    }
  }

  async function handleToggle(moduleCode, current) {
    setToggling(moduleCode);
    try {
      await api.setModuleVisibility(moduleCode, !current);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setToggling(null);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploadNote(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/modules/upload', { method: 'POST', body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Upload failed');
      setUploadNote(body.note || 'Installed.');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {MODULE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded px-3 py-1.5 text-xs ${
              type === t ? 'bg-brass/90 text-ink' : 'border border-rule text-muted hover:border-brass hover:text-parchment'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="cursor-pointer rounded border border-dashed border-rule px-3 py-1.5 text-xs text-verdigris hover:border-verdigris hover:text-brass">
          {uploading ? 'uploading…' : '⇪ Upload a module .zip manually'}
          <input type="file" accept=".zip" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {uploadNote && <p className="text-xs text-muted">{uploadNote}</p>}
        {!uploadNote && <p className="text-xs text-muted">Accepts SWORD .zip, Markdown module .zip, or a .zip containing <code>module.json</code> + a <code>.xml</code> ThML file (CCEL format).</p>}
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-muted">Browse &amp; install</label>
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="mb-3 w-full rounded-md border border-rule bg-ink px-3 py-2 text-sm"
          >
            <option value="">Select a repository…</option>
            {repos.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {available.length > 0 && (() => {
            const langs = [...new Set(available.map((m) => m.language).filter(Boolean))].sort((a, b) => {
              if (a === 'en') return -1;
              if (b === 'en') return 1;
              return langLabel(a).localeCompare(langLabel(b));
            });
            return langs.length > 1 ? (
              <select
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value)}
                className="mb-2 w-full rounded-md border border-rule bg-ink px-3 py-1.5 text-sm text-parchment focus:border-brass focus:outline-none"
              >
                <option value="">All languages ({available.length})</option>
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {langLabel(l)} ({available.filter((m) => m.language === l).length})
                  </option>
                ))}
              </select>
            ) : null;
          })()}
          {available.length > 0 && (
            <input
              value={availableSearch}
              onChange={(e) => setAvailableSearch(e.target.value)}
              placeholder="Filter modules…"
              className="mb-2 w-full rounded-md border border-rule bg-ink px-3 py-1.5 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
            />
          )}
          {available.length > 0 && (
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-parchment">
              <input
                type="checkbox"
                checked={hideInstalled}
                onChange={(e) => setHideInstalled(e.target.checked)}
                className="accent-brass"
              />
              Hide already installed
            </label>
          )}
          <div className="max-h-96 overflow-y-auto overflow-x-hidden rounded-md border border-rule">
            {(() => {
              const installedNames = new Set(installed.map((m) => m.name));
              const q = availableSearch.toLowerCase();
              let shown = hideInstalled ? available.filter((m) => !installedNames.has(m.name)) : available;
              if (langFilter) shown = shown.filter((m) => m.language === langFilter);
              if (q) shown = shown.filter((m) => m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q));
              if (!selectedRepo) return <p className="p-3 text-sm text-muted">Pick a repository to browse what's available.</p>;
              if (available.length === 0) return <p className="p-3 text-sm text-muted">No modules of this type found in this repository.</p>;
              if (shown.length === 0 && hideInstalled && installedNames.size > 0 && !langFilter && !q) return <p className="p-3 text-sm text-muted">All available modules of this type are already installed.</p>;
              if (shown.length === 0) return <p className="p-3 text-sm text-muted">No matches{langFilter ? ` in ${langLabel(langFilter)}` : ''}{q ? ` for "${availableSearch}"` : ''}.</p>;
              return shown.map((m) => (
                <div key={m.name} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-parchment">{m.description || m.name}</div>
                    <div className="flex items-center gap-2 font-mono text-xs text-muted">
                      <span>{m.name}</span>
                      {m.language && <span className="rounded bg-ink px-1 py-px font-sans text-[10px] uppercase tracking-wide">{m.language}</span>}
                    </div>
                  </div>
                  <button
                    disabled={installing === m.name}
                    onClick={() => handleInstall(m.name)}
                    className="ml-2 shrink-0 rounded bg-verdigris/80 px-2 py-1 text-xs text-parchment hover:bg-verdigris disabled:opacity-50"
                  >
                    {installing === m.name ? 'installing…' : 'install'}
                  </button>
                </div>
              ));
            })()}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-muted">Installed</label>
          {loading && <p className="text-sm text-muted">Loading…</p>}
          {!loading && (
            <div className="overflow-hidden rounded-md border border-rule">
              {installed.map((m) => (
                <div key={m.name} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-parchment">{m.description || m.name}</div>
                    <div className="font-mono text-xs text-muted">{m.name}</div>
                  </div>
                  <div className="ml-2 flex shrink-0 gap-1">
                    {!m.isMd && (
                      <button
                        disabled={toggling === m.name}
                        onClick={() => handleToggle(m.name, m.availableToUsers)}
                        className={`rounded border px-2 py-1 text-xs disabled:opacity-50 ${
                          m.availableToUsers
                            ? 'border-verdigris text-verdigris hover:border-red-400 hover:text-red-400'
                            : 'border-rule text-muted hover:border-brass hover:text-brass'
                        }`}
                        title={m.availableToUsers ? 'Visible to users — click to hide' : 'Hidden from users — click to show'}
                      >
                        {toggling === m.name ? '…' : m.availableToUsers ? 'available' : 'hidden'}
                      </button>
                    )}
                    <button
                      disabled={removing === m.name}
                      onClick={() => handleRemove(m.name)}
                      className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                    >
                      {removing === m.name ? 'removing…' : 'remove'}
                    </button>
                  </div>
                </div>
              ))}
              {installed.length === 0 && <p className="p-3 text-sm text-muted">No modules installed of this type.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostsTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function refresh() {
    setLoading(true);
    api.listAdminPosts()
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  async function handleDelete(id) {
    if (!confirm('Delete this post and all its comments?')) return;
    setDeleting(id);
    try {
      await api.deleteAdminPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div>
      <p className="mb-4 text-xs text-muted">{posts.length} post{posts.length === 1 ? '' : 's'}</p>
      <div className="overflow-hidden rounded-md border border-rule">
        {posts.map((p) => (
          <div key={p.id} className="flex items-start gap-3 border-b border-rule px-4 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2 text-xs text-muted">
                <span className="text-parchment">{p.author.username}</span>
                <span>·</span>
                <span>{formatDate(p.createdAt)}</span>
                {p._count.comments > 0 && <span>· {p._count.comments} comment{p._count.comments === 1 ? '' : 's'}</span>}
                {Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0 && <span>· {p.mediaUrls.length} media</span>}
              </div>
              <p className="line-clamp-2 text-sm text-parchment/80">{p.body}</p>
            </div>
            <button
              disabled={deleting === p.id}
              onClick={() => handleDelete(p.id)}
              className="shrink-0 rounded border border-rule px-2 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
            >
              {deleting === p.id ? '…' : 'delete'}
            </button>
          </div>
        ))}
        {posts.length === 0 && <p className="p-4 text-sm text-muted">No posts yet.</p>}
      </div>
    </div>
  );
}

const MEDIA_TYPE_LABELS = {
  avatar: 'Avatar',
  userBanner: 'User banner',
  scriptoriumBanner: 'Scriptorium banner',
  postMedia: 'Post image',
};

function MediaTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);

  function refresh() {
    setLoading(true);
    api.listAdminMedia()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  async function handleRemove(item) {
    if (!confirm(`Remove this ${MEDIA_TYPE_LABELS[item.type]?.toLowerCase() ?? 'file'} for ${item.ownerName}?`)) return;
    const key = item.url;
    setRemoving(key);
    try {
      await api.deleteAdminMedia({ type: item.type, ownerId: item.ownerId, url: item.url });
      setItems((prev) => prev.filter((i) => !(i.url === item.url && i.ownerId === item.ownerId)));
    } catch (e) {
      setError(e.message);
    } finally {
      setRemoving(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div>
      <p className="mb-4 text-xs text-muted">{items.length} uploaded file{items.length === 1 ? '' : 's'}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={`${item.type}-${item.ownerId}-${item.url}`} className="overflow-hidden rounded-md border border-rule bg-panel">
            <div className="relative aspect-video bg-ink">
              <img
                src={item.url}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="p-2">
              <div className="truncate text-xs text-parchment">{item.ownerName}</div>
              <div className="text-xs text-muted">{MEDIA_TYPE_LABELS[item.type] ?? item.type}</div>
              <button
                disabled={removing === item.url}
                onClick={() => handleRemove(item)}
                className="mt-1.5 w-full rounded border border-rule px-2 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
              >
                {removing === item.url ? '…' : 'remove'}
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="col-span-full text-sm text-muted">No uploaded media yet.</p>}
      </div>
    </div>
  );
}

function MetricsTab() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAdminMetrics().then(setMetrics).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!metrics) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <MetricCard title="Database">
        <Stat label="Size" value={formatBytes(metrics.dbHealth.sizeBytes)} />
        <Stat label="Active connections" value={metrics.dbHealth.connections} />
      </MetricCard>

      <MetricCard title="Users">
        <Stat label="Total accounts" value={metrics.users.total} />
        <Stat label="Admins" value={metrics.users.admins} />
        <Stat label="Active (24h)" value={metrics.users.activeLast24h} />
        <Stat label="Active (7d)" value={metrics.users.activeLast7d} />
        <Stat label="Active (30d)" value={metrics.users.activeLast30d} />
      </MetricCard>

      <MetricCard title="Content">
        <Stat label="Notes" value={metrics.content.notes} />
        <Stat label="Highlights" value={metrics.content.highlights} />
        <Stat label="Bookmarks" value={metrics.content.bookmarks} />
        <Stat label="Personal modules" value={metrics.content.personalModules} />
      </MetricCard>
    </div>
  );
}

function BrandingTab() {
  const [name, setName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .getBrandingSettings()
      .then((b) => { setName(b.name); setSiteUrl(b.siteUrl || ''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.saveBrandingSettings({ name, siteUrl });
      if (updated.name !== undefined) setName(updated.name);
      if (updated.siteUrl !== undefined) setSiteUrl(updated.siteUrl || '');
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="max-w-md">
      <form onSubmit={handleSave} className="space-y-3 rounded-md border border-rule p-4">
        <div>
          <label htmlFor="brand-name" className="mb-1 block text-xs uppercase tracking-wide text-muted">
            App name
          </label>
          <input
            id="brand-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
          />
          <p className="mt-1 text-xs text-muted">Shown in the sidebar for every visitor, including anonymous ones.</p>
        </div>

        <div>
          <label htmlFor="site-url" className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Site URL
          </label>
          <input
            id="site-url"
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://myscriptorium.net"
            maxLength={255}
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
          />
          <p className="mt-1 text-xs text-muted">
            The public URL of this instance. Used to restrict cross-origin requests — leave blank to allow all origins (not
            recommended for production).
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-verdigris">Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
        >
          {saving ? 'saving…' : 'save'}
        </button>
      </form>

      <p className="mt-4 text-xs text-muted">
        Logo upload isn't built yet — that needs its own file-storage setup, so it's a separate follow-up rather than part
        of this round.
      </p>
    </div>
  );
}

function MetricCard({ title, children }) {
  return (
    <div className="rounded-md border border-rule bg-panel p-4">
      <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-display text-lg text-parchment">{value}</span>
    </div>
  );
}

function CodexTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  function refresh() {
    setLoading(true);
    api.listCodexCache()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await api.exportCodexModule();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'codex-ai-summaries.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await api.deleteCodexEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm text-parchment">AI Overview Cache</h3>
          <p className="mt-0.5 text-xs text-muted">
            Summaries are generated by AI on first lookup and cached here. Export as a Markdown module to use as a custom DICT resource.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || entries.length === 0}
          className="rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-40"
        >
          {exporting ? 'Exporting…' : 'Download Module (.zip)'}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">No overviews cached yet. Search topics in Codex to generate them.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-xs uppercase tracking-wide text-muted">
              <th className="pb-2 pr-4">Topic</th>
              <th className="pb-2 pr-4">Query</th>
              <th className="pb-2 pr-4">Generated</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-rule/40">
                <td className="py-2 pr-4 text-parchment">{entry.title}</td>
                <td className="py-2 pr-4 font-mono text-xs text-muted">{entry.query}</td>
                <td className="py-2 pr-4 text-muted">{formatDate(entry.createdAt)}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    className="rounded px-2 py-0.5 text-xs text-muted hover:text-red-400 disabled:opacity-40"
                    title="Delete from cache (will regenerate next time it's viewed)"
                  >
                    {deletingId === entry.id ? '…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const TABS = ['Users', 'Modules', 'Metrics', 'Branding'];
const MODULE_TYPES = ['BIBLE', 'COMMENTARY', 'DICT'];

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
    <div className="flex h-full flex-col p-6">
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
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'Users' && <UsersTab />}
        {tab === 'Modules' && <ModulesTab />}
        {tab === 'Metrics' && <MetricsTab />}
        {tab === 'Branding' && <BrandingTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  function refresh() {
    setLoading(true);
    api
      .listUsers()
      .then(setUsers)
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
      await api.createUser({ username, password, role });
      setUsername('');
      setPassword('');
      setRole('user');
      setShowForm(false);
      refresh();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

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
            value={role}
            onChange={(e) => setRole(e.target.value)}
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
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Last login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-rule last:border-0">
                <td className="px-3 py-2 text-parchment">{u.username}</td>
                <td className="px-3 py-2 text-muted">{u.role}</td>
                <td className="px-3 py-2 text-muted">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-2 text-muted">{formatDate(u.lastLoginAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModulesTab() {
  const [type, setType] = useState('BIBLE');
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(null);

  function refresh() {
    setLoading(true);
    setError(null);
    api
      .listModuleVisibility(type)
      .then(setModules)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [type]);

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

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-md border border-rule">
          {modules.map((m) => (
            <div key={m.name} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm last:border-0">
              <div>
                <div className="text-parchment">{m.description || m.name}</div>
                <div className="font-mono text-xs text-muted">{m.name}</div>
              </div>
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
            </div>
          ))}
          {modules.length === 0 && <p className="p-3 text-sm text-muted">No modules installed of this type.</p>}
        </div>
      )}
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .getBranding()
      .then((b) => setName(b.name))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.setBranding(name);
      setName(updated.name);
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
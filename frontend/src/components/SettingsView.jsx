import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

/** Hosts change-password (moved here from the UserMenu dropdown,
 * matching the mockup's dedicated Settings nav item rather than a
 * dropdown entry) and reading preferences — a natural place for
 * account-level and personal preferences as more get added later.
 * Default Bible used to be set from Passages' own Module Manager
 * modal; moved here since it's a personal reading preference, not an
 * admin task, and this is where personal preferences belong. */
export default function SettingsView({ username, onOpenChangePassword, defaultBibleModule, onSetDefaultBibleModule }) {
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
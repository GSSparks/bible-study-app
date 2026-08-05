import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

/** Lets you pick the active Bible translation directly from the header.
 * Fetches installed Bible modules itself and re-fetches when `refreshKey`
 * changes (bump it after installing/removing a module in the manager). */
export default function ModuleSwitcher({ module, onChange, refreshKey }) {
  const [installed, setInstalled] = useState([]);

  useEffect(() => {
    api.listInstalledModules('BIBLE').then(setInstalled).catch(() => {});
  }, [refreshKey]);

  if (installed.length === 0) {
    return <span className="font-mono text-xs text-muted">no Bible module installed</span>;
  }

  return (
    <select
      value={module}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-rule bg-panel px-2 py-1.5 font-mono text-xs text-parchment hover:border-brass focus:border-brass"
      title="Switch Bible translation"
    >
      {!module && <option value="">select a version…</option>}
      {installed.map((m) => (
        <option key={m.name} value={m.name}>
          {m.description || m.name}
        </option>
      ))}
    </select>
  );
}

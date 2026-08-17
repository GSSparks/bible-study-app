import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const MODULE_TYPES = [
  { value: 'BIBLE', label: 'Bibles', kind: 'bible' },
  { value: 'COMMENTARY', label: 'Commentaries', kind: 'commentary' },
  { value: 'DICT', label: 'Dictionaries & help books', kind: 'dictionary' },
];

export default function ModuleManager({ onClose, onOpenModule, onModulesChanged, defaultBibleModule, onSetDefaultBible }) {
  const [moduleType, setModuleType] = useState('BIBLE');
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [available, setAvailable] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [installing, setInstalling] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState(null);

  const activeType = MODULE_TYPES.find((t) => t.value === moduleType);

  useEffect(() => {
    api.listRepositories().then(setRepos).catch((e) => setError(e.message));
  }, []);

  function refreshInstalled() {
    api
      .listInstalledModules(moduleType)
      .then(setInstalled)
      .catch((e) => setError(e.message));
  }

  // Re-fetch both lists whenever the type tab changes
  useEffect(() => {
    refreshInstalled();
    setAvailable([]);
    if (selectedRepo) {
      api.listAvailableModules(selectedRepo, moduleType).then(setAvailable).catch((e) => setError(e.message));
    }
  }, [moduleType]);

  useEffect(() => {
    if (!selectedRepo) return;
    api.listAvailableModules(selectedRepo, moduleType).then(setAvailable).catch((e) => setError(e.message));
  }, [selectedRepo]);

  async function handleInstall(moduleCode) {
    setInstalling(moduleCode);
    setError(null);
    try {
      await api.installModule(selectedRepo, moduleCode);
      refreshInstalled();
      onModulesChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setInstalling(null);
    }
  }

  async function handleRemove(moduleCode) {
    setRemoving(moduleCode);
    setError(null);
    try {
      await api.removeModule(moduleCode);
      refreshInstalled();
      onModulesChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setRemoving(null);
    }
  }

  function handleOpen(m) {
    onOpenModule?.({ kind: activeType.kind, module: m.name, title: m.description || m.name });
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
      refreshInstalled();
      onModulesChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-6">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg border border-rule bg-panel">
        <div className="flex items-center justify-between border-b border-rule px-6 py-4">
          <h2 className="font-display text-xl">Module manager</h2>
          <button onClick={onClose} className="text-muted hover:text-parchment">
            close
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-rule px-6 py-2">
          <label className="cursor-pointer rounded border border-dashed border-rule px-3 py-1.5 text-xs text-verdigris hover:border-verdigris hover:text-brass">
            {uploading ? 'uploading…' : '⇪ Upload a module .zip manually'}
            <input type="file" accept=".zip" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadNote && <p className="text-xs text-muted">{uploadNote}</p>}
        </div>

        <div className="flex border-b border-rule px-6">
          {MODULE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setModuleType(t.value)}
              className={`px-3 py-2 text-xs uppercase tracking-wide ${
                moduleType === t.value ? 'border-b-2 border-brass text-parchment' : 'text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="px-6 pt-3 text-sm text-red-400">{error}</p>}

        <div className="grid flex-1 grid-cols-2 gap-4 overflow-hidden p-6">
          <div className="flex flex-col overflow-hidden">
            <label className="mb-2 text-xs uppercase tracking-wide text-muted">Repository</label>
            <select
              className="mb-3 rounded-md border border-rule bg-ink px-3 py-2 text-sm"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
            >
              <option value="">Select a repository…</option>
              {repos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="flex-1 overflow-y-auto rounded-md border border-rule">
              {available.map((m) => (
                <div key={m.name} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm">
                  <div>
                    <div className="text-parchment">{m.description || m.name}</div>
                    <div className="font-mono text-xs text-muted">{m.name}</div>
                  </div>
                  <button
                    disabled={installing === m.name}
                    onClick={() => handleInstall(m.name)}
                    className="rounded bg-verdigris/80 px-2 py-1 text-xs text-parchment hover:bg-verdigris disabled:opacity-50"
                  >
                    {installing === m.name ? 'installing…' : 'install'}
                  </button>
                </div>
              ))}
              {selectedRepo && available.length === 0 && (
                <p className="p-3 text-sm text-muted">No {activeType.label.toLowerCase()} found in this repository.</p>
              )}
              {!selectedRepo && (
                <p className="p-3 text-sm text-muted">Pick a repository to browse what's available.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden">
            <label className="mb-2 text-xs uppercase tracking-wide text-muted">Installed</label>
            <div className="flex-1 overflow-y-auto rounded-md border border-rule">
              {installed.map((m) => (
                <div key={m.name} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{m.description || m.name}</div>
                    <div className="font-mono text-xs text-muted">{m.name}</div>
                  </div>
                  <div className="ml-2 flex shrink-0 gap-1">
                    {moduleType === 'BIBLE' && (
                      <button
                        onClick={() => onSetDefaultBible?.(m.name)}
                        className={`rounded border px-2 py-1 text-xs ${
                          defaultBibleModule === m.name
                            ? 'border-brass text-brass'
                            : 'border-rule text-muted hover:border-brass hover:text-brass'
                        }`}
                        title={defaultBibleModule === m.name ? 'Default Bible' : 'Set as default Bible'}
                      >
                        {defaultBibleModule === m.name ? '★' : '☆'}
                      </button>
                    )}
                    <button
                      onClick={() => handleOpen(m)}
                      className="rounded bg-verdigris/80 px-2 py-1 text-xs text-parchment hover:bg-verdigris"
                      title={`Open in a new ${activeType.kind} pane`}
                    >
                      open
                    </button>
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
              {installed.length === 0 && (
                <p className="p-3 text-sm text-muted">No {activeType.label.toLowerCase()} installed yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
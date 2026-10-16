import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { api } from '../api/client.js';
import RichEditor from './RichEditor.jsx';
import { getAvatarColor } from '../utils/avatar.js';

export default function ScriptoriumStudiesTab({ scriptoriumId, isMember, onOpenStudy, onOpenBuilder }) {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  function refresh() {
    setLoading(true);
    api
      .listScriptoriumStudies(scriptoriumId)
      .then(setStudies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [scriptoriumId]);

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const created = await api.importStudy(scriptoriumId, data);
      refresh();
      onOpenStudy(created.id);
    } catch (err) {
      setError(err.message || 'Failed to import study.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      {isMember && (
        <div className="mb-4 flex items-center justify-end gap-2">
          <label className={`flex cursor-pointer items-center gap-1.5 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={12} />
            {importing ? 'importing…' : 'import'}
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </label>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass"
          >
            + new study
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {studies.map((s) => {
          const bannerColor = getAvatarColor(s.title);
          return (
            <div
              key={s.id}
              className="group overflow-hidden rounded-xl border border-rule bg-panel transition-colors hover:border-brass/50"
            >
              <button onClick={() => onOpenStudy(s.id)} className="relative block h-24 w-full overflow-hidden bg-ink">
                {s.bannerUrl ? (
                  <img src={s.bannerUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <>
                    <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 25% 65%, ${bannerColor}66 0%, transparent 65%)` }} />
                    <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 25%, ${bannerColor}33 0%, transparent 60%)` }} />
                    <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 110%, #0D1B2966 0%, transparent 50%)` }} />
                  </>
                )}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-panel to-transparent" />
              </button>
              <button onClick={() => onOpenStudy(s.id)} className="block w-full px-4 pb-3 pt-2 text-left">
                <div className="font-display text-base leading-snug text-parchment transition-colors group-hover:text-brass">
                  {s.title}
                </div>
                {s.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{s.description}</p>
                ) : (
                  <p className="mt-1 text-xs italic text-muted/40">No description</p>
                )}
              </button>
            </div>
          );
        })}
        {!loading && studies.length === 0 && (
          <p className="text-sm text-muted">No studies in this Scriptorium yet.</p>
        )}
      </div>

      {showCreateModal && (
        <CreateStudyModal
          scriptoriumId={scriptoriumId}
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            refresh();
            onOpenBuilder ? onOpenBuilder(id) : onOpenStudy(id);
          }}
        />
      )}
    </div>
  );
}

function CreateStudyModal({ scriptoriumId, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createStudy({ title, description, scriptoriumId });
      onCreated(created.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">New Study</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Description (optional)</label>
            <RichEditor value={description} onChange={setDescription} height={160} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {submitting ? 'creating…' : 'create'}
          </button>
        </form>
      </div>
    </div>
  );
}

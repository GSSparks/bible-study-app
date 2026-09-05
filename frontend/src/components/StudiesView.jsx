import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StudyDetail from './StudyDetail.jsx';

export default function StudiesView({ currentUserId }) {
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  function openDetail(id) {
    setSelectedId(id);
    setView('detail');
  }

  function backToList() {
    setView('list');
    setSelectedId(null);
    bump(); // in case membership/lessons changed while in detail
  }

  if (view === 'detail' && selectedId) {
    return <StudyDetail studyId={selectedId} currentUserId={currentUserId} onBack={backToList} />;
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl text-parchment">Studies</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass"
        >
          + create a study
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <MyStudiesList onOpen={openDetail} refreshKey={refreshKey} />
      </div>

      {showCreateModal && (
        <CreateStudyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            bump();
            openDetail(id);
          }}
        />
      )}
    </div>
  );
}

function MyStudiesList({ onOpen, refreshKey }) {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .listMyStudies()
      .then(setStudies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {studies.map((s) => (
        <button key={s.id} onClick={() => onOpen(s.id)} className="rounded-md border border-rule bg-panel p-4 text-left hover:border-brass">
          <div className="mb-1 font-display text-base text-parchment">{s.title}</div>
          <div className="text-xs text-muted">
            {s.scriptoriumId ? 'group study' : 'solo study'} · {s.myRole}
          </div>
        </button>
      ))}
      {studies.length === 0 && <p className="text-sm text-muted">You're not part of any Studies yet.</p>}
    </div>
  );
}

function CreateStudyModal({ onClose, onCreated, defaultScriptoriumId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState(defaultScriptoriumId ? 'group' : 'solo');
  const [scriptoriumId, setScriptoriumId] = useState(defaultScriptoriumId || '');
  const [myScriptoriums, setMyScriptoriums] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .listMyScriptoriums()
      .then(setMyScriptoriums)
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createStudy({ title, description, scriptoriumId: kind === 'group' ? scriptoriumId : null });
      onCreated(created.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Create a Study</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
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
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKind('solo')}
                className={`flex-1 rounded border px-3 py-2 text-xs ${kind === 'solo' ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted'}`}
              >
                Solo — just for me
              </button>
              <button
                type="button"
                onClick={() => setKind('group')}
                className={`flex-1 rounded border px-3 py-2 text-xs ${kind === 'group' ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted'}`}
              >
                Group — with a Scriptorium
              </button>
            </div>
          </div>
          {kind === 'group' && (
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Scriptorium</label>
              <select
                value={scriptoriumId}
                onChange={(e) => setScriptoriumId(e.target.value)}
                className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
              >
                <option value="">Select a Scriptorium…</option>
                {myScriptoriums.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {myScriptoriums.length === 0 && <p className="mt-1 text-xs text-muted">You're not in any Scriptoriums yet.</p>}
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || (kind === 'group' && !scriptoriumId)}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {submitting ? 'creating…' : 'create'}
          </button>
        </form>
      </div>
    </div>
  );
}

export { CreateStudyModal };
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StudyDetail from './StudyDetail.jsx';

export default function StudiesView({ currentUserId, onOpenInPassages, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, pendingStudyOpen, onStudyOpenConsumed, pendingStudyList, onStudyListConsumed }) {
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  function openDetail(id) {
    setSelectedId(id);
    setView('detail');
  }

  useEffect(() => {
    if (!pendingStudyOpen) return;
    openDetail(pendingStudyOpen.id);
    onStudyOpenConsumed?.();
  }, [pendingStudyOpen?.nonce]);

  useEffect(() => {
    if (!pendingStudyList) return;
    backToList();
    onStudyListConsumed?.();
  }, [pendingStudyList?.nonce]);

  function backToList() {
    setView('list');
    setSelectedId(null);
    bump(); // in case membership/lessons changed while in detail
  }

  if (view === 'detail' && selectedId) {
    return (
      <StudyDetail
        studyId={selectedId}
        currentUserId={currentUserId}
        onBack={backToList}
        onOpenInPassages={onOpenInPassages}
        onAskAiCompanionAbout={onAskAiCompanionAbout}
        onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-parchment">Studies</h2>
            <p className="text-xs text-muted">Your Studies, across every Scriptorium, plus any solo Studies of your own.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass"
          >
            + start a solo study
          </button>
        </div>

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
        <button key={s.id} onClick={() => onOpen(s.id)} className="rounded-lg border border-rule bg-panel p-5 text-left transition-colors hover:border-brass/60">
          <div className="mb-1.5 font-display text-lg text-parchment">{s.title}</div>
          <div className="text-xs uppercase tracking-wide text-muted">
            {s.scriptoriumId ? 'group study' : 'solo study'} · {s.myRole}
          </div>
        </button>
      ))}
      {studies.length === 0 && (
        <p className="text-sm text-muted">
          You're not part of any Studies yet — open a Scriptorium to join a group Study, or start a solo one above.
        </p>
      )}
    </div>
  );
}

function CreateStudyModal({ onClose, onCreated, defaultScriptoriumId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [myScriptoriums, setMyScriptoriums] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Only ever fetched to resolve defaultScriptoriumId to a display
  // name for the read-only "Creating in:" label below — there's no
  // dropdown anymore, since a group Study is only ever created FROM
  // its Scriptorium (defaultScriptoriumId always set in that case),
  // never picked from a list here.
  useEffect(() => {
    if (!defaultScriptoriumId) return;
    api
      .listMyScriptoriums()
      .then(setMyScriptoriums)
      .catch(() => {});
  }, [defaultScriptoriumId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createStudy({ title, description, scriptoriumId: defaultScriptoriumId || null });
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
          {defaultScriptoriumId && (
            <p className="text-xs text-muted">
              Creating in: <span className="text-parchment">{myScriptoriums.find((s) => s.id === defaultScriptoriumId)?.name || '…'}</span>
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
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
import { useEffect, useState } from 'react';
import StudyAssistant from './StudyAssistant.jsx';
import { api } from '../api/client.js';

/** Shared by "Ask a Question" and "Study a Passage" — both need a
 * Bible + reference; only "Ask a Question" also needs the actual
 * question text. */
function ReferenceModal({ title, needsQuestion, submitLabel, onSubmit, onClose }) {
  const [modules, setModules] = useState([]);
  const [module, setModule] = useState('');
  const [reference, setReference] = useState('');
  const [question, setQuestion] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listInstalledModules('BIBLE')
      .then((mods) => {
        setModules(mods);
        if (mods.length > 0) setModule(mods[0].name);
      })
      .catch((e) => setError(e.message));
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!module || !reference.trim()) {
      setError('Pick a Bible and enter a reference.');
      return;
    }
    if (needsQuestion && !question.trim()) {
      setError('Type a question.');
      return;
    }
    onSubmit({ module, reference: reference.trim(), question: question.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">{title}</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Bible</label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment"
            >
              {modules.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.description || m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. John 3:16"
              autoFocus
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>
          {needsQuestion && (
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Your question</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="What do you want to ask about this passage?"
                className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass">
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Doesn't touch StudyAssistant/the LLM at all — POST /bible/compare
 * already returns raw passage text per module, so this is purely a
 * display concern. */
function CompareModal({ onClose }) {
  const [modules, setModules] = useState([]);
  const [selected, setSelected] = useState([]);
  const [reference, setReference] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listInstalledModules('BIBLE').then(setModules).catch((e) => setError(e.message));
  }, []);

  function toggleModule(name) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]));
  }

  async function handleCompare(e) {
    e.preventDefault();
    if (selected.length < 2 || !reference.trim()) {
      setError('Pick at least two Bibles and enter a reference.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.comparePassage(selected, reference.trim());
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Compare translations</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>

        <form onSubmit={handleCompare} className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. John 3:16"
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Bibles (pick at least two)</label>
            <div className="flex flex-wrap gap-2">
              {modules.map((m) => (
                <button
                  type="button"
                  key={m.name}
                  onClick={() => toggleModule(m.name)}
                  className={`rounded border px-2 py-1 text-xs ${
                    selected.includes(m.name)
                      ? 'border-brass bg-brass/20 text-brass'
                      : 'border-rule text-muted hover:border-brass hover:text-parchment'
                  }`}
                >
                  {m.description || m.name}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-brass/90 px-3 py-1.5 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {loading ? 'comparing…' : 'compare'}
          </button>
        </form>

        {result && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-rule pt-4">
            {Object.entries(result.passages).map(([mod, verses]) => (
              <div key={mod}>
                <h3 className="mb-1 text-xs uppercase tracking-wide text-brass">{mod}</h3>
                <div className="markdown-body text-sm text-parchment/90">
                  {verses.map((v, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: v.content }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({ label, description, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`block w-full rounded-md border px-3 py-2 text-left ${
        disabled ? 'cursor-default border-rule opacity-50' : 'border-rule hover:border-brass'
      }`}
    >
      <div className="text-sm text-parchment">{label}</div>
      <div className="text-xs text-muted">{description}</div>
    </button>
  );
}

export default function AICompanionView({ isLoggedIn }) {
  const [askQuestionRequest, setAskQuestionRequest] = useState(null);
  const [overviewRequest, setOverviewRequest] = useState(null);
  const [resumeSessionRequest, setResumeSessionRequest] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'ask' | 'study' | 'compare' | null
  const [recentSessions, setRecentSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  function refreshSessions() {
    if (!isLoggedIn) return;
    setLoadingSessions(true);
    api
      .listRecentSessions()
      .then(setRecentSessions)
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }

  useEffect(refreshSessions, [isLoggedIn]);

  function handleStudyPassage({ module, reference }) {
    setActiveModal(null);
    setOverviewRequest({ module, reference, nonce: Date.now() });
  }

  function handleAskQuestion({ module, reference, question }) {
    setActiveModal(null);
    setAskQuestionRequest({ module, reference, question, nonce: Date.now() });
  }

  function handleResume(session) {
    setResumeSessionRequest({ session, nonce: Date.now() });
  }

  if (!isLoggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="mb-2 font-display text-lg text-parchment">AI Companion</p>
        <p className="text-sm text-muted">Log in to use the study assistant.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="min-h-0 flex-1 border-r border-rule">
        <StudyAssistant
          sources={[]}
          overviewRequest={overviewRequest}
          wordStudyRequest={null}
          phraseStudyRequest={null}
          askQuestionRequest={askQuestionRequest}
          resumeSessionRequest={resumeSessionRequest}
          isLoggedIn={isLoggedIn}
          onSessionSaved={refreshSessions}
        />
      </div>

      <aside className="w-72 shrink-0 overflow-y-auto p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">Tools</h3>
        <div className="mb-6 space-y-2">
          <ToolButton label="Ask a Question" description="Get answers from Scripture" onClick={() => setActiveModal('ask')} />
          <ToolButton label="Study a Passage" description="Explore context and commentary" onClick={() => setActiveModal('study')} />
          <ToolButton label="Topical Study" description="Coming soon" disabled />
          <ToolButton label="Compare Translations" description="See how translations differ" onClick={() => setActiveModal('compare')} />
        </div>

        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">Recent Conversations</h3>
        {loadingSessions && <p className="text-xs text-muted">Loading…</p>}
        <div className="space-y-1">
          {recentSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleResume(s)}
              className="block w-full truncate rounded px-2 py-1.5 text-left text-xs text-parchment/90 hover:bg-panel hover:text-brass"
              title={s.reference || 'Chat'}
            >
              {s.reference || 'Chat'}
            </button>
          ))}
          {!loadingSessions && recentSessions.length === 0 && <p className="text-xs text-muted">No conversations yet.</p>}
        </div>
      </aside>

      {activeModal === 'ask' && (
        <ReferenceModal title="Ask a Question" needsQuestion submitLabel="Ask" onSubmit={handleAskQuestion} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'study' && (
        <ReferenceModal title="Study a Passage" submitLabel="Study this passage" onSubmit={handleStudyPassage} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'compare' && <CompareModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}
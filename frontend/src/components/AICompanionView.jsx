import { useEffect, useState } from 'react';
import { Sparkles, MessageCircle, BookOpen, Tag, ArrowLeftRight, Send } from 'lucide-react';
import StudyAssistant from './StudyAssistant.jsx';
import { api } from '../api/client.js';

const EXAMPLES = [
  { q: 'What is the significance of John 3:16?', label: 'Explore a verse' },
  { q: 'What does the Sermon on the Mount teach about anger?', label: 'Study a teaching' },
  { q: 'Who were the Pharisees and why did they oppose Jesus?', label: 'Historical context' },
  { q: 'How does Psalm 23 apply to my daily life?', label: 'Personal application' },
];

function WelcomePanel({ username, onQuestion }) {
  const [input, setInput] = useState('');

  function submit(text) {
    const q = (text || input).trim();
    if (!q) return;
    onQuestion(q);
    setInput('');
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-12">
      <Sparkles size={36} className="mb-5 text-brass/80" />
      <h2 className="font-display text-3xl text-parchment">
        Hello{username ? `, ${username}` : ''}.
      </h2>
      <p className="mt-2 text-sm text-muted">What would you like to study today?</p>

      <div className="mt-10 grid w-full max-w-xl grid-cols-2 gap-3">
        {EXAMPLES.map(({ q, label }) => (
          <button
            key={q}
            onClick={() => submit(q)}
            className="rounded-xl border border-rule bg-panel px-4 py-4 text-left transition-colors hover:border-brass/50 hover:bg-panel/80"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brass/70">{label}</p>
            <p className="text-sm leading-snug text-parchment/90">{q}</p>
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="mt-8 flex w-full max-w-xl gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about Scripture…"
          className="flex-1 rounded-xl border border-rule bg-panel px-4 py-3 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex items-center gap-2 rounded-xl bg-brass/90 px-4 py-3 text-sm font-medium text-ink hover:bg-brass disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>
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
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
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
    if (!module || !reference.trim()) { setError('Pick a Bible and enter a reference.'); return; }
    if (needsQuestion && !question.trim()) { setError('Type a question.'); return; }
    onSubmit({ module, reference: reference.trim(), question: question.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">{title}</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
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
                <option key={m.name} value={m.name}>{m.description || m.name}</option>
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

function ToolButton({ icon: Icon, label, description, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
        disabled
          ? 'cursor-default border-rule opacity-40'
          : 'border-rule hover:border-brass/60 hover:bg-panel'
      }`}
    >
      {Icon && (
        <span className={`mt-0.5 shrink-0 ${disabled ? 'text-muted' : 'text-brass/70'}`}>
          <Icon size={15} strokeWidth={1.8} />
        </span>
      )}
      <div>
        <div className="text-sm text-parchment">{label}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
    </button>
  );
}

export default function AICompanionView({
  isLoggedIn,
  username,
  pendingOverviewRequest,
  onOverviewRequestConsumed,
  pendingPhraseStudyRequest,
  onPhraseStudyRequestConsumed,
}) {
  const [askQuestionRequest, setAskQuestionRequest] = useState(null);
  const [overviewRequest, setOverviewRequest] = useState(null);
  const [phraseStudyRequest, setPhraseStudyRequest] = useState(null);
  const [resumeSessionRequest, setResumeSessionRequest] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  // 'welcome' → show the greeting/example boxes; 'chat' → show StudyAssistant
  const [mode, setMode] = useState('welcome');

  function refreshSessions() {
    if (!isLoggedIn) return;
    setLoadingSessions(true);
    api.listRecentSessions().then(setRecentSessions).catch(() => {}).finally(() => setLoadingSessions(false));
  }

  useEffect(refreshSessions, [isLoggedIn]);

  function startFreeQuestion(question) {
    setAskQuestionRequest({ module: '', reference: '', question, nonce: Date.now() });
    setMode('chat');
  }

  function handleStudyPassage({ module, reference }) {
    setActiveModal(null);
    setOverviewRequest({ module, reference, nonce: Date.now() });
    setMode('chat');
  }

  function handleAskQuestion({ module, reference, question }) {
    setActiveModal(null);
    setAskQuestionRequest({ module, reference, question, nonce: Date.now() });
    setMode('chat');
  }

  function handleResume(session) {
    setResumeSessionRequest({ session, nonce: Date.now() });
    setMode('chat');
  }

  useEffect(() => {
    if (!pendingOverviewRequest) return;
    handleStudyPassage({ module: pendingOverviewRequest.module, reference: pendingOverviewRequest.reference });
    onOverviewRequestConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOverviewRequest?.nonce]);

  useEffect(() => {
    if (!pendingPhraseStudyRequest) return;
    setActiveModal(null);
    setPhraseStudyRequest({
      phrase: pendingPhraseStudyRequest.phrase,
      module: pendingPhraseStudyRequest.module,
      strongsSequence: pendingPhraseStudyRequest.strongsSequence,
      nonce: Date.now(),
    });
    setMode('chat');
    onPhraseStudyRequestConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPhraseStudyRequest?.nonce]);

  if (!isLoggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Sparkles size={28} className="mb-3 text-brass/60" />
        <p className="mb-2 font-display text-lg text-parchment">AI Companion</p>
        <p className="text-sm text-muted">Log in to use the study assistant.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 justify-center overflow-hidden">
      <div className="flex h-full w-full max-w-5xl min-h-0">

        {/* ── Main chat area ───────────────────────────────── */}
        <div className="relative min-h-0 flex-1">
          {/* StudyAssistant stays mounted to preserve tab/conversation state */}
          <div className={mode === 'chat' ? 'h-full' : 'hidden'}>
            <StudyAssistant
              sources={[]}
              overviewRequest={overviewRequest}
              wordStudyRequest={null}
              phraseStudyRequest={phraseStudyRequest}
              askQuestionRequest={askQuestionRequest}
              resumeSessionRequest={resumeSessionRequest}
              isLoggedIn={isLoggedIn}
              onSessionSaved={refreshSessions}
            />
          </div>
          {mode === 'welcome' && (
            <WelcomePanel username={username} onQuestion={startFreeQuestion} />
          )}
        </div>

        {/* ── Right sidebar ────────────────────────────────── */}
        <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-rule">
          <div className="p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Tools</p>
            <div className="space-y-2">
              <ToolButton icon={MessageCircle} label="Ask a Question" description="With a specific passage" onClick={() => setActiveModal('ask')} />
              <ToolButton icon={BookOpen} label="Study a Passage" description="Context and commentary" onClick={() => setActiveModal('study')} />
              <ToolButton icon={Tag} label="Topical Study" description="Coming soon" disabled />
              <ToolButton icon={ArrowLeftRight} label="Compare Translations" description="See how versions differ" onClick={() => setActiveModal('compare')} />
            </div>

            {mode === 'chat' && (
              <button
                onClick={() => setMode('welcome')}
                className="mt-4 w-full rounded-lg border border-rule px-3 py-2 text-xs text-muted hover:border-brass hover:text-parchment"
              >
                + New conversation
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto border-t border-rule p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Recent</p>
            {loadingSessions && <p className="text-xs text-muted">Loading…</p>}
            <div className="space-y-1">
              {recentSessions.map((s) => {
                const label = s.title || s.reference || 'Chat';
                return (
                  <button
                    key={s.id}
                    onClick={() => handleResume(s)}
                    className="block w-full rounded px-2 py-1.5 text-left text-xs text-parchment/90 hover:bg-panel hover:text-brass"
                    title={label}
                  >
                    <span className="line-clamp-2 leading-snug">{label}</span>
                  </button>
                );
              })}
              {!loadingSessions && recentSessions.length === 0 && (
                <p className="text-xs text-muted">No conversations yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

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

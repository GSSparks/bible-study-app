import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';

let nextConvId = 1;
const uid = () => `conv-${nextConvId++}`;

function makeConversation(kind, title, meta = {}) {
  return {
    id: uid(),
    kind, // 'chat' | 'overview' | 'wordStudy'
    title,
    meta, // { module, reference } or { module, strongsKey } — used by saveAsNote to anchor correctly
    messages: [],
    sessionId: null,
    attachedNotes: [],
    loading: false,
    loadingLabel: 'Thinking…',
    error: null,
  };
}

/**
 * Each "Ask about this passage" or "Word study" used to blow away
 * whatever conversation was already in progress — asking about a second
 * word meant losing the first study entirely. Conversations are now
 * genuinely independent, tab-switchable objects; triggering a new
 * overview/word-study opens a *new* tab rather than overwriting the
 * current one, and everything that was per-component state before
 * (messages, sessionId, attached notes, loading/error) now lives on the
 * individual conversation object instead.
 *
 * `input` and the note-picker UI state (query/results/open) stay as
 * plain component state rather than per-conversation — they're
 * transient UI, not conversation data, and there's no strong case for
 * preserving an in-progress draft across a tab switch in this version.
 */
export default function StudyAssistant({
  sources,
  overviewRequest,
  wordStudyRequest,
  phraseStudyRequest,
  askQuestionRequest,
  resumeSessionRequest,
  isLoggedIn,
  onSessionSaved,
}) {
  const [conversations, setConversations] = useState(() => [makeConversation('chat', 'Chat')]);
  const [activeConversationId, setActiveConversationId] = useState(() => conversations[0].id);
  const [input, setInput] = useState('');
  const [savedIndex, setSavedIndex] = useState(null);
  const [savedModuleIndex, setSavedModuleIndex] = useState(null);

  const [noteQuery, setNoteQuery] = useState('');
  const [noteResults, setNoteResults] = useState([]);
  const [showNotePicker, setShowNotePicker] = useState(false);

  const validSources = sources.filter((s) => s.module && s.reference);
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];
  // Mirrors the same fallback send() uses — the input is usable either
  // when there's something open elsewhere (the sources prop) or the
  // active conversation already has its own anchor from being started
  // via a tool (Ask a Question / Study a Passage).
  const canSend = validSources.length > 0 || Boolean(activeConversation.meta.module && activeConversation.meta.reference);

  function updateConversation(id, patch) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c))
    );
  }

  function addConversation(kind, title, meta) {
    const conv = makeConversation(kind, title, meta);
    setConversations((prev) => [...prev, conv]);
    setActiveConversationId(conv.id);
    return conv.id;
  }

  function closeConversation(id) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = makeConversation('chat', 'Chat');
        setActiveConversationId(fresh.id);
        return [fresh];
      }
      if (activeConversationId === id) setActiveConversationId(next[next.length - 1].id);
      return next;
    });
  }

  // React to overviewRequest/wordStudyRequest — each is handed a fresh
  // object (with a nonce) by the corresponding action elsewhere in the
  // app, so a straightforward effect on the prop itself is enough to
  // pick up even repeated requests for the exact same passage/word.
  useEffect(() => {
    if (!overviewRequest) return;
    void runOverview(overviewRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewRequest]);

  useEffect(() => {
    if (!wordStudyRequest) return;
    void runWordStudy(wordStudyRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordStudyRequest]);

  useEffect(() => {
    if (!phraseStudyRequest) return;
    void runPhraseStudy(phraseStudyRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phraseStudyRequest]);

  useEffect(() => {
    if (!askQuestionRequest) return;
    void runAskQuestion(askQuestionRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askQuestionRequest]);

  useEffect(() => {
    if (!resumeSessionRequest) return;
    resumeSession(resumeSessionRequest.session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionRequest]);

  async function runOverview({ module, reference }) {
    const id = addConversation('overview', `${reference} overview`, { module, reference });
    updateConversation(id, { loading: true, loadingLabel: 'Thinking…' });
    try {
      const context = await api.buildContext({
        sources: [{ module, reference, kind: 'bible', title: module }],
        includeAllCommentaries: true,
        includeWordStudies: true,
      });
      const userMessage = {
        role: 'user',
        content: `Give a thorough overview of ${reference} — draw on the commentary and word study entries included in the context, not just the bare verse text.`,
      };
      updateConversation(id, { messages: [userMessage] });
      const res = await api.askAssistant({ context, messages: [userMessage] });
      updateConversation(id, {
        messages: [userMessage, { role: 'assistant', content: res.reply }],
        sessionId: res.sessionId,
        loading: false,
      });
      onSessionSaved?.();
    } catch (e) {
      updateConversation(id, { error: e.message, loading: false });
    }
  }

  /** Mirrors runOverview's shape exactly — same self-contained single-
   * source context build, same reasoning (no dependency on anything
   * being "open" elsewhere) — the only difference is sending the
   * person's own typed question as the first message instead of the
   * fixed overview prompt. This is what makes the "Ask a Question" tool
   * work on a standalone page with nothing open: like runOverview, it
   * never touches the `sources` prop at all. */
  async function runAskQuestion({ module, reference, question }) {
    const title = reference ? `${reference}: ${question.slice(0, 30)}${question.length > 30 ? '…' : ''}` : question.slice(0, 40);
    const id = addConversation('chat', title, { module, reference });
    updateConversation(id, { loading: true, loadingLabel: 'Thinking…' });
    try {
      const context = await api.buildContext({
        sources: [{ module, reference, kind: 'bible', title: module }],
        includeAllCommentaries: true,
        includeWordStudies: true,
      });
      const userMessage = { role: 'user', content: question };
      updateConversation(id, { messages: [userMessage] });
      const res = await api.askAssistant({ context, messages: [userMessage] });
      updateConversation(id, {
        messages: [userMessage, { role: 'assistant', content: res.reply }],
        sessionId: res.sessionId,
        loading: false,
      });
      onSessionSaved?.();
    } catch (e) {
      updateConversation(id, { error: e.message, loading: false });
    }
  }

  /** Resuming a past conversation from the "Recent Conversations" list
   * — the session object handed in already carries its full messages
   * (the list endpoint returns full rows, not summaries), so this needs
   * no extra API call: it just opens a new tab seeded with that history
   * and sessionId, so replying continues the same saved conversation
   * server-side rather than starting a new one. */
  function resumeSession(session) {
    if (!session) return;
    const title = session.reference ? `${session.reference} (resumed)` : 'Resumed chat';
    const id = addConversation('chat', title, { module: session.module, reference: session.reference });
    updateConversation(id, { messages: session.messages || [], sessionId: session.id });
  }

  /** Word studies don't chain into a session the way regular chat/
   * overview replies do — askWordStudy is a dedicated, single-shot
   * endpoint rather than something that continues via the normal
   * sessionId mechanism. A follow-up question typed in this tab
   * afterward goes through the regular send() flow below, which
   * rebuilds context from validSources and won't carry the occurrence
   * list forward. That's a real, known limitation of this version, not
   * an oversight. */
  async function runWordStudy({ module, strongsKey }) {
    const id = addConversation('wordStudy', `${strongsKey} word study`, { module, strongsKey });
    updateConversation(id, {
      loading: true,
      loadingLabel:
        'Scanning the whole Bible for every occurrence — can take up to a minute the first time for a translation, instant after that…',
    });
    try {
      const context = await api.buildWordStudyContext({ module, strongsKey });
      const wordLabel = context.dictionaryEntry?.transcription
        ? `${strongsKey} (${context.dictionaryEntry.transcription})`
        : strongsKey;
      const occurrenceNote = context.truncated
        ? `${context.occurrenceCount} of ${context.totalOccurrenceCount} occurrences (truncated)`
        : `${context.occurrenceCount} occurrence${context.occurrenceCount === 1 ? '' : 's'}`;
      const userMessage = {
        role: 'user',
        content: `Give a word study for Strong's ${wordLabel} in ${module} — synthesizing patterns across ${occurrenceNote}.`,
      };
      // Show the question (and rename the tab to include the
      // transcription) right away — the LLM call itself is a second,
      // separate wait.
      updateConversation(id, { title: `${wordLabel} word study`, messages: [userMessage], loadingLabel: 'Thinking…' });
      const res = await api.askWordStudy({ context });
      updateConversation(id, {
        messages: [userMessage, { role: 'assistant', content: res.reply }],
        loading: false,
      });
    } catch (e) {
      updateConversation(id, { error: e.message, loading: false });
    }
  }

  /** Mirrors runWordStudy's shape and reasoning (single-shot, no
   * session continuation — see that function's comment). The one real
   * difference: two matching modes. `strongsSequence` present means
   * "original words" mode (same underlying tagged words regardless of
   * English wording); absent means "exact wording" mode (plain text
   * match in this translation only). Both funnel through the same
   * backend endpoint and conversation shape — only the request payload
   * and the title/labels differ. */
  async function runPhraseStudy({ module, phrase, strongsSequence }) {
    const isSequence = Array.isArray(strongsSequence) && strongsSequence.length > 0;
    const title = isSequence ? `"${phrase}" (original words)` : `"${phrase}"`;
    const id = addConversation('phraseStudy', title, { module, phrase, strongsSequence });
    updateConversation(id, {
      loading: true,
      loadingLabel:
        'Scanning the whole Bible for every occurrence — can take up to a minute the first time for a translation, instant after that…',
    });
    try {
      const context = await api.buildPhraseStudyContext({
        module,
        phrase: isSequence ? undefined : phrase,
        strongsSequence: isSequence ? strongsSequence : undefined,
        displayText: phrase,
      });
      const occurrenceNote = context.truncated
        ? `${context.occurrenceCount} of ${context.totalOccurrenceCount} occurrences (truncated)`
        : `${context.occurrenceCount} occurrence${context.occurrenceCount === 1 ? '' : 's'}`;
      const matchNote =
        context.matchType === 'strongsSequence'
          ? 'matched by the same underlying original-language words, not exact English wording'
          : 'matched by exact wording in this translation';
      const userMessage = {
        role: 'user',
        content: `Give a phrase study for "${phrase}" in ${module} (${matchNote}) — synthesizing patterns across ${occurrenceNote}.`,
      };
      updateConversation(id, { title, messages: [userMessage], loadingLabel: 'Thinking…' });
      const res = await api.askPhraseStudy({ context });
      updateConversation(id, {
        messages: [userMessage, { role: 'assistant', content: res.reply }],
        loading: false,
      });
    } catch (e) {
      updateConversation(id, { error: e.message, loading: false });
    }
  }

  async function searchNotes(q) {
    setNoteQuery(q);
    if (!q.trim()) return setNoteResults([]);
    try {
      const results = await api.listNotes({ q });
      setNoteResults(results);
    } catch {
      // non-critical
    }
  }

  function toggleAttachNote(note) {
    updateConversation(activeConversationId, (c) => ({
      attachedNotes: c.attachedNotes.some((n) => n.id === note.id)
        ? c.attachedNotes.filter((n) => n.id !== note.id)
        : [...c.attachedNotes, note],
    }));
  }

  async function send() {
    if (!input.trim()) return;
    const convId = activeConversationId;
    const conv = conversations.find((c) => c.id === convId);
    // Falls back to the active conversation's own anchor (set when it
    // was created via a tool like "Ask a Question"/"Study a Passage")
    // when the sources prop is empty — this is what makes following up
    // within a conversation possible on a standalone page with nothing
    // open elsewhere, rather than the input staying permanently
    // disabled the moment sources is empty.
    const effectiveSources =
      validSources.length > 0
        ? validSources
        : conv.meta.module && conv.meta.reference
        ? [{ module: conv.meta.module, reference: conv.meta.reference, kind: 'bible', title: conv.meta.module }]
        : [];
    if (effectiveSources.length === 0) return;
    const nextMessages = [...conv.messages, { role: 'user', content: input.trim() }];
    updateConversation(convId, { messages: nextMessages, loading: true, loadingLabel: 'Thinking…', error: null });
    setInput('');
    try {
      const context = await api.buildContext({
        sources: effectiveSources,
        noteIds: conv.attachedNotes.map((n) => n.id),
      });
      const res = await api.askAssistant({ context, messages: nextMessages, sessionId: conv.sessionId });
      updateConversation(convId, (c) => ({
        messages: [...c.messages, { role: 'assistant', content: res.reply }],
        sessionId: res.sessionId,
        loading: false,
      }));
      onSessionSaved?.();
    } catch (e) {
      updateConversation(convId, { error: e.message, loading: false });
    }
  }

  async function saveAsNote(content, index) {
    const anchor = activeConversation.meta.reference || activeConversation.meta.module ? activeConversation.meta : validSources[0] || {};
    try {
      await api.createNote({
        title: content.slice(0, 60).replace(/\s+\S*$/, '') + (content.length > 60 ? '…' : ''),
        body: content,
        reference: anchor.reference || null,
        module: anchor.module || null,
        tags: ['assistant'],
        fromAssistant: true,
      });
      setSavedIndex(index);
      setTimeout(() => setSavedIndex((i) => (i === index ? null : i)), 1500);
    } catch (e) {
      updateConversation(activeConversationId, { error: e.message });
    }
  }

  /** A word-study conversation saves as a DICT-type personal entry
   * (keyed by its Strong's number); any conversation anchored to a
   * reference (overview, or regular chat with something open) saves as
   * a COMMENTARY-type entry instead — connected to that passage the same
   * way a real commentary would be, via personalModuleService's
   * range-overlap matching on the backend. */
  function moduleSaveAnchor() {
    if (activeConversation.kind === 'wordStudy') {
      return activeConversation.meta.strongsKey ? { type: 'DICT', key: activeConversation.meta.strongsKey } : null;
    }
    // A phrase study, like a word study, is about a linguistic unit
    // studied across the whole Bible rather than anchored to one
    // passage — saves the same way, as a DICT-type entry, just keyed by
    // the phrase text itself instead of a Strong's number.
    if (activeConversation.kind === 'phraseStudy') {
      return activeConversation.meta.phrase ? { type: 'DICT', key: activeConversation.meta.phrase } : null;
    }
    const anchor = activeConversation.meta.reference ? activeConversation.meta : validSources[0];
    return anchor?.reference ? { type: 'COMMENTARY', reference: anchor.reference } : null;
  }

  async function saveAsModule(content, index) {
    const anchor = moduleSaveAnchor();
    if (!anchor) return;
    try {
      await api.savePersonalModule({ ...anchor, title: activeConversation.title, body: content });
      setSavedModuleIndex(index);
      setTimeout(() => setSavedModuleIndex((i) => (i === index ? null : i)), 1500);
    } catch (e) {
      updateConversation(activeConversationId, { error: e.message });
    }
  }

  // Placed after every hook above (Rules of Hooks) — the effects
  // watching overviewRequest/wordStudyRequest/phraseStudyRequest still
  // run even in this state, but any conversation they'd create is never
  // rendered here, so a request that arrives while logged out just
  // fails silently in the background rather than causing a visible bug.
  if (!isLoggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="mb-2 font-display text-lg text-parchment">Study assistant</p>
        <p className="text-sm text-muted">
          Log in to use the study assistant — it calls the Claude API, which costs real money per use.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-2 flex items-center gap-1 overflow-x-auto border-b border-rule pb-2">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`flex shrink-0 items-center rounded text-xs whitespace-nowrap ${
              c.id === activeConversationId ? 'bg-panel text-brass' : 'text-muted'
            }`}
          >
            <button
              onClick={() => setActiveConversationId(c.id)}
              className={`max-w-[10rem] truncate px-2 py-1 ${c.id === activeConversationId ? '' : 'hover:text-parchment'}`}
              title={c.title}
            >
              {c.title}
            </button>
            {conversations.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeConversation(c.id);
                }}
                className="px-1.5 py-1 hover:text-red-400"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => addConversation('chat', 'Chat')}
          className="shrink-0 px-2 py-1 text-xs text-muted hover:text-brass"
          title="New chat"
        >
          +
        </button>
      </div>

      <p className="mb-2 text-xs text-muted">
        {validSources.length > 0 ? (
          <>Context: {validSources.map((s) => `${s.title} ${s.reference}`).join(' · ')}</>
        ) : activeConversation.meta.module && activeConversation.meta.reference ? (
          <>Context: {activeConversation.meta.module} {activeConversation.meta.reference}</>
        ) : (
          'Open a Bible or commentary window to give the assistant something to work from.'
        )}
      </p>

      <div className="mb-3">
        <button
          onClick={() => setShowNotePicker((v) => !v)}
          className="text-xs text-verdigris hover:text-brass"
        >
          {showNotePicker ? 'hide' : 'attach'} personal notes{' '}
          {activeConversation.attachedNotes.length > 0 && `(${activeConversation.attachedNotes.length})`}
        </button>
        {activeConversation.attachedNotes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {activeConversation.attachedNotes.map((n) => (
              <span key={n.id} className="flex items-center gap-1 rounded border border-rule px-2 py-0.5 text-xs text-parchment/90">
                {n.title || 'Untitled'}
                <button onClick={() => toggleAttachNote(n)} className="text-muted hover:text-red-400">
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {showNotePicker && (
          <div className="mt-2 rounded-md border border-rule bg-panel p-2">
            <input
              value={noteQuery}
              onChange={(e) => searchNotes(e.target.value)}
              placeholder="Search your notes…"
              className="mb-2 w-full rounded border border-rule bg-ink px-2 py-1 text-xs placeholder:text-muted"
            />
            <div className="max-h-32 overflow-y-auto">
              {noteResults.map((n) => (
                <button
                  key={n.id}
                  onClick={() => toggleAttachNote(n)}
                  className={`block w-full truncate px-2 py-1 text-left text-xs ${
                    activeConversation.attachedNotes.some((a) => a.id === n.id) ? 'text-brass' : 'text-parchment/90 hover:text-brass'
                  }`}
                >
                  {activeConversation.attachedNotes.some((a) => a.id === n.id) ? '✓ ' : ''}
                  {n.title || n.body.slice(0, 40)}
                </button>
              ))}
              {noteQuery && noteResults.length === 0 && <p className="px-2 py-1 text-xs text-muted">No matches.</p>}
            </div>
          </div>
        )}
      </div>

      {activeConversation.error && <p className="mb-2 text-sm text-red-400">{activeConversation.error}</p>}

      <div className="mb-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {activeConversation.messages.map((m, i) => (
          <div
            key={i}
            className={`markdown-body group relative rounded-md px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-panel text-parchment' : 'bg-verdigris/20 text-parchment/90'
            }`}
          >
            {m.role === 'assistant' ? <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown> : m.content}
            {m.role === 'assistant' && (
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => saveAsNote(m.content, i)}
                  className="rounded border border-rule bg-panel px-1.5 py-0.5 text-xs text-muted hover:text-brass"
                  title="Save this reply as a personal note"
                >
                  {savedIndex === i ? 'saved ✓' : 'save as note'}
                </button>
                {moduleSaveAnchor() && (
                  <button
                    onClick={() => saveAsModule(m.content, i)}
                    className="rounded border border-rule bg-panel px-1.5 py-0.5 text-xs text-muted hover:text-brass"
                    title={
                      moduleSaveAnchor().type === 'DICT'
                        ? 'Save as a personal dictionary entry — browsable and searchable like any other dictionary module'
                        : 'Save as a personal commentary entry — connected to this passage, shown alongside any other commentary'
                    }
                  >
                    {savedModuleIndex === i
                      ? 'saved ✓'
                      : `save as ${moduleSaveAnchor().type === 'DICT' ? 'dictionary' : 'commentary'} entry`}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {activeConversation.loading && <p className="px-1 text-xs italic text-muted">{activeConversation.loadingLabel}</p>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={!canSend}
          placeholder={canSend ? 'Ask about what\'s open…' : 'Nothing open yet'}
          className="flex-1 rounded-md border border-rule bg-ink px-3 py-2 text-sm placeholder:text-muted disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={!canSend || activeConversation.loading}
          className="rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
        >
          {activeConversation.loading ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  );
}
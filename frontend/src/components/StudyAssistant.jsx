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
export default function StudyAssistant({ sources, overviewRequest, wordStudyRequest }) {
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
    } catch (e) {
      updateConversation(id, { error: e.message, loading: false });
    }
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
    if (!input.trim() || validSources.length === 0) return;
    const convId = activeConversationId;
    const conv = conversations.find((c) => c.id === convId);
    const nextMessages = [...conv.messages, { role: 'user', content: input.trim() }];
    updateConversation(convId, { messages: nextMessages, loading: true, loadingLabel: 'Thinking…', error: null });
    setInput('');
    try {
      const context = await api.buildContext({
        sources: validSources,
        noteIds: conv.attachedNotes.map((n) => n.id),
      });
      const res = await api.askAssistant({ context, messages: nextMessages, sessionId: conv.sessionId });
      updateConversation(convId, (c) => ({
        messages: [...c.messages, { role: 'assistant', content: res.reply }],
        sessionId: res.sessionId,
        loading: false,
      }));
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
                      activeConversation.kind === 'wordStudy'
                        ? 'Save as a personal dictionary entry — browsable and searchable like any other dictionary module'
                        : 'Save as a personal commentary entry — connected to this passage, shown alongside any other commentary'
                    }
                  >
                    {savedModuleIndex === i
                      ? 'saved ✓'
                      : `save as ${activeConversation.kind === 'wordStudy' ? 'dictionary' : 'commentary'} entry`}
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
          disabled={validSources.length === 0}
          placeholder={validSources.length > 0 ? 'Ask about what\'s open…' : 'Nothing open yet'}
          className="flex-1 rounded-md border border-rule bg-ink px-3 py-2 text-sm placeholder:text-muted disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={validSources.length === 0 || activeConversation.loading}
          className="rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
        >
          {activeConversation.loading ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  );
}
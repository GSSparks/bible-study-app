import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';

/** `wordStudyRequest`: `{ module, strongsKey, nonce }` — set when the
 * person clicks "Word study across the whole Bible →" on a Strong's
 * popup. Same "start fresh" behavior as overviewRequest, and the same
 * reasoning applies to why: a word study is a new, deliberate inquiry,
 * not a continuation of whatever chat was already happening.
 *
 * Genuinely slower than the passage overview, and worth surfacing that
 * rather than leaving a bare spinner: the FIRST word study for a given
 * translation triggers a real full-Bible scan on the backend (cached
 * after that — every word study after the first, for any word in that
 * same translation, is fast). loadingLabel exists specifically to make
 * that distinction visible instead of using the same generic "…" for
 * every kind of request. */
export default function StudyAssistant({ sources, overviewRequest, wordStudyRequest }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Thinking…');
  const [error, setError] = useState(null);
  const [savedIndex, setSavedIndex] = useState(null);

  const [noteQuery, setNoteQuery] = useState('');
  const [noteResults, setNoteResults] = useState([]);
  const [attachedNotes, setAttachedNotes] = useState([]);
  const [showNotePicker, setShowNotePicker] = useState(false);

  const validSources = sources.filter((s) => s.module && s.reference);

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
    setMessages([]);
    setSessionId(null);
    setLoading(true);
    setLoadingLabel('Thinking…');
    setError(null);
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
      const res = await api.askAssistant({ context, messages: [userMessage] });
      setMessages([userMessage, { role: 'assistant', content: res.reply }]);
      setSessionId(res.sessionId);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /** Word studies don't chain into a session the way regular chat/
   * overview replies do — askWordStudy is a dedicated, single-shot
   * endpoint (see contextBuilder.js) rather than something that
   * continues via the normal sessionId mechanism. A follow-up question
   * typed afterward goes through the regular send() flow below, which
   * rebuilds context from validSources and won't carry the occurrence
   * list forward. That's a real, known limitation of this first
   * version, not an oversight. */
  async function runWordStudy({ module, strongsKey }) {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setLoading(true);
    setLoadingLabel('Scanning the whole Bible for every occurrence — can take up to a minute the first time for a translation, instant after that…');
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
      // Show the question (and that the scan finished) right away —
      // the LLM call itself is a second, separate wait.
      setMessages([userMessage]);
      setLoadingLabel('Thinking…');
      const res = await api.askWordStudy({ context });
      setMessages([userMessage, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
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
    setAttachedNotes((prev) =>
      prev.some((n) => n.id === note.id) ? prev.filter((n) => n.id !== note.id) : [...prev, note]
    );
  }

  async function send() {
    if (!input.trim() || validSources.length === 0) return;
    const nextMessages = [...messages, { role: 'user', content: input.trim() }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setLoadingLabel('Thinking…');
    setError(null);
    try {
      const context = await api.buildContext({
        sources: validSources,
        noteIds: attachedNotes.map((n) => n.id),
      });
      const res = await api.askAssistant({ context, messages: nextMessages, sessionId });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      setSessionId(res.sessionId);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveAsNote(content, index) {
    const primary = validSources[0];
    try {
      await api.createNote({
        title: content.slice(0, 60).replace(/\s+\S*$/, '') + (content.length > 60 ? '…' : ''),
        body: content,
        reference: primary?.reference || null,
        module: primary?.module || null,
        tags: ['assistant'],
        fromAssistant: true,
      });
      setSavedIndex(index);
      setTimeout(() => setSavedIndex((i) => (i === index ? null : i)), 1500);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <h3 className="mb-2 font-display text-lg text-parchment">Study assistant</h3>

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
          {showNotePicker ? 'hide' : 'attach'} personal notes {attachedNotes.length > 0 && `(${attachedNotes.length})`}
        </button>
        {attachedNotes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {attachedNotes.map((n) => (
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
                    attachedNotes.some((a) => a.id === n.id) ? 'text-brass' : 'text-parchment/90 hover:text-brass'
                  }`}
                >
                  {attachedNotes.some((a) => a.id === n.id) ? '✓ ' : ''}
                  {n.title || n.body.slice(0, 40)}
                </button>
              ))}
              {noteQuery && noteResults.length === 0 && <p className="px-2 py-1 text-xs text-muted">No matches.</p>}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      <div className="mb-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`markdown-body group relative rounded-md px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-panel text-parchment' : 'bg-verdigris/20 text-parchment/90'
            }`}
          >
            {m.role === 'assistant' ? <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown> : m.content}
            {m.role === 'assistant' && (
              <button
                onClick={() => saveAsNote(m.content, i)}
                className="absolute right-2 top-2 rounded border border-rule bg-panel px-1.5 py-0.5 text-xs text-muted opacity-0 hover:text-brass group-hover:opacity-100"
                title="Save this reply as a personal note"
              >
                {savedIndex === i ? 'saved ✓' : 'save as note'}
              </button>
            )}
          </div>
        ))}
        {loading && <p className="px-1 text-xs italic text-muted">{loadingLabel}</p>}
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
          disabled={validSources.length === 0 || loading}
          className="rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  );
}
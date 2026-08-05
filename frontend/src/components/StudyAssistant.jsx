import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';

/** `sources`: flattened list of open Bible/commentary tabs across all
 * windows — [{ module, reference, kind, title }] — gathered by App from
 * current window state. Context is rebuilt from this fresh on every
 * send, so navigating around while chatting keeps the assistant current
 * without any manual "load context" step. */
export default function StudyAssistant({ sources }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedIndex, setSavedIndex] = useState(null);

  const [noteQuery, setNoteQuery] = useState('');
  const [noteResults, setNoteResults] = useState([]);
  const [attachedNotes, setAttachedNotes] = useState([]); // [{id, title, body}]
  const [showNotePicker, setShowNotePicker] = useState(false);

  const validSources = sources.filter((s) => s.module && s.reference);

  async function searchNotes(q) {
    setNoteQuery(q);
    if (!q.trim()) return setNoteResults([]);
    try {
      const results = await api.listNotes({ q });
      setNoteResults(results);
    } catch {
      // non-critical — leave results as-is
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

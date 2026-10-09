import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';

export default function AIChatPane({
  focusedReference,
  defaultBibleModule,
  isLoggedIn,
  pendingAiRequest,
}) {
  const [sessions, setSessions] = useState([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Thinking…');
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const [attachedNotes, setAttachedNotes] = useState([]);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [noteQuery, setNoteQuery] = useState('');
  const [noteResults, setNoteResults] = useState([]);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [savedIdx, setSavedIdx] = useState(null);

  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(null);
  sessionIdRef.current = activeSessionId;

  const handledNonceRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function refreshSessions() {
    if (!isLoggedIn) return;
    api.listRecentSessions().then(setSessions).catch(() => {});
  }

  useEffect(() => {
    refreshSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    if (!pendingAiRequest?.nonce) return;
    if (pendingAiRequest.nonce === handledNonceRef.current) return;
    handledNonceRef.current = pendingAiRequest.nonce;
    switch (pendingAiRequest.type) {
      case 'overview':   return void runOverview(pendingAiRequest);
      case 'phraseStudy': return void runPhraseStudy(pendingAiRequest);
      case 'wordStudy':  return void runWordStudy(pendingAiRequest);
      case 'document':   return void runDocumentChat(pendingAiRequest);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAiRequest?.nonce]);

  function startNewChat() {
    setMessages([]);
    setActiveSessionId(null);
    setChatTitle('New Chat');
    setError(null);
    setAttachedNotes([]);
    setInput('');
    setDropdownOpen(false);
  }

  function resumeSession(session) {
    setMessages(session.messages || []);
    setActiveSessionId(session.id);
    setChatTitle(session.title || session.reference || 'Chat');
    setError(null);
    setAttachedNotes([]);
    setDropdownOpen(false);
  }

  async function commitRename() {
    if (!activeSessionId || !renameValue.trim()) { setRenaming(false); return; }
    try {
      await api.renameSession(activeSessionId, renameValue.trim());
      setChatTitle(renameValue.trim());
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, title: renameValue.trim() } : s))
      );
    } catch {}
    setRenaming(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setLoadingLabel('Thinking…');
    setError(null);
    try {
      const sources =
        focusedReference && defaultBibleModule
          ? [{ module: defaultBibleModule, reference: focusedReference, kind: 'bible', title: defaultBibleModule }]
          : [];
      const context =
        sources.length > 0
          ? await api.buildContext({ sources, noteIds: attachedNotes.map((n) => n.id) })
          : { passages: [], notes: [] };
      const res = await api.askAssistant({
        context,
        messages: nextMessages,
        sessionId: sessionIdRef.current,
        title: chatTitle !== 'New Chat' ? chatTitle : undefined,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      if (!sessionIdRef.current) {
        setActiveSessionId(res.sessionId);
      }
      refreshSessions();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runOverview({ module, reference }) {
    startNewChat();
    const t = `${reference} overview`;
    setChatTitle(t);
    setLoading(true);
    setLoadingLabel('Thinking…');
    const userMessage = {
      role: 'user',
      content: `Give a thorough overview of ${reference} — draw on the commentary and word study entries included in the context.`,
    };
    setMessages([userMessage]);
    try {
      const context = await api.buildContext({
        sources: [{ module, reference, kind: 'bible', title: module }],
        includeAllCommentaries: true,
        includeWordStudies: true,
      });
      const res = await api.askAssistant({ context, messages: [userMessage], title: t });
      setMessages([userMessage, { role: 'assistant', content: res.reply }]);
      setActiveSessionId(res.sessionId);
      refreshSessions();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runPhraseStudy({ module, phrase, strongsSequence }) {
    const isSeq = Array.isArray(strongsSequence) && strongsSequence.length > 0;
    const t = isSeq ? `"${phrase}" (original words)` : `"${phrase}"`;
    startNewChat();
    setChatTitle(t);
    setLoading(true);
    setLoadingLabel('Scanning the whole Bible for every occurrence — can take up to a minute the first time…');
    const userMessage = {
      role: 'user',
      content: `Give a phrase study for "${phrase}" in ${module} (${isSeq ? 'matched by original-language words' : 'exact wording match'}).`,
    };
    setMessages([userMessage]);
    try {
      const context = await api.buildPhraseStudyContext({
        module,
        phrase: isSeq ? undefined : phrase,
        strongsSequence: isSeq ? strongsSequence : undefined,
        displayText: phrase,
      });
      const occNote = context.truncated
        ? `${context.occurrenceCount} of ${context.totalOccurrenceCount} occurrences (truncated)`
        : `${context.occurrenceCount} occurrence${context.occurrenceCount === 1 ? '' : 's'}`;
      const fullMessage = {
        role: 'user',
        content: `Give a phrase study for "${phrase}" in ${module} — synthesizing patterns across ${occNote}.`,
      };
      setMessages([fullMessage]);
      setLoadingLabel('Thinking…');
      const res = await api.askPhraseStudy({ context });
      setMessages([fullMessage, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runWordStudy({ module, strongsKey }) {
    const t = `${strongsKey} word study`;
    startNewChat();
    setChatTitle(t);
    setLoading(true);
    setLoadingLabel('Scanning the whole Bible for every occurrence — can take up to a minute the first time…');
    const userMessage = { role: 'user', content: `Give a word study for Strong's ${strongsKey} in ${module}.` };
    setMessages([userMessage]);
    try {
      const context = await api.buildWordStudyContext({ module, strongsKey });
      const wordLabel = context.dictionaryEntry?.transcription
        ? `${strongsKey} (${context.dictionaryEntry.transcription})`
        : strongsKey;
      const occNote = context.truncated
        ? `${context.occurrenceCount} of ${context.totalOccurrenceCount} occurrences (truncated)`
        : `${context.occurrenceCount} occurrence${context.occurrenceCount === 1 ? '' : 's'}`;
      const fullMessage = {
        role: 'user',
        content: `Give a word study for Strong's ${wordLabel} in ${module} — synthesizing patterns across ${occNote}.`,
      };
      setMessages([fullMessage]);
      setChatTitle(`${wordLabel} word study`);
      setLoadingLabel('Thinking…');
      const res = await api.askWordStudy({ context });
      setMessages([fullMessage, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runDocumentChat({ documentId }) {
    startNewChat();
    setChatTitle('Document chat');
    setLoading(true);
    setLoadingLabel('Thinking…');
    const userMessage = { role: 'user', content: 'Summarize this document and highlight the most important points.' };
    setMessages([userMessage]);
    try {
      const context = await api.buildContext({ sources: [], documentIds: [documentId] });
      const res = await api.askAssistant({ context, messages: [userMessage] });
      setMessages([userMessage, { role: 'assistant', content: res.reply }]);
      setActiveSessionId(res.sessionId);
      refreshSessions();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveAsNote(content, idx) {
    try {
      await api.createNote({
        title: content.slice(0, 60).replace(/\s+\S*$/, '') + (content.length > 60 ? '…' : ''),
        body: content,
        reference: focusedReference || null,
        module: defaultBibleModule || null,
        tags: ['assistant'],
        fromAssistant: true,
      });
      setSavedIdx(idx);
      setTimeout(() => setSavedIdx((i) => (i === idx ? null : i)), 1500);
    } catch (e) {
      setError(e.message);
    }
  }

  async function searchNotes(q) {
    setNoteQuery(q);
    if (!q.trim()) return setNoteResults([]);
    try {
      const results = await api.listNotes({ q });
      setNoteResults(results);
    } catch {}
  }

  function toggleAttachNote(note) {
    setAttachedNotes((prev) =>
      prev.some((n) => n.id === note.id) ? prev.filter((n) => n.id !== note.id) : [...prev, note]
    );
  }

  const filteredSessions = sessions.filter((s) => {
    const q = sessionSearch.toLowerCase();
    return !q || (s.title || s.reference || '').toLowerCase().includes(q);
  });

  if (!isLoggedIn) {
    return (
      <div className="flex h-full items-center justify-center bg-page px-6 text-center text-sm text-pageMuted">
        Sign in to use AI Chat.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      {/* Header: session selector + rename + new */}
      <div className="flex shrink-0 items-center gap-2 border-b border-pageBorder px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <button
            onClick={() => { setDropdownOpen((v) => !v); setSessionSearch(''); }}
            className="flex w-full items-center gap-1 rounded border border-pageBorder px-2 py-1 font-mono text-xs text-pageText hover:border-brass"
          >
            <span className="min-w-0 flex-1 truncate text-left">{chatTitle}</span>
            <span className="shrink-0 text-[10px] text-pageMuted">▾</span>
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded border border-pageBorder bg-page shadow-xl">
                <div className="p-2">
                  <input
                    autoFocus
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    placeholder="Search chats…"
                    className="w-full rounded border border-pageBorder bg-panel px-2 py-1 text-xs placeholder:text-pageMuted focus:border-brass focus:outline-none"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <button
                    onClick={startNewChat}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-brass hover:bg-panel"
                  >
                    + New Chat
                  </button>
                  {filteredSessions.length > 0 && (
                    <div className="border-t border-pageBorder">
                      {filteredSessions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => resumeSession(s)}
                          className={`block w-full px-3 py-2 text-left text-xs ${
                            s.id === activeSessionId ? 'text-brass' : 'text-pageText hover:bg-panel'
                          }`}
                        >
                          <div className="truncate">{s.title || s.reference || 'Untitled'}</div>
                          {s.reference && s.title && (
                            <div className="truncate text-pageMuted">{s.reference}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {sessionSearch && filteredSessions.length === 0 && (
                    <p className="px-3 py-2 text-xs text-pageMuted">No matches.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {activeSessionId && !renaming && (
          <button
            onClick={() => { setRenaming(true); setRenameValue(chatTitle); }}
            className="shrink-0 text-xs text-pageMuted hover:text-pageText"
            title="Rename this chat"
          >
            ✎
          </button>
        )}

        <button
          onClick={startNewChat}
          className="shrink-0 rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-brass hover:text-pageText"
          title="New chat"
        >
          +
        </button>
      </div>

      {/* Rename bar */}
      {renaming && (
        <div className="flex shrink-0 items-center gap-2 border-b border-pageBorder px-3 py-1.5">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="min-w-0 flex-1 rounded border border-pageBorder bg-panel px-2 py-1 font-mono text-xs focus:border-brass focus:outline-none"
          />
          <button onClick={commitRename} className="shrink-0 text-xs text-brass hover:text-pageText">Save</button>
          <button onClick={() => setRenaming(false)} className="shrink-0 text-xs text-pageMuted hover:text-pageText">✕</button>
        </div>
      )}

      {/* Notes attach bar */}
      <div className="shrink-0 border-b border-pageBorder px-3 py-1.5">
        <button
          onClick={() => setShowNotePicker((v) => !v)}
          className="text-xs text-verdigris hover:text-brass"
        >
          {showNotePicker ? 'hide notes' : 'attach notes'}
          {attachedNotes.length > 0 && ` (${attachedNotes.length})`}
        </button>
        {attachedNotes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {attachedNotes.map((n) => (
              <span key={n.id} className="flex items-center gap-1 rounded border border-pageBorder px-2 py-0.5 text-xs text-pageText">
                {n.title || 'Untitled'}
                <button onClick={() => toggleAttachNote(n)} className="text-pageMuted hover:text-red-500">✕</button>
              </span>
            ))}
          </div>
        )}
        {showNotePicker && (
          <div className="mt-1 rounded border border-pageBorder bg-panel p-2">
            <input
              value={noteQuery}
              onChange={(e) => searchNotes(e.target.value)}
              placeholder="Search notes…"
              className="mb-1.5 w-full rounded border border-pageBorder bg-page px-2 py-1 text-xs placeholder:text-pageMuted focus:outline-none"
            />
            <div className="max-h-28 overflow-y-auto">
              {noteResults.map((n) => (
                <button
                  key={n.id}
                  onClick={() => toggleAttachNote(n)}
                  className={`block w-full truncate px-1.5 py-1 text-left text-xs ${
                    attachedNotes.some((a) => a.id === n.id) ? 'text-brass' : 'text-pageText hover:text-brass'
                  }`}
                >
                  {attachedNotes.some((a) => a.id === n.id) ? '✓ ' : ''}{n.title || n.body?.slice(0, 40)}
                </button>
              ))}
              {noteQuery && noteResults.length === 0 && (
                <p className="px-1.5 py-1 text-xs text-pageMuted">No matches.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !loading && (
          <div className="flex h-full items-center justify-center text-sm text-pageMuted">
            {focusedReference
              ? `Ask anything about ${focusedReference}, or start a new topic.`
              : 'Open a passage or ask a question to get started.'}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`group flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-panel px-4 py-2.5 text-sm text-pageText">
                {m.content}
              </div>
            ) : (
              <div className="w-full">
                <div className="border-l-2 border-brass/40 pl-4 text-sm leading-relaxed text-pageText [&_h1]:mb-1 [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-brass [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-display [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-verdigris [&_li]:mb-0.5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p]:leading-relaxed [&_strong]:font-semibold [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-pageBorder [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-pageBorder [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
                  <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                </div>
                <div className="mt-1 flex gap-3 pl-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => saveAsNote(m.content, i)}
                    className="text-xs text-pageMuted hover:text-brass"
                  >
                    {savedIdx === i ? '✓ saved' : 'save as note'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <p className="border-l-2 border-brass/20 pl-4 text-xs italic text-pageMuted">{loadingLabel}</p>
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-pageBorder px-3 py-2">
        {focusedReference && defaultBibleModule && (
          <p className="mb-1.5 truncate text-xs text-pageMuted">
            Context: {defaultBibleModule} · {focusedReference}
          </p>
        )}
        <div className="flex items-end gap-2 rounded-lg border border-pageBorder bg-panel px-3 py-1.5 focus-within:border-brass/60">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask a question… (Enter to send)"
            className="max-h-32 min-h-[2rem] flex-1 resize-none bg-transparent text-sm text-pageText placeholder:text-pageMuted focus:outline-none"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="mb-0.5 shrink-0 rounded-lg bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-40"
          >
            {loading ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

// ─── Markdown renderer ────────────────────────────────────────────────────────

function applyInline(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="font-mono text-xs bg-[#E5DCC8] px-1 rounded text-verdigris">$1</code>');
}

function parseTable(lines) {
  const isHeaderSep = (l) => /^\|[\s:|-]+\|$/.test(l.trim());
  const dataLines = lines.filter((l) => l.trim().startsWith('|'));
  if (dataLines.length < 2) return '';
  const sepIdx = dataLines.findIndex(isHeaderSep);
  if (sepIdx === -1) return '';
  const parseRow = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
  const headerCells = parseRow(dataLines[0]);
  const bodyLines = dataLines.slice(sepIdx + 1).filter((l) => !isHeaderSep(l));
  const thead =
    '<thead><tr>' +
    headerCells
      .map((c) => `<th class="border border-pageBorder px-3 py-2 text-left font-semibold text-pageText bg-[#DDD5BC] font-sans text-xs uppercase tracking-wide">${applyInline(c)}</th>`)
      .join('') +
    '</tr></thead>';
  const tbody =
    '<tbody>' +
    bodyLines
      .map(
        (line) =>
          '<tr class="even:bg-[#E5DCC8]">' +
          parseRow(line)
            .map((c) => `<td class="border border-pageBorder px-3 py-2 text-pageMuted font-display text-sm">${applyInline(c)}</td>`)
            .join('') +
          '</tr>'
      )
      .join('') +
    '</tbody>';
  return `<div class="overflow-x-auto my-4"><table class="w-full border-collapse">${thead}${tbody}</table></div>`;
}

function markdownToHtml(md) {
  const blocks = md.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n').filter((l) => l !== undefined);
      if (!lines.length) return '';
      const first = lines[0];

      const hMatch = first.match(/^(#{1,4})\s+(.*)/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = applyInline(hMatch[2]);
        const styles = [
          '',
          'mt-7 mb-2 font-display text-xl font-bold text-brass border-b border-rule/50 pb-1',
          'mt-6 mb-2 font-display text-lg font-semibold text-pageText',
          'mt-5 mb-1 font-display text-base font-semibold text-verdigris',
          'mt-4 mb-1 font-sans text-sm font-semibold text-pageMuted uppercase tracking-wider',
        ][level] || '';
        return `<h${level} class="${styles}">${text}</h${level}>`;
      }

      if (/^[-*_]{3,}$/.test(first.trim())) return '<hr class="my-5 border-rule/50" />';

      if (first.trim().startsWith('|')) return parseTable(lines);

      if (/^[-*+]\s/.test(first)) {
        const items = lines
          .filter((l) => /^[-*+]\s/.test(l))
          .map((l) => `<li class="mb-1">${applyInline(l.replace(/^[-*+]\s+/, ''))}</li>`);
        return `<ul class="list-disc pl-5 mb-3 space-y-0.5 font-display text-base leading-relaxed text-pageText">${items.join('')}</ul>`;
      }

      if (/^\d+[.)]\s/.test(first)) {
        const items = lines
          .filter((l) => /^\d+[.)]\s/.test(l))
          .map((l) => `<li class="mb-1">${applyInline(l.replace(/^\d+[.)]\s+/, ''))}</li>`);
        return `<ol class="list-decimal pl-5 mb-3 space-y-0.5 font-display text-base leading-relaxed text-pageText">${items.join('')}</ol>`;
      }

      if (first.startsWith('>')) {
        const text = lines.map((l) => l.replace(/^>\s?/, '')).join(' ');
        return `<blockquote class="border-l-2 border-brass/50 pl-4 my-3 italic font-display text-base text-pageMuted leading-relaxed">${applyInline(text)}</blockquote>`;
      }

      return `<p class="mb-3 font-display text-base leading-loose text-pageText">${applyInline(lines.join(' '))}</p>`;
    })
    .join('\n');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PassageGuidePane({ reference, module, isLoggedIn, pendingAiRequest, onPersonalDictionarySaved }) {
  const [sessions, setSessions] = useState([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionTitle, setSessionTitle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Generating…');
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const [attachedNotes, setAttachedNotes] = useState([]);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [noteQuery, setNoteQuery] = useState('');
  const [noteResults, setNoteResults] = useState([]);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [savedIdx, setSavedIdx] = useState(null);
  const [savedDictIdx, setSavedDictIdx] = useState(null);
  const [activeStudyKind, setActiveStudyKind] = useState(null); // 'wordStudy' | 'phraseStudy' | null
  const [activeStudyKey, setActiveStudyKey] = useState(null);   // strongsKey or phrase text

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
      case 'overview':    return void runOverview(pendingAiRequest);
      case 'phraseStudy': return void runPhraseStudy(pendingAiRequest);
      case 'wordStudy':   return void runWordStudy(pendingAiRequest);
      case 'document':    return void runDocumentChat(pendingAiRequest);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAiRequest?.nonce]);

  function startNew() {
    setMessages([]);
    setActiveSessionId(null);
    setSessionTitle(null);
    setError(null);
    setAttachedNotes([]);
    setInput('');
    setDropdownOpen(false);
    setActiveStudyKind(null);
    setActiveStudyKey(null);
  }

  function resumeSession(session) {
    setMessages(session.messages || []);
    setActiveSessionId(session.id);
    setSessionTitle(session.title || session.reference || 'Untitled');
    setError(null);
    setAttachedNotes([]);
    setDropdownOpen(false);
  }

  async function commitRename() {
    const trimmed = renameValue.trim();
    setRenaming(false);
    if (!activeSessionId || !trimmed) return;
    try {
      await api.renameSession(activeSessionId, trimmed);
      setSessionTitle(trimmed);
      setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? { ...s, title: trimmed } : s)));
    } catch {}
  }

  // Strip display-only metadata before sending to the API
  function toApiMessages(msgs) {
    return msgs.map(({ _header, ...m }) => m);
  }

  async function runPassageGuide() {
    if (!module) { setError('No Bible module selected. Set a default Bible in Settings.'); return; }
    startNew();
    const t = reference;
    setSessionTitle(t);
    setLoading(true);
    setLoadingLabel('Generating passage guide…');
    const userMsg = {
      role: 'user',
      _header: reference,
      content:
        'Please provide a comprehensive study guide for this passage. Include: (1) a brief overview of the historical and literary context, (2) a verse-by-verse analysis of key themes and interpretive notes, (3) connections to other Scripture passages, (4) practical application points, (5) a brief summary table of key terms or themes. Use markdown headings (##, ###), bullet lists, and a markdown table for the summary.',
    };
    setMessages([userMsg]);
    try {
      const context = await api.buildContext({
        sources: [{ module, reference, kind: 'bible', title: module }],
        includeAllCommentaries: true,
        includeWordStudies: false,
        noteIds: attachedNotes.map((n) => n.id),
      });
      const res = await api.askAssistant({ context, messages: toApiMessages([userMsg]), title: t });
      const assistantMsg = { role: 'assistant', content: res.reply };
      setMessages([userMsg, assistantMsg]);
      setActiveSessionId(res.sessionId);
      refreshSessions();
    } catch (e) {
      setError(e.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function runOverview({ module: mod, reference: ref }) {
    const m = mod || module;
    const r = ref || reference;
    if (!m || !r) return;
    startNew();
    const t = `${r} overview`;
    setSessionTitle(t);
    setLoading(true);
    setLoadingLabel('Thinking…');
    const userMsg = {
      role: 'user',
      _header: r,
      content: `Give a thorough overview of ${r} — draw on the commentary and word study entries included in the context.`,
    };
    setMessages([userMsg]);
    try {
      const context = await api.buildContext({
        sources: [{ module: m, reference: r, kind: 'bible', title: m }],
        includeAllCommentaries: true,
        includeWordStudies: true,
      });
      const res = await api.askAssistant({ context, messages: toApiMessages([userMsg]), title: t });
      setMessages([userMsg, { role: 'assistant', content: res.reply }]);
      setActiveSessionId(res.sessionId);
      refreshSessions();
    } catch (e) {
      setError(e.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function runPhraseStudy({ module: mod, phrase, strongsSequence }) {
    const m = mod || module;
    const isSeq = Array.isArray(strongsSequence) && strongsSequence.length > 0;
    const t = isSeq ? `"${phrase}" (original words)` : `"${phrase}"`;
    startNew();
    setActiveStudyKind('phraseStudy');
    setActiveStudyKey(phrase);
    setSessionTitle(t);
    setLoading(true);
    setLoadingLabel('Scanning the whole Bible for every occurrence — can take up to a minute the first time…');
    const userMsg = {
      role: 'user',
      _header: phrase,
      content: `Give a phrase study for "${phrase}" in ${m} (${isSeq ? 'matched by original-language words' : 'exact wording match'}).`,
    };
    setMessages([userMsg]);
    try {
      const context = await api.buildPhraseStudyContext({
        module: m,
        phrase: isSeq ? undefined : phrase,
        strongsSequence: isSeq ? strongsSequence : undefined,
        displayText: phrase,
      });
      const occNote = context.truncated
        ? `${context.occurrenceCount} of ${context.totalOccurrenceCount} occurrences (truncated)`
        : `${context.occurrenceCount} occurrence${context.occurrenceCount === 1 ? '' : 's'}`;
      const fullMsg = {
        role: 'user',
        _header: phrase,
        content: `Give a phrase study for "${phrase}" in ${m} — synthesizing patterns across ${occNote}.`,
      };
      setMessages([fullMsg]);
      setLoadingLabel('Thinking…');
      const res = await api.askPhraseStudy({ context });
      setMessages([fullMsg, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setError(e.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function runWordStudy({ module: mod, strongsKey }) {
    const m = mod || module;
    const t = `${strongsKey} word study`;
    startNew();
    setActiveStudyKind('wordStudy');
    setActiveStudyKey(strongsKey);
    setSessionTitle(t);
    setLoading(true);
    setLoadingLabel('Scanning the whole Bible for every occurrence — can take up to a minute the first time…');
    const placeholder = {
      role: 'user',
      _header: strongsKey,
      content: `Give a word study for Strong's ${strongsKey} in ${m}.`,
    };
    setMessages([placeholder]);
    try {
      const context = await api.buildWordStudyContext({ module: m, strongsKey });
      const wordLabel = context.dictionaryEntry?.transcription
        ? `${strongsKey} (${context.dictionaryEntry.transcription})`
        : strongsKey;
      const occNote = context.truncated
        ? `${context.occurrenceCount} of ${context.totalOccurrenceCount} occurrences (truncated)`
        : `${context.occurrenceCount} occurrence${context.occurrenceCount === 1 ? '' : 's'}`;
      const fullMsg = {
        role: 'user',
        _header: wordLabel,
        content: `Give a word study for Strong's ${wordLabel} in ${m} — synthesizing patterns across ${occNote}.`,
      };
      setMessages([fullMsg]);
      setSessionTitle(`${wordLabel} word study`);
      setLoadingLabel('Thinking…');
      const res = await api.askWordStudy({ context });
      setMessages([fullMsg, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setError(e.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function runDocumentChat({ documentId }) {
    startNew();
    setSessionTitle('Document study');
    setLoading(true);
    setLoadingLabel('Thinking…');
    const userMsg = {
      role: 'user',
      _header: 'Document',
      content: 'Summarize this document and highlight the most important points.',
    };
    setMessages([userMsg]);
    try {
      const context = await api.buildContext({ sources: [], documentIds: [documentId] });
      const res = await api.askAssistant({ context, messages: toApiMessages([userMsg]) });
      setMessages([userMsg, { role: 'assistant', content: res.reply }]);
      setActiveSessionId(res.sessionId);
      refreshSessions();
    } catch (e) {
      setError(e.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
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
        reference && module
          ? [{ module, reference, kind: 'bible', title: module }]
          : [];
      const context =
        sources.length > 0
          ? await api.buildContext({ sources, noteIds: attachedNotes.map((n) => n.id) })
          : { passages: [], notes: [] };
      const res = await api.askAssistant({
        context,
        messages: toApiMessages(nextMessages),
        sessionId: sessionIdRef.current,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      if (!sessionIdRef.current) {
        setActiveSessionId(res.sessionId);
        refreshSessions();
      }
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
        reference: reference || null,
        module: module || null,
        tags: ['assistant'],
        fromAssistant: true,
      });
      setSavedIdx(idx);
      setTimeout(() => setSavedIdx((i) => (i === idx ? null : i)), 1500);
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveAsDictEntry(content, idx) {
    if (!activeStudyKey) return;
    try {
      await api.savePersonalModule({
        type: 'DICT',
        key: activeStudyKey,
        title: sessionTitle || activeStudyKey,
        body: content,
      });
      setSavedDictIdx(idx);
      setTimeout(() => setSavedDictIdx((i) => (i === idx ? null : i)), 1500);
      onPersonalDictionarySaved?.();
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

  const hasGuide = messages.some((m) => m.role === 'assistant');
  const displayTitle = sessionTitle || 'Passage Guide';

  const filteredSessions = sessions.filter((s) => {
    const q = sessionSearch.toLowerCase();
    return !q || (s.title || s.reference || '').toLowerCase().includes(q);
  });

  if (!isLoggedIn) {
    return (
      <div className="flex h-full items-center justify-center bg-page px-6 text-center text-sm text-pageMuted">
        Sign in to use Passage Guide.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-pageBorder px-3 py-2">
        {/* Session selector */}
        <div className="relative min-w-0 flex-1">
          <button
            onClick={() => { setDropdownOpen((v) => !v); setSessionSearch(''); }}
            className="flex w-full items-center gap-1 rounded border border-pageBorder px-2 py-1 font-mono text-xs text-pageText hover:border-brass"
          >
            <span className="min-w-0 flex-1 truncate text-left">{displayTitle}</span>
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
                    placeholder="Search guides…"
                    className="w-full rounded border border-pageBorder bg-[#E5DCC8] px-2 py-1 text-xs text-pageText placeholder:text-pageMuted focus:border-brass focus:outline-none"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <button
                    onClick={startNew}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-brass hover:bg-[#E5DCC8]"
                  >
                    + New Guide
                  </button>
                  {filteredSessions.length > 0 && (
                    <div className="border-t border-pageBorder">
                      {filteredSessions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => resumeSession(s)}
                          className={`block w-full px-3 py-2 text-left text-xs ${
                            s.id === activeSessionId ? 'text-brass' : 'text-pageText hover:bg-[#E5DCC8]'
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
            onClick={() => { setRenaming(true); setRenameValue(displayTitle); }}
            className="shrink-0 text-xs text-pageMuted hover:text-pageText"
            title="Rename"
          >
            ✎
          </button>
        )}

        <button
          onClick={startNew}
          className="shrink-0 rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-brass hover:text-pageText"
          title="New guide"
        >
          +
        </button>
      </div>

      {/* ── Rename bar ─────────────────────────────────────────────────── */}
      {renaming && (
        <div className="flex shrink-0 items-center gap-2 border-b border-pageBorder px-3 py-1.5">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="min-w-0 flex-1 rounded border border-pageBorder bg-[#E5DCC8] px-2 py-1 font-mono text-xs text-pageText focus:border-brass focus:outline-none"
          />
          <button onClick={commitRename} className="shrink-0 text-xs text-brass hover:text-pageText">Save</button>
          <button onClick={() => setRenaming(false)} className="shrink-0 text-xs text-pageMuted hover:text-pageText">✕</button>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {!hasGuide && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-display text-base text-pageMuted">
            Ask a question, or generate a full study guide for{' '}
            <span className="font-semibold text-pageText">{reference}</span>.
          </p>
          <button
            onClick={runPassageGuide}
            className="rounded bg-brass px-5 py-2 text-sm font-medium text-ink hover:bg-brass/90"
          >
            Generate Guide
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {/* ── Initial loading spinner ─────────────────────────────────────── */}
      {!hasGuide && loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pageBorder border-t-brass" />
          <p className="font-display text-base text-pageMuted">{loadingLabel}</p>
        </div>
      )}

      {/* ── Message list ───────────────────────────────────────────────── */}
      {hasGuide && (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {messages.map((m, i) => {
            if (m.role === 'user' && m._header) {
              // Subtle divider showing what this study is about
              return (
                <div key={i} className="mb-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-pageBorder" />
                  <span className="font-mono text-xs text-pageMuted">{m._header}</span>
                  <div className="h-px flex-1 bg-pageBorder" />
                </div>
              );
            }
            if (m.role === 'user') {
              return (
                <div key={i} className="mb-5 flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#DDD5BC] px-4 py-2.5 font-display text-sm text-pageText">
                    {m.content}
                  </div>
                </div>
              );
            }
            // Assistant — full-width, same rendering as old PassageGuidePane
            return (
              <div key={i} className="group mb-6">
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(m.content) }} />
                <div className="mt-1 flex gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => saveAsNote(m.content, i)}
                    className="text-xs text-pageMuted hover:text-brass"
                  >
                    {savedIdx === i ? '✓ saved' : 'save as note'}
                  </button>
                  {activeStudyKind && activeStudyKey && (
                    <button
                      onClick={() => saveAsDictEntry(m.content, i)}
                      className="text-xs text-pageMuted hover:text-brass"
                      title="Save to My Word Studies dictionary"
                    >
                      {savedDictIdx === i ? '✓ saved to My Word Studies' : 'save to My Word Studies'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="mb-4 flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-pageBorder border-t-brass" />
              <p className="font-display text-sm text-pageMuted">{loadingLabel}</p>
            </div>
          )}
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────────────── */}
      {!loading && (
        <div className="shrink-0 border-t border-pageBorder px-4 py-2">
          {/* Context + attach notes on one line */}
          <div className="mb-1.5 flex items-center gap-2">
            {reference && module && (
              <span className="min-w-0 flex-1 truncate text-xs text-pageMuted">{module} · {reference}</span>
            )}
            <button
              onClick={() => setShowNotePicker((v) => !v)}
              className="shrink-0 text-xs text-verdigris hover:text-brass"
            >
              {showNotePicker ? 'hide notes' : 'attach notes'}
              {attachedNotes.length > 0 && ` (${attachedNotes.length})`}
            </button>
          </div>

          {/* Attached note chips */}
          {attachedNotes.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {attachedNotes.map((n) => (
                <span key={n.id} className="flex items-center gap-1 rounded border border-pageBorder px-2 py-0.5 text-xs text-pageText">
                  {n.title || 'Untitled'}
                  <button onClick={() => toggleAttachNote(n)} className="text-pageMuted hover:text-red-500">✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Note picker dropdown */}
          {showNotePicker && (
            <div className="mb-1.5 rounded border border-pageBorder bg-[#E5DCC8] p-2">
              <input
                value={noteQuery}
                onChange={(e) => searchNotes(e.target.value)}
                placeholder="Search notes…"
                className="mb-1.5 w-full rounded border border-pageBorder bg-page px-2 py-1 text-xs text-pageText placeholder:text-pageMuted focus:outline-none"
              />
              <div className="max-h-24 overflow-y-auto">
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

          <div className="flex items-end gap-2 rounded-lg border border-pageBorder bg-[#E5DCC8] px-3 py-1.5 focus-within:border-brass/60">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={hasGuide ? 'Ask a follow-up question…' : `Ask anything about ${reference || 'this passage'}…`}
              className="max-h-32 min-h-[2rem] flex-1 resize-none bg-transparent font-display text-sm text-pageText placeholder:text-pageMuted focus:outline-none"
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
      )}
    </div>
  );
}

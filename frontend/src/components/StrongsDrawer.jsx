import { useEffect, useRef, useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { api } from '../api/client.js';
import { decodeRobinsonMorph } from '../utils/robinsonMorphology.js';

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 520;
const DEFAULT_HEIGHT = 220;

function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent.replace(/\s+/g, ' ').trim();
}

function CopyButton({ label, onCopy, copied }) {
  return (
    <button
      onClick={onCopy}
      title={`Copy ${label} entry`}
      className="ml-auto shrink-0 rounded p-0.5 text-pageMuted/40 transition-colors hover:text-pageMuted"
    >
      {copied ? <Check size={11} className="text-verdigris" /> : <Copy size={11} />}
    </button>
  );
}

function SourceSection({ label, headerAction, children }) {
  return (
    <div className="border-t border-pageBorder/50 pt-2 first:border-t-0 first:pt-0">
      <div className="mb-1 flex items-center gap-1.5">
        <p className="text-[10px] uppercase tracking-widest text-pageMuted">{label}</p>
        {headerAction}
      </div>
      {children}
    </div>
  );
}

export default function StrongsDrawer({
  strongsKey,
  morph,
  wordText,
  module,
  onClose,
  onNavigateKey,
  onOpenInDictionary,
  onSearchTopical,
  onWordStudy,
}) {
  const [history, setHistory] = useState([{ key: strongsKey, morph, wordText }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const current = history[historyIndex];
  const keys = current.key.split(',').map((k) => k.trim()).filter(Boolean);
  const morphCodes = current.morph ? current.morph.split(/\s+/).map((m) => m.replace(/^[a-z]+:/i, '')) : [];
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLexicons, setExpandedLexicons] = useState(new Set());
  const [drawerHeight, setDrawerHeight] = useState(DEFAULT_HEIGHT);
  const [copied, setCopied] = useState(null); // "key:source" string

  useEffect(() => {
    setHistory([{ key: strongsKey, morph, wordText }]);
    setHistoryIndex(0);
    setExpandedLexicons(new Set());
  }, [strongsKey]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.allSettled(keys.map((k) => api.getStrongsEntry(k).then((entry) => ({ key: k, entry }))))
      .then((results) => {
        const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
        if (fulfilled.length === 0 && results.length > 0) {
          setError(results[0].reason?.message ?? 'No entry found');
        } else {
          setEntries(fulfilled);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.key]);

  function navigateToKey(key) {
    const truncated = history.slice(0, historyIndex + 1);
    setHistory([...truncated, { key, morph: undefined, wordText: undefined }]);
    setHistoryIndex(truncated.length);
    onNavigateKey?.(key);
  }

  function startResize(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = drawerHeight;
    function onMove(e) {
      setDrawerHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + (startY - e.clientY))));
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  async function writeClipboard(sourceKey, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(sourceKey);
      setTimeout(() => setCopied((c) => (c === sourceKey ? null : c)), 1500);
    } catch {
      // clipboard unavailable (non-HTTPS or denied)
    }
  }

  function copySwordsEntry(key, entry) {
    const lines = [];
    if (entry.transcription || entry.phoneticTranscription) {
      const head = [entry.transcription, entry.phoneticTranscription && `(${entry.phoneticTranscription})`]
        .filter(Boolean).join(' ');
      lines.push(head);
    }
    if (entry.definition) lines.push(entry.definition);
    writeClipboard(`${key}:strongs`, lines.join('\n'));
  }

  async function copyBuiltinEntry(key, lex) {
    try {
      const res = await api.getDictionaryEntry(lex.moduleCode, key);
      const plain = stripHtml(res.html || '');
      writeClipboard(`${key}:${lex.moduleCode}`, `${lex.name} — ${key}\n${plain}`);
    } catch {
      writeClipboard(`${key}:${lex.moduleCode}`, `${lex.name} — ${key}\n${lex.firstParagraph}`);
    }
  }

  return (
    <div
      className="shrink-0 flex flex-col border-t border-pageBorder/70 bg-[#D4C7A5]"
      style={{ height: drawerHeight }}
    >
      {/* Resize handle */}
      <div
        className="h-1.5 w-full shrink-0 cursor-ns-resize hover:bg-brass/30 active:bg-brass/50"
        onMouseDown={startResize}
      />

      {/* Drawer header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-pageBorder/50 px-4 py-1.5">
        {historyIndex > 0 && (
          <button
            onClick={() => {
              const i = historyIndex - 1;
              setHistoryIndex(i);
              onNavigateKey?.(history[i].key);
            }}
            title="Back"
            className="shrink-0 rounded border border-pageBorder px-1.5 py-0.5 font-mono text-xs text-pageMuted hover:border-brass hover:text-pageText"
          >
            ‹
          </button>
        )}
        <span className="font-mono text-xs uppercase tracking-wide text-verdigris">{keys.join(' + ')}</span>
        {current.wordText && <span className="text-xs text-pageMuted">— {current.wordText}</span>}
        <button onClick={onClose} className="ml-auto rounded p-0.5 text-pageMuted/60 hover:text-pageText">
          <X size={13} />
        </button>
      </div>

      {/* Drawer body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="text-xs text-pageMuted">Loading…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}

        {entries?.map(({ key, entry }, i) => {
          const morphCode = morphCodes[i];
          const morphGloss = morphCode ? decodeRobinsonMorph(morphCode) : null;
          const builtinLexicons = entry.builtinLexicons ?? [];
          const hasSword = entry.transcription || entry.definition;

          return (
            <div key={key} className={i > 0 ? 'mt-4 border-t border-pageBorder pt-4' : ''}>
              {entries.length > 1 && (
                <p className="mb-2 font-mono text-xs text-pageMuted">{key}</p>
              )}

              {morphCode && (
                <p className="mb-2 font-mono text-[10px] text-pageMuted">
                  {morphCode}
                  {morphGloss && <span className="ml-2 font-sans italic">({morphGloss})</span>}
                </p>
              )}

              <div className="space-y-2.5">
                {/* ── Strong's entry ── */}
                {hasSword && (
                  <SourceSection
                    label="Strong's"
                    headerAction={
                      <CopyButton
                        label="Strong's"
                        copied={copied === `${key}:strongs`}
                        onCopy={() => copySwordsEntry(key, entry)}
                      />
                    }
                  >
                    {(entry.transcription || entry.phoneticTranscription) && (
                      <p className="font-display text-sm text-pageText">
                        {entry.transcription}
                        {entry.phoneticTranscription && (
                          <span className="ml-1.5 text-xs text-pageMuted">({entry.phoneticTranscription})</span>
                        )}
                      </p>
                    )}
                    {entry.definition && (
                      <p className="mt-0.5 text-xs leading-relaxed text-pageText/80">{entry.definition}</p>
                    )}
                    {entry.references?.length > 0 && (
                      <div className="mt-1.5">
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-pageMuted">See also</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.references.map((ref) => (
                            <button
                              key={ref.key}
                              onClick={() => navigateToKey(ref.key)}
                              className="rounded border border-pageBorder px-2 py-0.5 font-mono text-xs text-pageText hover:border-brass hover:text-brass"
                            >
                              {ref.key}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </SourceSection>
                )}

                {/* ── Builtin lexicons (Thayer's, Vine's, …) ── */}
                {builtinLexicons.map((lex) => {
                  const snippetKey = `${key}:${lex.moduleCode}`;
                  const expanded = expandedLexicons.has(snippetKey);
                  const preview = lex.firstParagraph.length > 200 && !expanded
                    ? lex.firstParagraph.slice(0, 200) + '…'
                    : lex.firstParagraph;
                  return (
                    <SourceSection
                      key={lex.moduleCode}
                      label={lex.name}
                      headerAction={
                        <CopyButton
                          label={lex.name}
                          copied={copied === `${key}:${lex.moduleCode}`}
                          onCopy={() => copyBuiltinEntry(key, lex)}
                        />
                      }
                    >
                      {lex.lemma && (
                        <p className="font-display text-sm text-pageText">
                          {lex.lemma}
                          {lex.transliteration && (
                            <span className="ml-1.5 text-xs text-pageMuted">({lex.transliteration})</span>
                          )}
                          {lex.grammar && (
                            <span className="ml-1.5 text-xs italic text-pageMuted">{lex.grammar}</span>
                          )}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs leading-relaxed text-pageText/80">{preview}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {lex.hasMore && !expanded && (
                          <button
                            onClick={() => setExpandedLexicons((s) => new Set([...s, snippetKey]))}
                            className="text-[11px] text-pageMuted hover:text-pageText"
                          >
                            Show more ↓
                          </button>
                        )}
                        {onOpenInDictionary && (
                          <button
                            onClick={() => onOpenInDictionary(key, lex.moduleCode)}
                            className="text-[11px] text-verdigris hover:text-brass"
                          >
                            Full entry in {lex.name.split("'")[0].trim()} →
                          </button>
                        )}
                      </div>
                    </SourceSection>
                  );
                })}

                {/* ── Actions ── */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-pageBorder/30 pt-2">
                  {onSearchTopical && wordText && (
                    <button
                      onClick={() => onSearchTopical(wordText)}
                      className="text-xs text-verdigris hover:text-brass"
                    >
                      Codex: {wordText} →
                    </button>
                  )}
                  {onOpenInDictionary && hasSword && (
                    <button
                      onClick={() => onOpenInDictionary(key)}
                      className="text-xs text-verdigris hover:text-brass"
                    >
                      Open in dictionary →
                    </button>
                  )}
                  {onWordStudy && module && (
                    <button
                      onClick={() => onWordStudy(key, module)}
                      className="text-xs text-verdigris hover:text-brass"
                      title="Find every occurrence of this word across the whole Bible"
                    >
                      Word study →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

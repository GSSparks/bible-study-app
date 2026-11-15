import { useEffect, useRef, useState } from 'react';
import { Copy, Check, X, ChevronLeft, BookOpen, Search, FlaskConical } from 'lucide-react';
import { api } from '../api/client.js';
import { decodeRobinsonMorph } from '../utils/robinsonMorphology.js';

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 540;
const DEFAULT_HEIGHT = 240;

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
      className="ml-auto shrink-0 rounded p-1 text-muted/50 transition-colors hover:text-muted"
    >
      {copied ? <Check size={11} className="text-verdigris" /> : <Copy size={11} />}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-micro uppercase tracking-widest text-muted/60">{children}</p>
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
  const [copied, setCopied] = useState(null);

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
    } catch {}
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
      className="shrink-0 flex flex-col bg-ink border-t-2 border-brass/30"
      style={{ height: drawerHeight }}
    >
      {/* Resize handle */}
      <div
        className="flex shrink-0 cursor-ns-resize items-center justify-center py-1.5 group"
        onMouseDown={startResize}
      >
        <div className="h-0.5 w-8 rounded-full bg-rule transition-colors group-hover:bg-muted" />
      </div>

      {/* Header */}
      <div className="shrink-0 px-4 pb-2">
        <div className="flex items-center gap-2">
          {historyIndex > 0 && (
            <button
              onClick={() => {
                const i = historyIndex - 1;
                setHistoryIndex(i);
                onNavigateKey?.(history[i].key);
              }}
              title="Back"
              className="shrink-0 rounded p-0.5 text-muted hover:text-parchment"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {/* Key badge */}
          <span className="font-mono text-xs font-semibold tracking-wider text-brass">
            {keys.join(' · ')}
          </span>

          {current.wordText && (
            <span className="text-xs text-parchment/40">— {current.wordText}</span>
          )}

          <button
            onClick={onClose}
            className="ml-auto rounded p-1 text-muted/50 transition-colors hover:text-parchment"
          >
            <X size={13} />
          </button>
        </div>

        {/* Morphology */}
        {morphCodes.filter(Boolean).map((morphCode, i) => {
          const morphGloss = decodeRobinsonMorph(morphCode);
          return (
            <div key={i} className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-panel px-1.5 py-0.5 font-mono text-micro text-muted border border-rule/50">
                {morphCode}
              </span>
              {morphGloss && (
                <span className="text-micro italic text-muted/70">{morphGloss}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-4 shrink-0 border-t border-rule/40" />

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <p className="text-xs text-muted">Loading…</p>
        )}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {entries?.map(({ key, entry }, i) => {
          const builtinLexicons = entry.builtinLexicons ?? [];
          const hasSword = entry.transcription || entry.definition;

          return (
            <div key={key} className={i > 0 ? 'mt-5 border-t border-rule/30 pt-5' : ''}>
              {entries.length > 1 && (
                <p className="mb-2 font-mono text-xs text-muted">{key}</p>
              )}

              <div className="space-y-3">
                {/* Strong's entry */}
                {hasSword && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <SectionLabel>Strong's</SectionLabel>
                      <CopyButton
                        label="Strong's"
                        copied={copied === `${key}:strongs`}
                        onCopy={() => copySwordsEntry(key, entry)}
                      />
                    </div>

                    {(entry.transcription || entry.phoneticTranscription) && (
                      <p className="text-sm font-medium text-parchment">
                        {entry.transcription}
                        {entry.phoneticTranscription && (
                          <span className="ml-2 font-normal text-xs text-muted">
                            ({entry.phoneticTranscription})
                          </span>
                        )}
                      </p>
                    )}

                    {entry.definition && (
                      <p className="mt-1 text-xs leading-relaxed text-parchment/60">
                        {entry.definition}
                      </p>
                    )}

                    {entry.references?.length > 0 && (
                      <div className="mt-2">
                        <SectionLabel>See also</SectionLabel>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.references.map((ref) => (
                            <button
                              key={ref.key}
                              onClick={() => navigateToKey(ref.key)}
                              className="rounded border border-rule/60 px-2 py-0.5 font-mono text-xs text-muted transition-colors hover:border-brass/60 hover:text-brass"
                            >
                              {ref.key}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Builtin lexicons */}
                {builtinLexicons.map((lex) => {
                  const snippetKey = `${key}:${lex.moduleCode}`;
                  const expanded = expandedLexicons.has(snippetKey);
                  const preview = lex.firstParagraph.length > 200 && !expanded
                    ? lex.firstParagraph.slice(0, 200) + '…'
                    : lex.firstParagraph;
                  return (
                    <div key={lex.moduleCode} className="border-t border-rule/30 pt-3">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <SectionLabel>{lex.name}</SectionLabel>
                        <CopyButton
                          label={lex.name}
                          copied={copied === snippetKey}
                          onCopy={() => copyBuiltinEntry(key, lex)}
                        />
                      </div>

                      {lex.lemma && (
                        <p className="text-sm font-medium text-parchment">
                          {lex.lemma}
                          {lex.transliteration && (
                            <span className="ml-2 font-normal text-xs text-muted">
                              ({lex.transliteration})
                            </span>
                          )}
                          {lex.grammar && (
                            <span className="ml-1.5 text-xs italic text-muted">{lex.grammar}</span>
                          )}
                        </p>
                      )}

                      <p className="mt-1 text-xs leading-relaxed text-parchment/60">{preview}</p>

                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {lex.hasMore && !expanded && (
                          <button
                            onClick={() => setExpandedLexicons((s) => new Set([...s, snippetKey]))}
                            className="text-label text-muted transition-colors hover:text-parchment"
                          >
                            Show more ↓
                          </button>
                        )}
                        {onOpenInDictionary && (
                          <button
                            onClick={() => onOpenInDictionary(key, lex.moduleCode)}
                            className="text-label text-verdigris transition-colors hover:text-brass"
                          >
                            Full entry in {lex.name.split("'")[0].trim()} →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Action row */}
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-rule/30 pt-2.5">
                  {onOpenInDictionary && hasSword && (
                    <ActionChip
                      icon={<BookOpen size={11} />}
                      label="Dictionary"
                      onClick={() => onOpenInDictionary(key)}
                    />
                  )}
                  {onSearchTopical && wordText && (
                    <ActionChip
                      icon={<Search size={11} />}
                      label={`Codex: ${wordText}`}
                      onClick={() => onSearchTopical(wordText)}
                    />
                  )}
                  {onWordStudy && module && (
                    <ActionChip
                      icon={<FlaskConical size={11} />}
                      label="Word study"
                      onClick={() => onWordStudy(key, module)}
                      title="Find every occurrence of this word across the whole Bible"
                    />
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

function ActionChip({ icon, label, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 rounded border border-rule/50 px-2 py-1 text-xs text-muted transition-colors hover:border-brass/50 hover:text-brass"
    >
      {icon}
      {label}
    </button>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ExternalLink, Pencil, ScanText, Search, Sparkles, Trash2, X } from 'lucide-react';
import { api } from '../api/client.js';
import PDFBody from './PDFBody.jsx';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Renders text with all occurrences of `query` wrapped in <mark>. */
function Highlighted({ text, query }) {
  if (!query.trim()) return <span>{text}</span>;
  const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(re);
  return (
    <span>
      {parts.map((part, i) =>
        re.test(part)
          ? <mark key={i} className="rounded bg-pageAccent/25 px-0.5 text-pageText">{part}</mark>
          : part
      )}
    </span>
  );
}

/**
 * Detect whether a block of text is a heading, and at what level.
 * Returns 1 (chapter), 2 (section), or 0 (body paragraph).
 */
function detectHeadingLevel(text) {
  const t = text.trim();
  if (t.length < 2 || t.length > 120) return 0;

  // Explicit "Chapter N" / "CHAPTER N" patterns — level 1
  if (/^(CHAPTER|Chapter)\s+(\d+|[IVXLCDM]+\.?)\b/i.test(t)) return 1;
  // "Part / Book / Volume N" — level 1
  if (/^(PART|BOOK|VOLUME)\s+(\d+|[IVXLCDM]+\.?)\b/i.test(t)) return 1;
  // "Section / Article N" — level 2
  if (/^(SECTION|ARTICLE)\s+(\d+|[IVXLCDM]+\.?)\b/i.test(t)) return 2;

  // Single known front/back matter keywords
  if (/^(PREFACE|INTRODUCTION|FOREWORD|CONTENTS|APPENDIX|EPILOGUE|PROLOGUE|AFTERWORD|BIBLIOGRAPHY|ACKNOWLEDGEMENTS?|ENDNOTES?|FOOTNOTES?|INDEX)$/i.test(t)) return 1;

  // All-caps short line that reads like a title (≥2 letters, no terminal period)
  const isAllCaps = t === t.toUpperCase() && /[A-Z]{2}/.test(t);
  if (isAllCaps && t.length <= 70 && !t.endsWith('.') && !/^\d/.test(t)) return 1;

  // Numbered heading like "1." or "2.1" or "III." at the start
  if (/^(\d+\.|\d+\.\d+\.?|[IVXLCDM]+\.)\s+[A-Z]/.test(t) && t.length <= 100) return 2;

  return 0;
}

/** Parse raw extracted text into heading + paragraph blocks.
 *
 * Word docs (mammoth output): each paragraph is already its own line
 * with no wrapping — treat every non-empty line as a block.
 *
 * PDFs / antiword .doc: a single paragraph may span many wrapped lines;
 * consecutive non-empty lines are joined and blank lines are the separator.
 */
function parseBlocks(text, wordDoc = false) {
  let rawBlocks;

  if (wordDoc) {
    rawBlocks = text.split('\n').map((l) => l.trim()).filter(Boolean);
  } else {
    const lines = text.split('\n');
    rawBlocks = [];
    let current = [];
    for (const line of lines) {
      if (!line.trim()) {
        if (current.length) { rawBlocks.push(current.join(' ').trim()); current = []; }
      } else {
        current.push(line.trim());
      }
    }
    if (current.length) rawBlocks.push(current.join(' ').trim());

    // Second pass: some PDFs have a blank line after every hard-wrapped line
    // instead of only between paragraphs, producing one block per wrapped line.
    // Re-join blocks where the previous block ends without terminal punctuation
    // AND is long enough to be a wrapped line (not a short title) AND the next
    // block starts with a lowercase letter (clear mid-sentence continuation).
    const merged = [];
    for (const block of rawBlocks) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        prev.length >= 40 &&
        !/[.!?:"]\s*$/.test(prev) &&
        /^[a-z]/.test(block)
      ) {
        merged[merged.length - 1] = prev + ' ' + block;
      } else {
        merged.push(block);
      }
    }
    rawBlocks = merged;
  }

  return rawBlocks
    .filter(Boolean)
    .map((blockText, i) => {
      const level = detectHeadingLevel(blockText);
      return { id: `doc-block-${i}`, text: blockText, level };
    });
}

function slugify(text, id) {
  return `toc-${id}-${text.slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export default function DocumentReader({ documentId, isLoggedIn, isAdmin, onAskAI, onOpenInCell, onClose, onDeleted, onRenamed, collections = [] }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [showToc, setShowToc] = useState(false);

  // Rename state
  const [renaming, setRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameAuthor, setRenameAuthor] = useState('');
  const [renameCollection, setRenameCollection] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState(null);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // OCR state
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState(null);

  const searchRef = useRef(null);
  const renameTitleRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setShowToc(false);
    api.getDocument(documentId)
      .then(setDoc)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => {
    if (!doc?.extractedText || !searchQuery.trim()) { setMatchCount(0); return; }
    try {
      const re = new RegExp(escapeRegex(searchQuery), 'gi');
      setMatchCount((doc.extractedText.match(re) || []).length);
    } catch { setMatchCount(0); }
  }, [searchQuery, doc?.extractedText]);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'Escape' && showToc) setShowToc(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showToc]);

  useEffect(() => {
    if (renaming) renameTitleRef.current?.select();
  }, [renaming]);

  function startRename() {
    setRenameTitle(doc.title);
    setRenameAuthor(doc.author || '');
    setRenameCollection(doc.collection || '');
    setRenameError(null);
    setRenaming(true);
  }

  async function saveRename() {
    if (!renameTitle.trim()) { setRenameError('Title is required.'); return; }
    setRenameSaving(true);
    setRenameError(null);
    try {
      const updated = await api.updateDocument(documentId, {
        title: renameTitle.trim(),
        author: renameAuthor.trim() || null,
        collection: renameCollection.trim() || null,
      });
      setDoc(updated);
      setRenaming(false);
      onRenamed?.(updated);
    } catch (e) {
      setRenameError(e.message);
    } finally {
      setRenameSaving(false);
    }
  }

  async function handleOcr() {
    setOcrRunning(true);
    setOcrError(null);
    try {
      const updated = await api.ocrDocument(documentId);
      setDoc(updated);
    } catch (e) {
      setOcrError(e.message);
    } finally {
      setOcrRunning(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteDocument(documentId);
      onDeleted?.(documentId);
      onClose?.();
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
      setError(e.message);
    }
  }

  function scrollToBlock(anchorId) {
    setShowToc(false);
    // Small delay so the TOC closes before we scroll
    setTimeout(() => {
      const el = document.getElementById(anchorId);
      if (el && bodyRef.current) {
        const top = el.offsetTop - 24;
        bodyRef.current.scrollTo({ top, behavior: 'smooth' });
      }
    }, 50);
  }

  const isPdf = /\.pdf$/i.test(doc?.filename || '');
  const isWordDoc = /\.docx?$/i.test(doc?.filename || '');
  const blocks = useMemo(
    () => (doc?.extractedText ? parseBlocks(doc.extractedText, isWordDoc) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc?.extractedText]
  );

  const tocItems = useMemo(
    () => blocks
      .filter((b) => b.level > 0)
      .map((b) => ({ ...b, anchorId: slugify(b.text, b.id) })),
    [blocks]
  );

  // Build anchorId lookup for rendering
  const anchorMap = useMemo(() => {
    const m = {};
    tocItems.forEach((t) => { m[t.id] = t.anchorId; });
    return m;
  }, [tocItems]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      {/* Header */}
      <div className="shrink-0 border-b border-rule bg-panel">
        {renaming ? (
          <div className="px-5 py-3 space-y-2">
            <input
              ref={renameTitleRef}
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
              className="w-full rounded border border-rule bg-ink px-3 py-1.5 font-display text-lg text-parchment focus:border-brass focus:outline-none"
              placeholder="Title"
            />
            <div className="flex gap-2">
              <input
                value={renameAuthor}
                onChange={(e) => setRenameAuthor(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="flex-1 rounded border border-rule bg-ink px-3 py-1.5 text-sm text-parchment focus:border-brass focus:outline-none"
                placeholder="Author (optional)"
              />
              <input
                list="doc-collections"
                value={renameCollection}
                onChange={(e) => setRenameCollection(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="flex-1 rounded border border-rule bg-ink px-3 py-1.5 text-sm text-parchment focus:border-brass focus:outline-none"
                placeholder="Collection / tag (optional)"
              />
              {collections.length > 0 && (
                <datalist id="doc-collections">
                  {collections.map((c) => <option key={c} value={c} />)}
                </datalist>
              )}
              <button
                onClick={saveRename}
                disabled={renameSaving}
                className="flex items-center gap-1.5 rounded bg-brass/20 px-3 py-1.5 text-xs font-medium text-brass hover:bg-brass/30 disabled:opacity-50"
              >
                <Check size={12} /> {renameSaving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setRenaming(false)} className="text-xs text-muted hover:text-parchment">
                Cancel
              </button>
            </div>
            {renameError && <p className="text-xs text-red-400">{renameError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-4 px-5 py-3">
            {/* Left: title + meta */}
            <div className="min-w-0 flex-1">
              {doc && (
                <>
                  <h1 className="truncate font-display text-xl leading-tight text-parchment">{doc.title}</h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {doc.author && <span className="text-sm text-muted">{doc.author}</span>}
                    {doc.pageCount && <span className="font-mono text-xs text-muted/60">{doc.pageCount} pages</span>}
                    {doc.collection && (
                      <span className="inline-flex items-center rounded-full border border-rule bg-brass/10 px-2 py-0.5 text-[11px] text-brass/80">
                        {doc.collection}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="shrink-0 flex items-center gap-2">
              {doc && isLoggedIn && doc.extractedText && (
                <button
                  onClick={() => onAskAI?.(documentId)}
                  className="flex items-center gap-1.5 rounded border border-rule px-2.5 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
                >
                  <Sparkles size={12} /> Ask AI about this
                </button>
              )}
              {doc && isAdmin && (
                <>
                  <button
                    onClick={startRename}
                    className="flex items-center gap-1.5 rounded border border-rule px-2.5 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  {confirmDelete ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">Delete?</span>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded border border-red-400/60 px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 disabled:opacity-50"
                      >
                        {deleting ? '…' : 'Yes'}
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-parchment">
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 rounded border border-rule px-2.5 py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </>
              )}
              {!isPdf && (
                <a
                  href={api.documentFileUrl(documentId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded border border-rule px-2.5 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
                >
                  <ExternalLink size={12} /> Open file
                </a>
              )}
            </div>
          </div>
        )}

        {/* Search + TOC toolbar — only for non-PDF text documents */}
        {doc?.extractedText && !isPdf && (
          <div className="flex items-center gap-2 border-t border-rule/50 px-5 py-2">
            {tocItems.length > 0 && (
              <button
                onClick={() => setShowToc((v) => !v)}
                className={`flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs transition-colors ${
                  showToc
                    ? 'border-brass bg-brass/10 text-brass'
                    : 'border-rule text-muted hover:border-brass hover:text-parchment'
                }`}
              >
                <BookOpen size={12} />
                Contents
                <span className="font-mono text-[10px] text-muted/70">({tocItems.length})</span>
              </button>
            )}
            <div className="relative flex-1">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in document… (Ctrl+F)"
                className="w-full rounded border border-rule bg-ink/60 py-1.5 pl-8 pr-3 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-parchment">
                  <X size={13} />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className="shrink-0 text-xs text-muted">
                {matchCount === 0 ? 'No matches' : `${matchCount} match${matchCount !== 1 ? 'es' : ''}`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table of Contents panel */}
      {showToc && (
        <div className="shrink-0 border-b border-rule bg-panel/95 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl px-6 py-3">
            <div className="max-h-52 overflow-y-auto">
              <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-muted/60">
                Contents
              </p>
              <div className="space-y-0.5">
                {tocItems.map((item) => (
                  <button
                    key={item.anchorId}
                    onClick={() => scrollToBlock(item.anchorId)}
                    className={`block w-full text-left text-sm hover:text-brass transition-colors ${
                      item.level === 1
                        ? 'font-display font-medium text-parchment'
                        : 'pl-4 font-sans text-muted'
                    }`}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body — visual PDF renderer for .pdf files, text renderer for everything else */}
      {loading && <p className="min-h-0 flex-1 p-8 text-sm text-pageMuted">Loading…</p>}
      {error && <p className="min-h-0 flex-1 p-8 text-sm text-red-600">{error}</p>}

      {doc && !loading && !error && isPdf && (
        <PDFBody
          documentId={documentId}
          doc={doc}
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          onOcr={handleOcr}
          ocrRunning={ocrRunning}
          ocrError={ocrError}
          onOpenInCell={onOpenInCell}
        />
      )}

      {doc && !loading && !error && !isPdf && (
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto bg-page">
          {!doc.extractedText && (
            <div className="mx-auto max-w-3xl px-6 py-12 text-center">
              <ScanText size={32} className="mx-auto mb-3 text-pageMuted/50" strokeWidth={1} />
              <p className="mb-1 font-display text-lg text-pageText">No text available</p>
              <p className="mb-6 text-sm text-pageMuted">No selectable text was found in this document.</p>
              <div className="flex flex-col items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={handleOcr}
                    disabled={ocrRunning}
                    className="flex items-center gap-2 rounded border border-pageAccent/60 bg-pageAccent/10 px-5 py-2.5 text-sm font-medium text-pageAccent hover:bg-pageAccent/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ScanText size={15} />
                    {ocrRunning ? 'Running OCR… this may take a minute' : 'Extract text with OCR'}
                  </button>
                )}
                {ocrError && <p className="text-xs text-red-600">{ocrError}</p>}
                <a
                  href={api.documentFileUrl(documentId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-pageMuted hover:text-pageText"
                >
                  <ExternalLink size={13} /> Open file
                </a>
              </div>
            </div>
          )}

          {doc.extractedText && (
            <div className="mx-auto max-w-3xl px-6 py-8">
              <div className="font-display text-[15px] leading-relaxed text-pageText">
                {blocks.map((block) => {
                  const anchorId = anchorMap[block.id];
                  if (block.level === 1) {
                    return (
                      <h2 key={block.id} id={anchorId}
                        className="mt-10 mb-3 border-b border-pageBorder pb-2 font-display text-xl font-semibold text-pageText first:mt-0 scroll-mt-4">
                        <Highlighted text={block.text} query={searchQuery} />
                      </h2>
                    );
                  }
                  if (block.level === 2) {
                    return (
                      <h3 key={block.id} id={anchorId}
                        className="mt-7 mb-2 font-display text-base font-semibold text-pageAccent scroll-mt-4">
                        <Highlighted text={block.text} query={searchQuery} />
                      </h3>
                    );
                  }
                  return (
                    <p key={block.id} className="mb-4">
                      <Highlighted text={block.text} query={searchQuery} />
                    </p>
                  );
                })}
              </div>
              {doc.extractedText.length >= 190_000 && (
                <p className="mt-8 text-xs text-pageMuted/60">
                  Text was capped at 200,000 characters during import. The full document may contain additional content.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

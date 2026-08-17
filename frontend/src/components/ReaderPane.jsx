import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import SelectableNoteRegion from './SelectableNoteRegion.jsx';
import FootnotePopup from './FootnotePopup.jsx';
import BookChapterPicker from './BookChapterPicker.jsx';

function groupVerses(verses) {
  const segments = [];
  let prev = null;

  for (const v of verses) {
    const sameBook = prev && prev.bibleBookShortTitle === v.bibleBookShortTitle;
    const sameChapter = sameBook && prev.chapter === v.chapter;
    const contiguous = sameChapter && Number(v.absoluteVerseNr) === Number(prev.absoluteVerseNr) + 1;
    const hasTitles = v.titles && v.titles.length > 0;

    if (!contiguous || hasTitles) {
      segments.push({
        key: `${v.bibleBookShortTitle}-${v.chapter}-${v.verseNr}`,
        showHeader: !sameChapter,
        header: `${v.bibleBookShortTitle} ${v.chapter}`,
        sectionTitles: hasTitles ? v.titles : [],
        verses: [],
      });
    }
    segments[segments.length - 1].verses.push(v);
    prev = v;
  }

  return segments;
}

function extractStrongsData(target) {
  let el = target;
  for (let depth = 0; el && depth < 4; depth++, el = el.parentElement) {
    if (el.dataset?.strong) {
      return { key: el.dataset.strong, morph: el.dataset.morph || null, word: el.textContent?.trim() || null };
    }

    const href = el.getAttribute?.('href') || '';
    if (href.startsWith('strong:')) return { key: href.slice(7), morph: null, word: el.textContent?.trim() || null };

    const title = el.getAttribute?.('title') || '';
    const titleMatch = title.match(/\b([GH]\d{1,5})\b/);
    if (titleMatch) return { key: titleMatch[1], morph: null, word: el.textContent?.trim() || null };

    if (el.classList?.contains('strongs')) {
      const text = el.textContent.trim();
      if (/^[GH]\d{1,5}$/.test(text)) return { key: text, morph: null, word: null };
    }

    const ownText = el.textContent?.trim();
    if (ownText && /^[GH]\d{1,5}$/.test(ownText)) return { key: ownText, morph: null, word: null };
  }
  return null;
}

export default function ReaderPane({
  module,
  reference,
  focusMode = false,
  onNavigate,
  onStrongsClick,
  onVerseRefClick,
  onAnnotate,
  onAskAboutPassage,
}) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [footnotePopup, setFootnotePopup] = useState(null);
  const [bookPicker, setBookPicker] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [focusedVerseKey, setFocusedVerseKey] = useState(null);
  const verseRefs = useRef(new Map());

  useEffect(() => {
    if (!module || !reference) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedRange(null);

    async function load() {
      if (!focusMode) {
        const res = await api.getPassage(module, reference);
        if (!cancelled) setVerses(res.verses || []);
        return;
      }
      const anchorRes = await api.getPassage(module, reference);
      const anchor = anchorRes.verses?.[0];
      if (!anchor) {
        if (!cancelled) setVerses(anchorRes.verses || []);
        return;
      }
      const chapterRes = await api.getPassage(module, `${anchor.bibleBookShortTitle} ${anchor.chapter}`);
      if (!cancelled) {
        setVerses(chapterRes.verses || []);
        setFocusedVerseKey(`${anchor.chapter}-${anchor.verseNr}`);
      }
    }

    load()
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [module, reference, focusMode]);

  useEffect(() => {
    if (!focusMode || !focusedVerseKey) return;
    const el = verseRefs.current.get(focusedVerseKey);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusMode, focusedVerseKey, verses]);

  const indexedVerses = useMemo(() => verses.map((v, i) => ({ ...v, __index: i })), [verses]);
  const segments = useMemo(() => groupVerses(indexedVerses), [indexedVerses]);
  const first = verses[0];

  function goToChapter(delta) {
    if (!first) return;
    const nextChapter = Number(first.chapter) + delta;
    if (nextChapter < 1) return;
    onNavigate?.(focusMode ? `${first.bibleBookShortTitle} ${nextChapter}:1` : `${first.bibleBookShortTitle} ${nextChapter}`);
  }

  function handleVerseNumberClick(e, v) {
    e.stopPropagation();
    if (e.shiftKey && selectedRange) {
      setSelectedRange((prev) => ({ ...prev, focus: v.__index, x: e.clientX, y: e.clientY + 16 }));
      return;
    }
    if (focusMode) {
      onNavigate?.(`${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`);
    }
    setSelectedRange({ anchor: v.__index, focus: v.__index, x: e.clientX, y: e.clientY + 16 });
  }

  function isIndexSelected(index) {
    if (!selectedRange) return false;
    const lo = Math.min(selectedRange.anchor, selectedRange.focus);
    const hi = Math.max(selectedRange.anchor, selectedRange.focus);
    return index >= lo && index <= hi;
  }

  function getSelectedReference() {
    if (!selectedRange) return null;
    const lo = Math.min(selectedRange.anchor, selectedRange.focus);
    const hi = Math.max(selectedRange.anchor, selectedRange.focus);
    const startV = verses[lo];
    const endV = verses[hi];
    if (!startV || !endV) return null;
    if (startV.bibleBookShortTitle === endV.bibleBookShortTitle && startV.chapter === endV.chapter) {
      return lo === hi
        ? `${startV.bibleBookShortTitle} ${startV.chapter}:${startV.verseNr}`
        : `${startV.bibleBookShortTitle} ${startV.chapter}:${startV.verseNr}-${endV.verseNr}`;
    }
    return `${startV.bibleBookShortTitle} ${startV.chapter}:${startV.verseNr}-${endV.chapter}:${endV.verseNr}`;
  }

  function handleAskAboutSelection() {
    const selectedRef = getSelectedReference();
    if (!selectedRef) return;
    onAskAboutPassage?.(module, selectedRef);
    setSelectedRange(null);
  }

  function handleContentClick(e) {
    const footnoteEl = e.target.closest('.footnote-marker');
    if (footnoteEl) {
      setFootnotePopup({ text: footnoteEl.dataset.note, x: e.clientX, y: e.clientY });
      return;
    }
    const xrefEl = e.target.closest('.xref-marker');
    if (xrefEl) {
      onVerseRefClick?.(xrefEl.dataset.refs, e);
      return;
    }
    const verseRefEl = e.target.closest('.verse-ref');
    if (verseRefEl) {
      onVerseRefClick?.(verseRefEl.dataset.ref, e);
      return;
    }
    if (!onStrongsClick) return;
    const result = extractStrongsData(e.target);
    if (result) onStrongsClick(result.key, e, result.morph, result.word, module);
  }

  return (
    <div className="h-full overflow-y-auto bg-page px-6 py-6 text-pageText">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="font-display text-2xl text-pageText">{reference || 'Select a passage'}</h1>
        {module && <span className="font-mono text-xs uppercase tracking-wide text-pageMuted">{module}</span>}
        <div className="ml-auto flex gap-2">
          {onNavigate && (
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setBookPicker({ x: rect.left, y: rect.bottom + 4 });
              }}
              className="rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
              title="Browse by book and chapter"
            >
              Browse ▾
            </button>
          )}
          {first && (
            <>
              <button
                onClick={() => goToChapter(-1)}
                className="rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
                title="Previous chapter"
              >
                ‹
              </button>
              <button
                onClick={() => goToChapter(1)}
                className="rounded border border-pageBorder px-2 py-1 text-xs text-pageMuted hover:border-pageAccent hover:text-pageText"
                title="Next chapter"
              >
                ›
              </button>
            </>
          )}
        </div>
      </header>

      {loading && <p className="text-pageMuted">Loading passage…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && verses.length > 0 && (
        <div className="flex gap-3">
          <button
            className="marginalia-tick mt-2 shrink-0 cursor-pointer"
            title="Add a note or highlight on this passage"
            onClick={() => onAnnotate?.(reference)}
            aria-label="Annotate this passage"
          />
          <SelectableNoteRegion
            reference={reference}
            module={module}
            className="verse-content max-w-2xl flex-1 space-y-4 font-display text-base leading-relaxed text-pageText"
            onClick={handleContentClick}
          >
            {segments.map((seg, i) => (
              <div key={seg.key}>
                {seg.showHeader ? (
                  <h2 className="mb-1 font-sans text-xs uppercase tracking-wide text-verdigris">{seg.header}</h2>
                ) : (
                  i > 0 && seg.sectionTitles.length === 0 && <div className="mb-1 text-xs text-pageMuted">⋯</div>
                )}
                {seg.sectionTitles.length > 0 && (
                  <h3 className="mb-2 mt-1 font-display text-lg italic text-pageAccent">{seg.sectionTitles.join(' — ')}</h3>
                )}
                <p>
                  {seg.verses.map((v) => {
                    const verseKey = `${v.chapter}-${v.verseNr}`;
                    const isFocused = focusMode && verseKey === focusedVerseKey;
                    return (
                      <span
                        key={verseKey}
                        ref={(el) => {
                          if (el) verseRefs.current.set(verseKey, el);
                          else verseRefs.current.delete(verseKey);
                        }}
                        className={[
                          isIndexSelected(v.__index) ? 'rounded bg-pageAccent/20' : '',
                          isFocused ? 'border-l-2 border-pageAccent bg-pageAccent/10 pl-1' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <sup
                          className="mr-1 cursor-pointer text-xs text-pageAccent hover:text-brass"
                          title={focusMode ? 'Click to focus this verse, shift-click to select a range' : 'Click to select, shift-click to select a range'}
                          onClick={(e) => handleVerseNumberClick(e, v)}
                        >
                          {v.verseNr}
                        </sup>
                        <span dangerouslySetInnerHTML={{ __html: v.content }} />{' '}
                      </span>
                    );
                  })}
                </p>
              </div>
            ))}
          </SelectableNoteRegion>
        </div>
      )}

      {!loading && !error && verses.length === 0 && reference && (
        <p className="text-pageMuted">No text returned for this reference in {module}.</p>
      )}

      {selectedRange &&
        onAskAboutPassage &&
        createPortal(
          <>
            <div className="fixed inset-0 z-30" onClick={() => setSelectedRange(null)} />
            <div
              className="fixed z-40 flex items-center gap-1 rounded-md border border-rule bg-panel p-1 shadow-2xl"
              style={{ left: selectedRange.x, top: selectedRange.y }}
            >
              <span className="px-1 font-mono text-xs text-muted">{getSelectedReference()}</span>
              <button
                onClick={handleAskAboutSelection}
                className="rounded bg-brass px-2 py-1 text-xs font-medium text-ink hover:bg-brass/90"
              >
                Ask about this →
              </button>
              <button
                onClick={() => setSelectedRange(null)}
                className="rounded px-1.5 py-1 text-xs text-muted hover:text-parchment"
              >
                ✕
              </button>
            </div>
          </>,
          document.body
        )}

      {bookPicker && (
        <BookChapterPicker
          x={bookPicker.x}
          y={bookPicker.y}
          onSelectChapter={(chapterRef) => onNavigate?.(focusMode ? `${chapterRef}:1` : chapterRef)}
          onClose={() => setBookPicker(null)}
        />
      )}

      {footnotePopup && (
        <FootnotePopup
          text={footnotePopup.text}
          x={footnotePopup.x}
          y={footnotePopup.y}
          onClose={() => setFootnotePopup(null)}
        />
      )}
    </div>
  );
}
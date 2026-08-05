import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import SelectableNoteRegion from './SelectableNoteRegion.jsx';
import FootnotePopup from './FootnotePopup.jsx';

/** Groups a flat verse list into readable segments: a new header whenever
 * the book or chapter changes, a plain divider (no header repeat) when
 * the same chapter has a non-contiguous jump — e.g. "John 3:16,18" or
 * the boundary between "John 3:16-18" and "Romans 8:28" in a
 * comma-separated selection — and also a new segment (no divider this
 * time, a real section-title heading instead) whenever a verse carries
 * extracted chapter/section titles, even mid-chapter. */
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

/** Extracts a Strong's key from a click inside rendered verse content.
 * The backend normalizes every Strong's-tagged word (confirmed against
 * real KJV+Strong's+morphology output — see
 * swordService.normalizeStrongsMarkup) into a consistent `data-strong`
 * attribute, so the first check below is the one that fires for
 * essentially every tagged word. The rest are kept as a fallback for
 * anything unusual. */
function extractStrongsKey(target) {
  let el = target;
  for (let depth = 0; el && depth < 4; depth++, el = el.parentElement) {
    if (el.dataset?.strong) return el.dataset.strong;

    const href = el.getAttribute?.('href') || '';
    if (href.startsWith('strong:')) return href.slice(7);

    const title = el.getAttribute?.('title') || '';
    const titleMatch = title.match(/\b([GH]\d{1,5})\b/);
    if (titleMatch) return titleMatch[1];

    if (el.classList?.contains('strongs')) {
      const text = el.textContent.trim();
      if (/^[GH]\d{1,5}$/.test(text)) return text;
    }

    const ownText = el.textContent?.trim();
    if (ownText && /^[GH]\d{1,5}$/.test(ownText)) return ownText;
  }
  return null;
}

export default function ReaderPane({ module, reference, onNavigate, onStrongsClick, onVerseRefClick, onAnnotate }) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [footnotePopup, setFootnotePopup] = useState(null); // { text, x, y } — purely local, no fetch needed

  useEffect(() => {
    if (!module || !reference) return;
    setLoading(true);
    setError(null);
    api
      .getPassage(module, reference)
      .then((res) => setVerses(res.verses || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [module, reference]);

  const segments = useMemo(() => groupVerses(verses), [verses]);
  const first = verses[0];

  function goToChapter(delta) {
    if (!first) return;
    const nextChapter = Number(first.chapter) + delta;
    if (nextChapter < 1) return;
    onNavigate?.(`${first.bibleBookShortTitle} ${nextChapter}`);
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
    const key = extractStrongsKey(e.target);
    if (key) onStrongsClick(key, e);
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="font-display text-2xl text-parchment">{reference || 'Select a passage'}</h1>
        {module && <span className="font-mono text-xs uppercase tracking-wide text-muted">{module}</span>}
        {first && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => goToChapter(-1)}
              className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
              title="Previous chapter"
            >
              ‹
            </button>
            <button
              onClick={() => goToChapter(1)}
              className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
              title="Next chapter"
            >
              ›
            </button>
          </div>
        )}
      </header>

      {loading && <p className="text-muted">Loading passage…</p>}
      {error && <p className="text-red-400">{error}</p>}

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
            className="verse-content max-w-2xl flex-1 space-y-4 font-display text-base leading-relaxed text-parchment/90"
            onClick={handleContentClick}
          >
            {segments.map((seg, i) => (
              <div key={seg.key}>
                {seg.showHeader ? (
                  <h2 className="mb-1 font-sans text-xs uppercase tracking-wide text-verdigris">{seg.header}</h2>
                ) : (
                  i > 0 && seg.sectionTitles.length === 0 && <div className="mb-1 text-xs text-muted">⋯</div>
                )}
                {seg.sectionTitles.length > 0 && (
                  <h3 className="mb-2 mt-1 font-display text-lg italic text-brass">{seg.sectionTitles.join(' — ')}</h3>
                )}
                <p>
                  {seg.verses.map((v) => (
                    <span key={`${v.chapter}-${v.verseNr}`}>
                      <sup className="mr-1 text-xs text-brass">{v.verseNr}</sup>
                      {/* v.content includes SWORD's markup (Strong's, morphology, etc.)
                          when the module supports it — rendered as HTML rather than
                          escaped text so those tags actually work. */}
                      <span dangerouslySetInnerHTML={{ __html: v.content }} />{' '}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </SelectableNoteRegion>
        </div>
      )}

      {!loading && !error && verses.length === 0 && reference && (
        <p className="text-muted">No text returned for this reference in {module}.</p>
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

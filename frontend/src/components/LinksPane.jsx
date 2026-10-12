import { useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { api } from '../api/client.js';

function extractStrongsFromVerses(verses) {
  const seen = new Set();
  const result = [];
  const tempEl = document.createElement('div');
  for (const v of verses) {
    tempEl.innerHTML = v.content || '';
    for (const el of tempEl.querySelectorAll('[data-strong]')) {
      const keys = el.dataset.strong.split(',').map((k) => k.trim()).filter(Boolean);
      const word = el.textContent.trim();
      for (const key of keys) {
        const k = key.toUpperCase();
        if (/^[GH]\d+$/.test(k) && !seen.has(k)) {
          seen.add(k);
          result.push({ key: k, word });
        }
      }
    }
  }
  return result;
}

function toChapterRef(ref) {
  return ref ? ref.replace(/:\d+.*$/, '').trim() : ref;
}

function Section({ title, badge, open, onToggle, children }) {
  return (
    <div className="border-b border-rule last:border-b-0">
      <button
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left hover:bg-panel/50"
        onClick={onToggle}
      >
        {open
          ? <ChevronDown size={11} className="shrink-0 text-pageMuted" />
          : <ChevronRight size={11} className="shrink-0 text-pageMuted" />}
        <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-pageMuted">{title}</span>
        {badge != null && (
          <span className="ml-auto rounded-full bg-ink px-1.5 py-0.5 font-mono text-[9px] text-muted">{badge}</span>
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function LinksPane({
  focusedReference,
  defaultBibleModule,
  onStrongsClick,
  onVerseRefClick,
  isLoggedIn = false,
}) {
  const [sections, setSections] = useState({ lexicon: true, commentaries: true, notes: false });
  function toggle(key) { setSections((p) => ({ ...p, [key]: !p[key] })); }

  // ─── Lexicon ────────────────────────────────────────────────────────────────
  const [wordsInVerse, setWordsInVerse] = useState([]);
  const [strongsCache, setStrongsCache] = useState(new Map());
  const [loadingLexicon, setLoadingLexicon] = useState(false);

  useEffect(() => {
    if (!defaultBibleModule || !focusedReference) { setWordsInVerse([]); return; }
    let cancelled = false;
    setLoadingLexicon(true);
    api.getPassage(defaultBibleModule, focusedReference)
      .then(async (res) => {
        if (cancelled) return;
        const words = extractStrongsFromVerses(res.verses || []);
        setWordsInVerse(words);
        const missing = words.map((w) => w.key).filter((k) => !strongsCache.has(k));
        if (missing.length === 0) { setLoadingLexicon(false); return; }
        const results = await Promise.allSettled(missing.map((k) => api.getStrongsEntry(k).then((e) => [k, e])));
        if (cancelled) return;
        setStrongsCache((prev) => {
          const next = new Map(prev);
          for (const r of results) {
            if (r.status === 'fulfilled') next.set(r.value[0], r.value[1]);
          }
          return next;
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingLexicon(false); });
    return () => { cancelled = true; };
  }, [focusedReference, defaultBibleModule]);

  // ─── Commentaries ───────────────────────────────────────────────────────────
  const [commentaryModules, setCommentaryModules] = useState([]);
  const [expandedMods, setExpandedMods] = useState(new Set());
  const [commentaryData, setCommentaryData] = useState(new Map()); // code → {verses, loading, error}
  const loadedForRef = useRef(new Map()); // code → reference string when data was fetched

  useEffect(() => {
    api.listInstalledModules('COMMENTARY').then(setCommentaryModules).catch(() => {});
  }, []);

  function loadCommentary(code, reference) {
    if (loadedForRef.current.get(code) === reference) return;
    loadedForRef.current.set(code, reference);
    setCommentaryData((prev) => new Map(prev).set(code, { verses: [], loading: true, error: null }));
    api.getPassage(code, reference)
      .then((res) => setCommentaryData((prev) => new Map(prev).set(code, { verses: res.verses || [], loading: false, error: null })))
      .catch((e) => setCommentaryData((prev) => new Map(prev).set(code, { verses: [], loading: false, error: e.message })));
  }

  function toggleCommentary(code) {
    setExpandedMods((prev) => {
      const next = new Set(prev);
      if (next.has(code)) { next.delete(code); } else { next.add(code); }
      return next;
    });
  }

  // Probe every module when the reference changes so we know which ones have
  // content before the user tries to expand them. The loadedForRef guard makes
  // this a no-op for anything already fetched for this reference.
  useEffect(() => {
    if (!focusedReference || commentaryModules.length === 0) return;
    for (const mod of commentaryModules) {
      loadCommentary(mod.name, focusedReference);
    }
  }, [focusedReference, commentaryModules]);

  // Only surface modules that either are still loading or have actual content —
  // silently drop anything that came back empty.
  const visibleCommentaries = commentaryModules.filter((mod) => {
    const data = commentaryData.get(mod.name);
    return !data || data.loading || data.verses.length > 0;
  });

  // ─── Notes ──────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!isLoggedIn || !focusedReference) return;
    api.listNotes({ reference: toChapterRef(focusedReference) }).then(setNotes).catch(() => {});
  }, [focusedReference, isLoggedIn]);

  // ─── Commentary content click handler ───────────────────────────────────────
  function handleCommentaryClick(e) {
    const linkEl = e.target.closest('a[href]');
    if (linkEl) { e.preventDefault(); return; }
    const xrefEl = e.target.closest('.xref-marker');
    if (xrefEl) { onVerseRefClick?.(xrefEl.dataset.refs, e); return; }
    const verseRefEl = e.target.closest('.verse-ref');
    if (verseRefEl) { onVerseRefClick?.(verseRefEl.dataset.ref, e); return; }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (!focusedReference) {
    return (
      <div className="flex h-full items-center justify-center bg-page text-sm text-pageMuted">
        Navigate to a passage to see resource links.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-page text-pageText">
      <div className="border-b border-rule px-3 py-1.5">
        <p className="font-mono text-xs text-pageMuted">{focusedReference}</p>
      </div>

      {/* ── Lexicon ── */}
      <Section
        title="Lexicon"
        badge={wordsInVerse.length > 0 ? wordsInVerse.length : null}
        open={sections.lexicon}
        onToggle={() => toggle('lexicon')}
      >
        {loadingLexicon && <p className="px-3 py-2 text-xs text-pageMuted">Loading…</p>}
        {!loadingLexicon && wordsInVerse.length === 0 && (
          <p className="px-3 py-2 text-xs text-pageMuted">No tagged words in this passage.</p>
        )}
        <div className="divide-y divide-rule/20">
          {wordsInVerse.map(({ key, word }) => {
            const entry = strongsCache.get(key);
            const gloss = entry?.definition
              ? entry.definition.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
              : null;
            return (
              <button
                key={key}
                className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left hover:bg-panel/40"
                onClick={(e) => onStrongsClick?.(key, e, null, word, defaultBibleModule)}
              >
                <span className="w-10 shrink-0 font-mono text-[10px] text-verdigris">{key}</span>
                <span className="font-display text-sm text-pageText">{word}</span>
                {entry?.transcription && (
                  <span className="shrink-0 font-display text-xs italic text-pageMuted">{entry.transcription}</span>
                )}
                {gloss && (
                  <span className="ml-auto max-w-[45%] truncate text-right text-[10px] text-pageMuted">{gloss}</span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Commentaries ── */}
      <Section
        title="Commentaries"
        badge={visibleCommentaries.length > 0 ? visibleCommentaries.length : null}
        open={sections.commentaries}
        onToggle={() => toggle('commentaries')}
      >
        {visibleCommentaries.length === 0 && (
          <p className="px-3 py-2 text-xs text-pageMuted">No commentaries for this passage.</p>
        )}
        <div className="divide-y divide-rule/10">
          {visibleCommentaries.map((mod) => {
            const code = mod.name;
            const isExpanded = expandedMods.has(code);
            const data = commentaryData.get(code);
            return (
              <div key={code}>
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-panel/40"
                  onClick={() => toggleCommentary(code)}
                >
                  {isExpanded
                    ? <ChevronDown size={11} className="shrink-0 text-pageMuted" />
                    : <ChevronRight size={11} className="shrink-0 text-pageMuted" />}
                  <span className="flex-1 text-xs text-pageText">{mod.description || code}</span>
                  <span className="font-mono text-[9px] text-pageMuted/60">{code}</span>
                </button>
                {isExpanded && (
                  <div className="bg-page/40 px-4 pb-3 pt-1" onClick={handleCommentaryClick}>
                    {data?.loading && <p className="text-xs text-pageMuted">Loading…</p>}
                    {data?.error && <p className="text-xs text-red-500">{data.error}</p>}
                    {data && !data.loading && !data.error && data.verses.length === 0 && (
                      <p className="text-xs italic text-pageMuted">No entry for this passage.</p>
                    )}
                    {data?.verses?.map((v, i) => (
                      <div
                        key={i}
                        className="markdown-body markdown-body-page mb-2 font-display text-sm leading-relaxed text-pageText"
                        dangerouslySetInnerHTML={{ __html: v.content }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Notes ── */}
      {isLoggedIn && (
        <Section
          title="Notes"
          badge={notes.length > 0 ? notes.length : null}
          open={sections.notes}
          onToggle={() => toggle('notes')}
        >
          {notes.length === 0 && (
            <p className="px-3 py-2 text-xs text-pageMuted">No notes for this passage.</p>
          )}
          <div className="divide-y divide-rule/20">
            {notes.map((note) => (
              <div key={note.id} className="px-3 py-2">
                <p className="font-mono text-[10px] text-verdigris">{note.reference}</p>
                {note.body && (
                  <p className="mt-0.5 line-clamp-3 text-xs text-pageText/70">
                    {note.body.replace(/[#*_`[\]]/g, '').slice(0, 200)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

import NodeSwordInterface from 'node-sword-interface';
import { config } from '../config.js';
import { toOsis, splitOsisSequence, isRange, findReferencesInText } from './referenceParser.js';

/**
 * Thin wrapper around node-sword-interface, matching its real API as
 * documented at:
 *   https://github.com/ezra-bible-app/node-sword-interface/blob/master/API.md
 *
 * A couple of things worth knowing about that library's shape, since
 * they're easy to get wrong:
 *   - ModuleObject's identifier field is `.name`, NOT `.code`.
 *   - There is no "give me a passage by human-readable string" method.
 *     You resolve the string to an OSIS key yourself (see
 *     referenceParser.js).
 *   - The API docs only explicitly say enableMarkup() affects
 *     getChapterText / getBookText / getBibleText — NOT
 *     getVersesFromReferences. So getPassage below is built on
 *     getChapterText (sliced to the requested verses) rather than
 *     getVersesFromReferences, specifically so Strong's/markup tags are
 *     reliably present for the word-click feature.
 */
class SwordService {
  constructor() {
    // First constructor arg is the custom home directory for SWORD data.
    this.sword = new NodeSwordInterface(config.swordModulesPath);
    this._repoConfigLoaded = false;
    // Renders Strong's numbers, morphology, footnotes, etc. as inline
    // HTML markup instead of stripping them. This is what makes the
    // word-click Strong's lookup possible.
    try {
      this.sword.enableMarkup();
    } catch (err) {
      console.warn('enableMarkup() failed — Strong\'s word-click will not work:', err.message);
    }
  }

  async _ensureRepoConfig() {
    if (this._repoConfigLoaded) return;
    const exists = this.sword.repositoryConfigExisting();
    if (!exists) {
      await this.sword.updateRepositoryConfig();
    }
    this._repoConfigLoaded = true;
  }

  async listRepositories() {
    await this._ensureRepoConfig();
    return this.sword.getRepoNames();
  }

  async listAvailableModules(repoName, moduleType = 'BIBLE') {
    await this._ensureRepoConfig();
    return this.sword.getAllRepoModules(repoName, moduleType);
  }

  listInstalledModules(moduleType = 'BIBLE') {
    return this.sword.getAllLocalModules(moduleType);
  }

  async installModule(repoName, moduleCode, onProgress) {
    await this._ensureRepoConfig();
    return this.sword.installModule(repoName, moduleCode, (progress) => {
      if (onProgress) onProgress(progress);
    });
  }

  async removeModule(moduleCode) {
    return this.sword.uninstallModule(moduleCode);
  }

  /** Splits a verse-precise OSIS point ("John.3.16") into parts. Book
   *  codes never contain a dot, so this is always exactly 3 segments. */
  _parseOsisPoint(point) {
    const parts = point.split('.');
    const verse = Number(parts.pop());
    const chapter = Number(parts.pop());
    const book = parts.join('.');
    return { book, chapter, verse };
  }

  /**
   * Fetch a passage from a human-typed reference. Handles single verses
   * ("John 3:16"), ranges ("Romans 8:28-30"), whole chapters ("John 3"),
   * whole books ("Jude"), and comma-separated sequences of any of the
   * above ("John 3:16, Romans 8:28-30, Jude"). Returns a flat array of
   * VerseObjects, with markup/Strong's tags included in `.content`.
   */
  getPassage(moduleCode, humanReference) {
    const osis = toOsis(humanReference);
    if (!osis) {
      const err = new Error(`Could not parse "${humanReference}" as a Bible reference`);
      err.status = 400;
      throw err;
    }

    const items = splitOsisSequence(osis);
    const verses = [];
    // Avoid re-fetching the same chapter twice within one call (e.g.
    // "John 3:16,18" hits John 3 twice).
    const chapterCache = new Map();
    const getChapter = (book, chapter) => {
      const key = `${book}.${chapter}`;
      if (!chapterCache.has(key)) {
        chapterCache.set(key, this.sword.getChapterText(moduleCode, book, chapter));
      }
      return chapterCache.get(key);
    };

    for (const item of items) {
      if (isRange(item)) {
        const [startStr, endStr] = item.split('-');
        const start = this._parseOsisPoint(startStr);
        const end = this._parseOsisPoint(endStr);

        if (start.book !== end.book) {
          // Cross-book ranges ("John-Acts") are rare and don't fit the
          // per-chapter slicing approach; fall back to the library's own
          // range expansion for this one item (won't carry markup as
          // reliably, but keeps it working rather than failing outright).
          const refs = this.sword.getReferencesFromReferenceRange(item);
          verses.push(...this.sword.getVersesFromReferences(moduleCode, refs));
          continue;
        }

        for (let c = start.chapter; c <= end.chapter; c++) {
          const chapterVerses = getChapter(start.book, c);
          const lower = c === start.chapter ? start.verse : 1;
          const upper = c === end.chapter ? end.verse : Infinity;
          verses.push(...chapterVerses.filter((v) => Number(v.verseNr) >= lower && Number(v.verseNr) <= upper));
        }
      } else {
        const p = this._parseOsisPoint(item);
        const chapterVerses = getChapter(p.book, p.chapter);
        const match = chapterVerses.find((v) => Number(v.verseNr) === p.verse);
        if (match) verses.push(match);
      }
    }

    return verses.map((v) => {
      const withoutMilestones = this.stripMilestones(v.content);
      const { titles, html: withoutTitles } = this.extractTitles(withoutMilestones);
      return { ...v, content: this.processHtml(withoutTitles), titles };
    });
  }

  /** OSIS marks chapter/verse boundaries with milestone tags — either
   *  genuinely self-closing (`<chapter osisID="John.3" sID="..."/>`) or,
   *  confirmed from real output, rendered as an empty `<span
   *  class="sword-x-milestone" .../></span>`. Either way it's pure
   *  structural metadata with no display content, so both forms get
   *  stripped entirely. */
  stripMilestones(html) {
    return html
      .replace(/<(?:chapter|verse)\b[^>]*\/>/gi, '')
      .replace(/<span\b[^>]*\bclass="[^"]*\bsword-x-milestone\b[^"]*"[^>]*><\/span>/gi, '');
  }

  /**
   * Finds `<span ...class="... {classToken} ...">...</span>` elements,
   * correctly balancing nested `<span>` tags to locate each one's TRUE
   * matching close. This matters because SWORD reuses `<span>` for
   * everything — Strong's words, verse-ref links, section titles, cross-
   * reference notes — so a naive non-greedy match to the *next*
   * `</span>` would stop at a nested span's closing tag instead of the
   * outer element's own (confirmed as a real failure mode: a
   * cross-reference note can end up containing an already-wrapped
   * verse-ref span from an earlier pipeline step). Calls
   * `replacer(attrs, innerHtml)` for each match; a `null` return leaves
   * that element untouched.
   */
  replaceBalancedSpans(html, classToken, replacer) {
    const openTagRe = new RegExp(`<span\\b([^>]*\\bclass="[^"]*\\b${classToken}\\b[^"]*"[^>]*)>`, 'gi');
    const spans = [];
    let match;
    while ((match = openTagRe.exec(html))) {
      const contentStart = match.index + match[0].length;
      const tagRe = /<span\b[^>]*>|<\/span>/gi;
      tagRe.lastIndex = contentStart;
      let depth = 1;
      let tagMatch;
      let contentEnd = -1;
      let matchEnd = -1;
      while ((tagMatch = tagRe.exec(html))) {
        if (tagMatch[0].toLowerCase() === '</span>') {
          depth--;
          if (depth === 0) {
            contentEnd = tagMatch.index;
            matchEnd = tagMatch.index + tagMatch[0].length;
            break;
          }
        } else {
          depth++;
        }
      }
      if (contentEnd === -1) continue; // unbalanced/malformed — skip rather than corrupt
      spans.push({ start: match.index, end: matchEnd, attrs: match[1], inner: html.slice(contentStart, contentEnd) });
      openTagRe.lastIndex = matchEnd;
    }

    if (spans.length === 0) return html;
    let out = '';
    let cursor = 0;
    for (const s of spans) {
      out += html.slice(cursor, s.start);
      const replacement = replacer(s.attrs, s.inner);
      out += replacement === null ? html.slice(s.start, s.end) : replacement;
      cursor = s.end;
    }
    out += html.slice(cursor);
    return out;
  }

  /**
   * Extracts chapter/section headings ("CHAPTER 3", "The New Birth") out
   * of the inline verse text and returns them separately, rather than
   * leaving them jammed together with the reading text ("CHAPTER 3The
   * New Birth Now there was a man..."). The frontend renders these as
   * actual headings above the verse instead.
   *
   * Targets `<span class="sword-section-title">` — confirmed from real
   * output, and notably *not* an OSIS `<title>` tag, which is what an
   * earlier version of this function assumed and which real output
   * never contains at all: node-sword-interface pre-converts OSIS
   * `<title>` into this span/class form before handing content back
   * (unlike `<w>` and `<reference>`, which do pass through with their
   * original OSIS tag names — an inconsistency in SWORD's own rendering,
   * not a guess on this end). A chapter-level heading carries both
   * `sword-chapter-title` and `sword-section-title`; a plain section
   * heading just the latter, so matching on `sword-section-title` alone
   * catches both.
   */
  extractTitles(html) {
    const titles = [];
    const cleaned = this.replaceBalancedSpans(html, 'sword-section-title', (attrs, inner) => {
      const text = this.stripHtml(inner).trim();
      if (text) titles.push(text);
      return '';
    });
    return { titles, html: cleaned };
  }

  /**
   * Normalizes Strong's-tagged words into one guaranteed-consistent
   * format: `<span class="strongs" data-strong="G2316">word</span>`.
   *
   * This is now based on real output from a KJV+Strong's+morphology
   * module (not spec speculation): SWORD renders each tagged word as
   * `<w class="strong:G3588 strong:G2316 lemma.TR:ο lemma.TR:θεος"
   * morph="robinson:T-NSM robinson:N-NSM" src="4 5">God</w>` — the
   * Strong's number(s) live in the `class` attribute as `strong:G1234`
   * tokens (not a `lemma`/`savlm` attribute at all, and the "lemma.TR:"
   * tokens in that same class attribute are the underlying Greek/Hebrew
   * text, unrelated to the OSIS `lemma` *attribute* convention this
   * function originally — wrongly — assumed).
   *
   * This targets `<w>` elements directly rather than "any tag carrying
   * class/lemma/savlm", which matters: an earlier version matched any
   * class-bearing tag, including the wrapping <div> around the whole
   * verse — and since that div's own class ("sword-markup...") has no
   * Strong's data, the whole match (including every nested <w> inside
   * it) was returned unprocessed. <w> elements are leaf-level (they
   * don't nest), so matching them directly sidesteps that entirely.
   * lemma/savlm are still checked as a fallback for modules that might
   * render differently.
   */
  normalizeStrongsMarkup(html) {
    return html.replace(/<w\b([^>]*)>([\s\S]*?)<\/w>/gi, (match, attrs, inner) => {
      const classMatch = attrs.match(/\bclass="([^"]*)"/i);
      const lemmaMatch = attrs.match(/\blemma="([^"]*)"/i);
      const savlmMatch = attrs.match(/\bsavlm="([^"]*)"/i);
      const source = [classMatch?.[1], lemmaMatch?.[1], savlmMatch?.[1]].filter(Boolean).join(' ');
      const strongMatches = [...source.matchAll(/(?:strong:)?\b([GH]\d{1,5})\b/gi)].map((m) => m[1]);
      if (strongMatches.length === 0) return match;
      const unique = [...new Set(strongMatches)];
      return `<span class="strongs" data-strong="${unique.join(',')}">${inner}</span>`;
    });
  }

  /** Real verse content comes wrapped in a block-level `<div class="
   *  sword-markup ...">` (confirmed from actual output) — rendering
   *  that inside the inline <span> the frontend uses for verse text is
   *  invalid nesting. Renaming to <span> keeps whatever classes SWORD
   *  attached (e.g. "sword-quote-jesus" for red-letter text, which the
   *  frontend now has CSS for) while staying inline-safe. Also handles
   *  <p>, just in case some module/filter combination uses that instead. */
  flattenBlockTags(html) {
    return html
      .replace(/<div(\s|>)/gi, '<span$1')
      .replace(/<\/div>/gi, '</span>')
      .replace(/<p(\s|>)/gi, '<span$1')
      .replace(/<\/p>/gi, '</span>');
  }

  /** The full markup pipeline applied to any HTML the frontend will
   *  render (after milestone-stripping and title-extraction have
   *  already run): flatten block tags to inline-safe ones, collapse
   *  cross-reference notes to their marker *first* — so there's no
   *  osisRef-bearing attribute left for the prose-scanner to trip over
   *  — then normalize Strong's words, then prose-scan for any remaining
   *  embedded references (e.g. in commentary text, which never had
   *  <note>/<reference> tags to begin with). */
  processHtml(html) {
    const flattened = this.flattenBlockTags(html);
    const crossRefsCollapsed = this.normalizeCrossReferenceNotes(flattened);
    const footnotesCollapsed = this.normalizeFootnoteMarkup(crossRefsCollapsed);
    const strongsNormalized = this.normalizeStrongsMarkup(footnotesCollapsed);
    return this.wrapVerseReferences(strongsNormalized);
  }

  /**
   * Collapses each cross-reference note — one or more `<reference
   * osisRef="...">` children — into a single small `<sup
   * class="xref-marker" data-refs="...">` carrying every referenced OSIS
   * key, comma-separated (reusing the same multi-entry popup pattern
   * already built for words with more than one Strong's number). This is
   * what keeps cross-references from breaking up reading flow: instead
   * of the full citation text sitting inline ("...named John 7:50;
   * 19:39Nicodemus..."), only a tiny marker does.
   *
   * Targets `<span class="sword-markup sword-note" type="crossReference"
   * n="A" osisID="John.3.1.xref.A">` — confirmed from real output, and
   * *not* an OSIS `<note>` tag, which an earlier version of this
   * function assumed (same underlying reason as extractTitles: SWORD
   * pre-converts `<note>` into this span/class form). The `<reference
   * osisRef="...">` children inside it do keep their original OSIS tag
   * name, unconverted — SWORD is just inconsistent about which elements
   * get the span treatment.
   *
   * The visible label isn't invented — it's pulled from the module's own
   * `n="A"` attribute first (confirmed present directly), falling back
   * to the trailing letter in `osisID` (e.g. "John.3.1.xref.A") if `n`
   * is missing, which is exactly how printed study Bibles label their
   * own cross-reference notes in the margin — reusing it keeps the
   * in-app marker consistent with the source text's own apparatus.
   * Falls back to a dagger (†) if neither is present.
   */
  normalizeCrossReferenceNotes(html) {
    return this.replaceBalancedSpans(html, 'sword-note', (attrs, inner) => {
      if (!/\btype="crossReference"/i.test(attrs)) return null; // leave other note types (explanatory footnotes) alone for now
      const refs = [...inner.matchAll(/\bosisRef="([^"]*)"/gi)].map((m) => m[1]);
      if (refs.length === 0) return null;
      const unique = [...new Set(refs)];
      const nMatch = attrs.match(/\bn="([A-Za-z0-9]+)"/);
      const idMatch = attrs.match(/\bosisID="[^"]*\.([A-Za-z])"/);
      const label = (nMatch?.[1] || idMatch?.[1] || '†').toLowerCase();
      return `<sup class="xref-marker" data-refs="${unique.join(',')}">${label}</sup>`;
    });
  }

  /**
   * Collapses explanatory/translator footnotes ("Lit Him", "Or from
   * above") the same way cross-references get collapsed — a small
   * superscript marker instead of the note text sitting inline breaking
   * up the sentence. Runs *after* `normalizeCrossReferenceNotes`, so by
   * the time this executes, any `sword-note` span still present is by
   * definition not a cross-reference (those were already consumed); the
   * `type="crossReference"` check is kept anyway as a defensive
   * safety net rather than relying on that ordering alone.
   *
   * Unlike a cross-reference marker, this one doesn't link anywhere —
   * there's nothing to look up, the note's own text *is* the content —
   * so it carries that text directly in a `data-note` attribute
   * (HTML-escaped) and the frontend just shows it in a lightweight
   * popup on click, no fetch involved.
   *
   * The label reuses the module's own numbering the same way
   * cross-references reuse its lettering: explanatory notes carry
   * `n="1"`, `n="2"` (numeric) where cross-reference notes carry `n="A"`,
   * `n="B"` (alphabetic) — a real, confirmed distinction the module
   * itself makes — so footnotes and cross-references end up visually
   * distinguishable (numbers vs. letters) without inventing a separate
   * scheme.
   */
  normalizeFootnoteMarkup(html) {
    return this.replaceBalancedSpans(html, 'sword-note', (attrs, inner) => {
      if (/\btype="crossReference"/i.test(attrs)) return null; // already handled by normalizeCrossReferenceNotes
      const text = this.stripHtml(inner).trim();
      if (!text) return null;
      const nMatch = attrs.match(/\bn="([A-Za-z0-9]+)"/);
      const label = nMatch?.[1] || '*';
      const escaped = text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<sup class="footnote-marker" data-note="${escaped}">${label}</sup>`;
    });
  }

  /**
   * Wraps any Bible references found in a piece of text (e.g. "cf. John
   * 3:16" inside a commentary entry) in a clickable span, so the
   * frontend can pop up a preview or open it as a tab.
   *
   * This has to be careful about one thing that bit it in practice: a
   * module with cross-references renders them as OSIS `<reference
   * osisRef="John.7.50">John 7:50</reference>` (inside a `<note
   * type="crossReference">`), and `osisRef="John.7.50"` is exactly the
   * kind of text the reference detector matches — it has no idea it's
   * looking at an HTML attribute value rather than running prose. Left
   * unfiltered, that meant a <span> was getting injected in the middle
   * of another tag's attribute, corrupting the surrounding markup badly
   * enough to produce visibly broken output (fragments of attribute
   * syntax showing up as literal text). So: any match whose position
   * falls inside an existing `<...>` span is dropped before wrapping.
   */
  wrapVerseReferences(html) {
    const tagSpans = [];
    const tagRe = /<[^>]*>/g;
    let tagMatch;
    while ((tagMatch = tagRe.exec(html))) {
      tagSpans.push([tagMatch.index, tagMatch.index + tagMatch[0].length]);
    }
    const insideExistingTag = (pos) => tagSpans.some(([s, e]) => pos >= s && pos < e);

    const matches = findReferencesInText(html).filter((m) => !insideExistingTag(m.start) && !insideExistingTag(m.end - 1));
    if (matches.length === 0) return html;
    let out = '';
    let cursor = 0;
    for (const m of matches) {
      out += html.slice(cursor, m.start);
      out += `<span class="verse-ref" data-ref="${m.osis}">${html.slice(m.start, m.end)}</span>`;
      cursor = m.end;
    }
    out += html.slice(cursor);
    return out;
  }

  /** Strips HTML tags for contexts that want plain text (e.g. the LLM
   *  prompt) rather than the markup used for on-screen rendering. */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Flattens verse objects into plain text, e.g. for handing to an LLM. */
  versesToText(verses) {
    return verses.map((v) => `${v.verseNr} ${this.stripHtml(v.content)}`).join(' ');
  }

  async search(moduleCode, term, { searchType = 'multiWord', searchScope = 'BIBLE' } = {}) {
    return this.sword.getModuleSearchResults(moduleCode, term, () => {}, searchType, searchScope);
  }

  /** Strong's lookups aren't module-scoped in this API — the engine uses
   *  whichever Strong's dictionary module is installed. */
  getStrongsEntry(strongsKey) {
    return this.sword.getStrongsEntry(strongsKey);
  }

  /** Lists the browsable keys of a dictionary/lexicon module (e.g. every
   *  Strong's number, or every headword in a general dictionary). */
  getDictionaryKeys(moduleCode) {
    return this.sword.getDictModuleKeys(moduleCode);
  }

  /** Raw (markup-included) text of a single dictionary/lexicon/commentary
   *  entry for a given key. */
  getRawEntry(moduleCode, key) {
    return this.processHtml(this.sword.getRawModuleEntry(moduleCode, key));
  }
}

export const swordService = new SwordService();

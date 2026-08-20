import NodeSwordInterface from 'node-sword-interface';
import AdmZip from 'adm-zip';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config.js';
import { toOsis, splitOsisSequence, isRange, findReferencesInText } from './referenceParser.js';

// Standard 66-book Protestant canon, OSIS short codes + King James
// versification chapter counts. This is stable canonical data (not
// something that varies by SWORD build the way markup rendering did
// elsewhere in this file) — but a handful of modules use different
// versification and could have a different chapter count for some
// book. That's handled defensively rather than assumed away: each
// chapter fetch below is wrapped in try/catch and simply skipped on
// failure, so a module missing a book (NT-only modules) or using a
// slightly different chapter count degrades gracefully instead of
// throwing.
const BIBLE_BOOKS = [
  ['Gen', 50], ['Exod', 40], ['Lev', 27], ['Num', 36], ['Deut', 34],
  ['Josh', 24], ['Judg', 21], ['Ruth', 4], ['1Sam', 31], ['2Sam', 24],
  ['1Kgs', 22], ['2Kgs', 25], ['1Chr', 29], ['2Chr', 36], ['Ezra', 10],
  ['Neh', 13], ['Esth', 10], ['Job', 42], ['Ps', 150], ['Prov', 31],
  ['Eccl', 12], ['Song', 8], ['Isa', 66], ['Jer', 52], ['Lam', 5],
  ['Ezek', 48], ['Dan', 12], ['Hos', 14], ['Joel', 3], ['Amos', 9],
  ['Obad', 1], ['Jonah', 4], ['Mic', 7], ['Nah', 3], ['Hab', 3],
  ['Zeph', 3], ['Hag', 2], ['Zech', 14], ['Mal', 4],
  ['Matt', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28],
  ['Rom', 16], ['1Cor', 16], ['2Cor', 13], ['Gal', 6], ['Eph', 6],
  ['Phil', 4], ['Col', 4], ['1Thess', 5], ['2Thess', 3], ['1Tim', 6],
  ['2Tim', 4], ['Titus', 3], ['Phlm', 1], ['Heb', 13], ['Jas', 5],
  ['1Pet', 5], ['2Pet', 3], ['1John', 5], ['2John', 1], ['3John', 1],
  ['Jude', 1], ['Rev', 22],
];

class SwordService {
  constructor() {
    this.sword = new NodeSwordInterface(config.swordModulesPath);
    this._repoConfigLoaded = false;
    // moduleCode -> { strongsIndex: Map(strongsKey -> occurrences),
    // verses: [{book, chapter, verse, text, strongsSequence}] }, built
    // lazily on first word/phrase-study request for that module (see
    // buildModuleIndex) and kept for the life of the process. Originally
    // just a Strong's-key index; extended to also carry the flat verse
    // list (plain text + an ordered per-word Strong's-key sequence) so
    // phrase studies can reuse the exact same one-time full-Bible scan
    // rather than duplicating it.
    this._moduleIndexCache = new Map();
    // moduleCode -> in-flight build Promise, so two concurrent word/
    // phrase-study requests for the same not-yet-indexed module share
    // one scan instead of each starting their own full pass.
    this._moduleIndexBuilding = new Map();
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

  installModuleFromZip(buffer) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    const looksLikeModule = entries.some((e) => /^(mods\.d|modules)\//i.test(e.entryName));
    if (!looksLikeModule) {
      const err = new Error("This doesn't look like a SWORD module package (expected mods.d/ and modules/ folders in the zip).");
      err.status = 400;
      throw err;
    }

    const destDir = config.swordModulesPath;
    const resolvedDest = path.resolve(destDir);
    for (const entry of entries) {
      const resolvedPath = path.resolve(destDir, entry.entryName);
      if (resolvedPath !== resolvedDest && !resolvedPath.startsWith(resolvedDest + path.sep)) {
        const err = new Error(`Refusing to extract an entry outside the modules directory: ${entry.entryName}`);
        err.status = 400;
        throw err;
      }
    }

    fs.mkdirSync(destDir, { recursive: true });
    zip.extractAllTo(destDir, true);
    this._repoConfigLoaded = false;
  }

  _parseOsisPoint(point) {
    const parts = point.split('.');
    const verse = Number(parts.pop());
    const chapter = Number(parts.pop());
    const book = parts.join('.');
    return { book, chapter, verse };
  }

  getPassage(moduleCode, humanReference) {
    const osis = toOsis(humanReference);
    if (!osis) {
      const err = new Error(`Could not parse "${humanReference}" as a Bible reference`);
      err.status = 400;
      throw err;
    }

    const items = splitOsisSequence(osis);
    const verses = [];
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
      const { content, titles } = this.processVerseContent(v.content);
      return { ...v, content, titles };
    });
  }

  processVerseContent(html) {
    if (!html) return { content: '', titles: [] };
    const flattened = this.flattenBlockTags(html);
    const withoutMilestones = this.stripMilestones(flattened);
    const { titles, html: withoutTitles } = this.extractTitles(withoutMilestones);
    const crossRefsCollapsed = this.normalizeCrossReferenceNotes(withoutTitles);
    const footnotesCollapsed = this.normalizeFootnoteMarkup(crossRefsCollapsed);
    const dictLinked = this.linkStrongsCrossReferences(footnotesCollapsed);
    const strongsNormalized = this.normalizeStrongsMarkup(dictLinked);
    const content = this.wrapVerseReferences(strongsNormalized);
    return { content, titles };
  }

  linkStrongsCrossReferences(html) {
    return html.replace(/\bsee\s+(HEBREW|GREEK)\s+for\s+0*(\d+)/gi, (match, lang, num) => {
      const key = `${lang.toUpperCase() === 'HEBREW' ? 'H' : 'G'}${num}`;
      return `<span class="dict-xref" data-strong-key="${key}">${match}</span>`;
    });
  }

  stripMilestones(html) {
    return html
      .replace(/<(?:chapter|verse)\b[^>]*\/>/gi, '')
      .replace(/<span\b[^>]*\bclass="[^"]*\bsword-x-milestone\b[^"]*"[^>]*><\/span>/gi, '');
  }

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
      if (contentEnd === -1) continue;
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

  extractTitles(html) {
    const titles = [];
    const cleaned = this.replaceBalancedSpans(html, 'sword-section-title', (attrs, inner) => {
      const text = this.stripHtml(inner).trim();
      if (text) titles.push(text);
      return '';
    });
    return { titles, html: cleaned };
  }

  normalizeStrongsMarkup(html) {
    return html.replace(/<w\b([^>]*)>([\s\S]*?)<\/w>/gi, (match, attrs, inner) => {
      const classMatch = attrs.match(/\bclass="([^"]*)"/i);
      const lemmaMatch = attrs.match(/\blemma="([^"]*)"/i);
      const savlmMatch = attrs.match(/\bsavlm="([^"]*)"/i);
      const source = [classMatch?.[1], lemmaMatch?.[1], savlmMatch?.[1]].filter(Boolean).join(' ');
      const strongMatches = [...source.matchAll(/(?:strong:)?\b([GH]\d{1,5})\b/gi)].map((m) => m[1]);
      if (strongMatches.length === 0) return match;
      const unique = [...new Set(strongMatches)];
      const morphMatch = attrs.match(/\bmorph="([^"]*)"/i);
      const morphAttr = morphMatch ? ` data-morph="${morphMatch[1].replace(/"/g, '&quot;')}"` : '';
      return `<span class="strongs" data-strong="${unique.join(',')}"${morphAttr}>${inner}</span>`;
    });
  }

  flattenBlockTags(html) {
    return html
      .replace(/<div(\s|>)/gi, '<span$1')
      .replace(/<\/div>/gi, '</span>')
      .replace(/<p(\s|>)/gi, '<span$1')
      .replace(/<\/p>/gi, '</span>');
  }

  normalizeCrossReferenceNotes(html) {
    return this.replaceBalancedSpans(html, 'sword-note', (attrs, inner) => {
      if (!/\btype="crossReference"/i.test(attrs)) return null;
      const refs = [...inner.matchAll(/\bosisRef="([^"]*)"/gi)].map((m) => m[1]);
      if (refs.length === 0) return null;
      const unique = [...new Set(refs)];
      const nMatch = attrs.match(/\bn="([A-Za-z0-9]+)"/);
      const idMatch = attrs.match(/\bosisID="[^"]*\.([A-Za-z])"/);
      const label = (nMatch?.[1] || idMatch?.[1] || '†').toLowerCase();
      return `<sup class="xref-marker" data-refs="${unique.join(',')}">${label}</sup>`;
    });
  }

  normalizeFootnoteMarkup(html) {
    return this.replaceBalancedSpans(html, 'sword-note', (attrs, inner) => {
      if (/\btype="crossReference"/i.test(attrs)) return null;
      const text = this.stripHtml(inner).trim();
      if (!text) return null;
      const nMatch = attrs.match(/\bn="([A-Za-z0-9]+)"/);
      const label = nMatch?.[1] || '*';
      const escaped = text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<sup class="footnote-marker" data-note="${escaped}">${label}</sup>`;
    });
  }

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

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  versesToText(verses) {
    return verses.map((v) => `${v.verseNr} ${this.stripHtml(v.content)}`).join(' ');
  }

  /** Search results come back as raw VerseObjects — same shape as
   *  getChapterText — with `.content` carrying unprocessed SWORD markup,
   *  never run through processVerseContent/stripHtml the way every other
   *  content path in this app is. Confirmed as a real bug from a
   *  screenshot: search result snippets were showing literal `<div
   *  class="sword-markup sword-note"...>` tags as visible text instead
   *  of the actual verse content. A search snippet doesn't need
   *  clickable Strong's/cross-ref markup the way a reading pane does —
   *  it's a short preview, not something meant for deep interaction —
   *  so stripHtml (plain text) rather than the full processVerseContent
   *  pipeline is the right level of processing here. */
  async search(moduleCode, term, { searchType = 'multiWord', searchScope = 'BIBLE' } = {}) {
    const results = await this.sword.getModuleSearchResults(moduleCode, term, () => {}, searchType, searchScope);
    return results.map((r) => ({ ...r, content: this.stripHtml(r.content) }));
  }

  getStrongsEntry(strongsKey) {
    return this.sword.getStrongsEntry(strongsKey);
  }

  getDictionaryKeys(moduleCode) {
    return this.sword.getDictModuleKeys(moduleCode);
  }

  stripRedundantWritingTransliteration(html) {
    return html.replace(/<orth\b[^>]*\btype="writing"[^>]*>[\s\S]*?<\/orth>/gi, '');
  }

  getRawEntry(moduleCode, key) {
    const raw = this.sword.getRawModuleEntry(moduleCode, key);
    if (!raw) {
      const err = new Error(`No entry found for "${key}" in ${moduleCode}`);
      err.status = 404;
      throw err;
    }
    return this.processVerseContent(this.stripRedundantWritingTransliteration(raw)).content;
  }

  extractStrongsKeysFrom(html) {
    const keys = new Set();
    for (const m of html.matchAll(/data-strong="([^"]*)"/g)) {
      for (const k of m[1].split(',')) {
        if (k.trim()) keys.add(k.trim());
      }
    }
    return [...keys];
  }

  /** Like extractStrongsKeysFrom, but preserves reading order and
   *  per-word grouping instead of collapsing to a unique set — returns
   *  one entry per Strong's-tagged word, each entry listing that word's
   *  key(s) (a single word can map to more than one Strong's number).
   *  This is what makes phrase search by original-language word
   *  sequence possible: matching a *consecutive* run of positions,
   *  which requires knowing the order words actually appear in, not
   *  just which keys occur somewhere in the verse. */
  extractStrongsSequenceFrom(html) {
    const sequence = [];
    for (const m of html.matchAll(/data-strong="([^"]*)"/g)) {
      const keys = m[1].split(',').map((k) => k.trim()).filter(Boolean);
      if (keys.length > 0) sequence.push(keys);
    }
    return sequence;
  }

  /**
   * Builds (and caches) a full-Bible index for one module — a Strong's-
   * key occurrence index (word studies) plus a flat verse list with
   * plain text and an ordered Strong's-key sequence per verse (phrase
   * studies), from the same single scan. Originally just built the
   * Strong's index (see the word-study feature); extended rather than
   * duplicated when phrase search needed the same full-Bible pass, so
   * there's one expensive scan serving both features instead of two.
   *
   * Deliberately built on getChapterText + extraction (already proven
   * correct elsewhere in this file) rather than SWORD's own search
   * engine — no confirmed documentation that node-sword-interface's
   * search supports Strong's-number-aware or exact-phrase queries, and
   * getting that wrong silently felt like a worse failure mode than a
   * slower but verified approach.
   *
   * Runs synchronously per chapter and a full Bible is ~1,189 chapters,
   * so without yielding this would block the Node event loop for
   * however long the scan takes. Yielding every 20 chapters keeps the
   * server responsive during the (one-time, per-module) build.
   */
  async buildModuleIndex(moduleCode) {
    if (this._moduleIndexCache.has(moduleCode)) return this._moduleIndexCache.get(moduleCode);
    if (this._moduleIndexBuilding.has(moduleCode)) return this._moduleIndexBuilding.get(moduleCode);

    const buildPromise = (async () => {
      const strongsIndex = new Map();
      const verses = [];
      let chaptersProcessed = 0;

      for (const [book, chapterCount] of BIBLE_BOOKS) {
        for (let chapter = 1; chapter <= chapterCount; chapter++) {
          let rawVerses;
          try {
            rawVerses = this.sword.getChapterText(moduleCode, book, chapter);
          } catch {
            continue; // book/chapter not present in this module's versification — skip
          }

          for (const v of rawVerses) {
            const { content } = this.processVerseContent(v.content);
            const plainText = this.stripHtml(content);
            const verseNr = Number(v.verseNr);
            const strongsSequence = this.extractStrongsSequenceFrom(content);
            verses.push({ book, chapter, verse: verseNr, text: plainText, strongsSequence });

            const keys = this.extractStrongsKeysFrom(content);
            for (const key of keys) {
              if (!strongsIndex.has(key)) strongsIndex.set(key, []);
              strongsIndex.get(key).push({ book, chapter, verse: verseNr, text: plainText });
            }
          }

          chaptersProcessed++;
          if (chaptersProcessed % 20 === 0) {
            await new Promise((resolve) => setImmediate(resolve));
          }
        }
      }

      const result = { strongsIndex, verses };
      this._moduleIndexCache.set(moduleCode, result);
      this._moduleIndexBuilding.delete(moduleCode);
      return result;
    })();

    this._moduleIndexBuilding.set(moduleCode, buildPromise);
    return buildPromise;
  }

  /** Every occurrence of a Strong's key across the whole Bible in one
   *  module — the data behind cross-Bible word studies. First call for
   *  a given module is slow (a real full-Bible scan); every call after
   *  that, for any key in that same module, is an instant Map lookup. */
  async getStrongsOccurrences(moduleCode, strongsKey) {
    const { strongsIndex } = await this.buildModuleIndex(moduleCode);
    return strongsIndex.get(strongsKey) || [];
  }

  /** Every verse containing the exact phrase (case-insensitive plain-
   *  text substring match) — data behind phrase studies by literal
   *  wording. A real, narrower capability than word studies: this only
   *  catches this exact translation's wording, not a different English
   *  rendering of the same underlying phrase (that's what
   *  findStrongsSequenceOccurrences below is for). */
  async findPhraseOccurrences(moduleCode, phrase) {
    const { verses } = await this.buildModuleIndex(moduleCode);
    const needle = phrase.trim().toLowerCase();
    if (!needle) return [];
    return verses
      .filter((v) => v.text.toLowerCase().includes(needle))
      .map((v) => ({ book: v.book, chapter: v.chapter, verse: v.verse, text: v.text }));
  }

  /** Does `verseSequence` (a verse's ordered list of per-word Strong's-
   *  key arrays) contain `querySequence` (an ordered list of single
   *  keys, one per selected word) as a consecutive run, allowing a
   *  match at any position and matching a query position against ANY
   *  of a word's keys (a word can map to more than one Strong's
   *  number)? Verified against 9 cases including word order, multi-key
   *  words, and repeated phrases within one verse. */
  _sequenceContains(verseSequence, querySequence) {
    const qLen = querySequence.length;
    if (qLen === 0 || verseSequence.length < qLen) return false;
    for (let i = 0; i <= verseSequence.length - qLen; i++) {
      let matchesHere = true;
      for (let j = 0; j < qLen; j++) {
        if (!verseSequence[i + j].includes(querySequence[j])) {
          matchesHere = false;
          break;
        }
      }
      if (matchesHere) return true;
    }
    return false;
  }

  /** Every verse containing the same sequence of underlying Strong's-
   *  tagged words, regardless of how this translation renders them in
   *  English — data behind phrase studies by original-language words.
   *  Catches "kingdom of heaven" and "kingdom of the heavens" alike, as
   *  long as both are built from the same tagged words in the same
   *  order; still specific to this module's own tagging, not a
   *  cross-translation or grammatical-form-aware match. */
  async findStrongsSequenceOccurrences(moduleCode, querySequence) {
    if (!Array.isArray(querySequence) || querySequence.length === 0) return [];
    const { verses } = await this.buildModuleIndex(moduleCode);
    return verses
      .filter((v) => this._sequenceContains(v.strongsSequence, querySequence))
      .map((v) => ({ book: v.book, chapter: v.chapter, verse: v.verse, text: v.text }));
  }
}

export const swordService = new SwordService();
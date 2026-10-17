import { describe, it, expect } from 'vitest';
import { BOOK_HIGHLIGHT_COLORS, extractToc } from '../../utils/bookHtml.js';

// ---------------------------------------------------------------------------
// BOOK_HIGHLIGHT_COLORS
// ---------------------------------------------------------------------------

describe('BOOK_HIGHLIGHT_COLORS', () => {
  it('has exactly 4 keys: yellow, green, blue, pink', () => {
    const keys = Object.keys(BOOK_HIGHLIGHT_COLORS);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('yellow');
    expect(keys).toContain('green');
    expect(keys).toContain('blue');
    expect(keys).toContain('pink');
  });

  it('each entry has a bg string', () => {
    for (const color of Object.values(BOOK_HIGHLIGHT_COLORS)) {
      expect(typeof color.bg).toBe('string');
      expect(color.bg.length).toBeGreaterThan(0);
    }
  });

  it('each entry has a label string', () => {
    for (const color of Object.values(BOOK_HIGHLIGHT_COLORS)) {
      expect(typeof color.label).toBe('string');
      expect(color.label.length).toBeGreaterThan(0);
    }
  });

  it('yellow has label "Yellow"', () => {
    expect(BOOK_HIGHLIGHT_COLORS.yellow.label).toBe('Yellow');
  });

  it('green has label "Green"', () => {
    expect(BOOK_HIGHLIGHT_COLORS.green.label).toBe('Green');
  });

  it('blue has label "Blue"', () => {
    expect(BOOK_HIGHLIGHT_COLORS.blue.label).toBe('Blue');
  });

  it('pink has label "Pink"', () => {
    expect(BOOK_HIGHLIGHT_COLORS.pink.label).toBe('Pink');
  });
});

// ---------------------------------------------------------------------------
// extractToc
// ---------------------------------------------------------------------------

describe('extractToc', () => {
  it('returns { html: "", toc: [] } for empty string input', () => {
    const result = extractToc('');
    expect(result).toEqual({ html: '', toc: [] });
  });

  it('returns { html, toc: [] } for null input (graceful handling)', () => {
    const result = extractToc(null);
    expect(result.toc).toEqual([]);
  });

  it('returns { html, toc: [] } when html has fewer than 2 headings', () => {
    const html = '<p>Some content</p><h1>Only one heading</h1><p>More content</p>';
    const result = extractToc(html);
    expect(result.toc).toEqual([]);
  });

  it('returns toc with entries when html has 2+ headings', () => {
    const html = '<h1>Chapter One</h1><p>Content.</p><h2>Section A</h2><p>Text.</p>';
    const result = extractToc(html);
    expect(result.toc.length).toBeGreaterThanOrEqual(2);
  });

  it('each toc entry has text, id, and level properties', () => {
    const html = '<h1>Title</h1><p>Intro.</p><h2>First Chapter</h2><p>Body.</p>';
    const result = extractToc(html);
    for (const entry of result.toc) {
      expect(entry).toHaveProperty('text');
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('level');
    }
  });

  it('h1 gets level 1', () => {
    const html = '<h1>Top</h1><p>.</p><h2>Sub</h2>';
    const result = extractToc(html);
    const h1Entry = result.toc.find((e) => e.text === 'Top');
    expect(h1Entry?.level).toBe(1);
  });

  it('h2 gets level 2', () => {
    const html = '<h1>Title</h1><h2>Chapter</h2>';
    const result = extractToc(html);
    const h2Entry = result.toc.find((e) => e.text === 'Chapter');
    expect(h2Entry?.level).toBe(2);
  });

  it('h3 gets level 3', () => {
    const html = '<h1>Title</h1><h3>Section</h3>';
    const result = extractToc(html);
    const h3Entry = result.toc.find((e) => e.text === 'Section');
    expect(h3Entry?.level).toBe(3);
  });

  it('h4 gets level 4', () => {
    const html = '<h1>Title</h1><h4>Subsection</h4>';
    const result = extractToc(html);
    const h4Entry = result.toc.find((e) => e.text === 'Subsection');
    expect(h4Entry?.level).toBe(4);
  });

  it('h3.book-section-heading gets level 3', () => {
    const html =
      '<h1>Title</h1><h3 class="book-section-heading">A Section</h3>';
    const result = extractToc(html);
    const entry = result.toc.find((e) => e.text === 'A Section');
    expect(entry?.level).toBe(3);
  });

  it('injected ids start with "bk-"', () => {
    const html =
      '<h1>Introduction</h1><p>Text.</p><h2>Chapter One</h2><p>Body.</p>';
    const result = extractToc(html);
    for (const entry of result.toc) {
      expect(entry.id).toMatch(/^bk-/);
    }
  });

  it('preserves existing ids rather than overwriting them', () => {
    const html =
      '<h1 id="my-custom-id">Title</h1><p>Text.</p><h2>Sub</h2><p>Body.</p>';
    const result = extractToc(html);
    const titleEntry = result.toc.find((e) => e.text === 'Title');
    expect(titleEntry?.id).toBe('my-custom-id');
  });

  it('deduplicates ids when headings have the same text', () => {
    const html =
      '<h1>Repeat</h1><h2>Repeat</h2><h3>Repeat</h3>';
    const result = extractToc(html);
    const ids = result.toc.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('returns modified html with injected id attributes', () => {
    const html = '<h1>Alpha</h1><p>Body.</p><h2>Beta</h2><p>More body.</p>';
    const result = extractToc(html);
    expect(result.html).toContain('id="bk-');
  });

  it('returns { html, toc: [] } when called with a non-string (undefined)', () => {
    const result = extractToc(undefined);
    expect(result.toc).toEqual([]);
  });

  it('returns toc:[] when only 1 heading survives filtering', () => {
    // A heading with empty text is skipped; only one valid heading → toc stays []
    const html = '<h1></h1><h2>Only Valid</h2>';
    const result = extractToc(html);
    expect(result.toc).toEqual([]);
  });

  it('toc entry text matches the heading text content', () => {
    const html = '<h1>Genesis</h1><p>In the beginning.</p><h2>Creation Week</h2>';
    const result = extractToc(html);
    const texts = result.toc.map((e) => e.text);
    expect(texts).toContain('Genesis');
    expect(texts).toContain('Creation Week');
  });
});

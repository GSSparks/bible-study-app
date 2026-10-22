# frontend/src/utils/rehypeVerseRefs.js

**Purpose**

A rehype plugin that transforms plain-text Bible references in rendered Markdown into clickable `<span class="verse-ref" data-ref="...">` elements. It is applied during the `react-markdown` / unified pipeline so that Markdown content (e.g., study lesson body text, commentary notes, AI assistant responses) automatically has live Bible reference links without any author markup.

**Key exports / contents**

- `rehypeVerseRefs()` — factory function that returns a rehype plugin (a function accepting a `tree`).
  - Visits all `text` nodes in the rehype AST.
  - Skips nodes inside `<a>`, `<code>`, `<pre>`, or `<script>` elements (to avoid double-linking or breaking code blocks).
  - Splits matching text runs into interleaved `text` and `element` nodes.
  - Returns `[SKIP, index + newNodes.length]` to prevent revisiting newly-inserted nodes.
- `BOOKS` — internal regex alternation string of book name forms (not exported).
- `VERSE_RE` — internal compiled regex (not exported).

**Dependencies / relationships**

- Imports `visit` and `SKIP` from `unist-util-visit`.
- Used as a rehype plugin in `react-markdown` configurations: `rehypePlugins={[rehypeVerseRefs]}`.
- Consumers are responsible for attaching a click handler to `.verse-ref` spans to navigate the Cell to the reference stored in `data-ref`.

**Notes**

- The regex covers a broad but not exhaustive set of book abbreviations; it is less comprehensive than `bibleRefDetect.js` (which is optimized for fuzzy PDF text). This plugin targets clean authored text where abbreviations are more standard.
- Book names in the alternation are not sorted longest-first (unlike `bibleRefDetect.js`), which could cause a shorter form to match before a longer one in some edge cases. In practice this is rare in clean Markdown text.
- The plugin does not normalize abbreviations — `data-ref` contains whatever text was matched, not a canonical form. The navigation handler must resolve abbreviations.

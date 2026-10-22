# frontend/src/utils/parseInterlinear.js

**Purpose**

Parses SWORD verse HTML into structured tokens for interlinear rendering, and provides helpers for working with Strong's number markup. The SWORD engine emits HTML where Greek/Hebrew words are wrapped in `<span class="strongs" data-strong="G1234" data-morph="...">` elements; this module converts that markup into a clean token array suitable for building an interlinear display (word above its Strong's gloss).

**Key exports / contents**

- `parseVerseTokens(html)` — parses verse HTML via `DOMParser` and returns an array of tokens:
  - `{ type: 'strongs', word, strong, morph }` — for words with Strong's markup. `strong` may be comma-separated (multiple numbers for one word). `morph` may be `null`.
  - `{ type: 'text', text }` — for plain text runs (punctuation, spaces, words without markup).
  - Adjacent text tokens are merged so punctuation runs stay together.
  - Uses a recursive DOM walk so nested elements are handled correctly.
- `collectStrongsKeys(verses)` — accepts an array of verse objects (each with a `content` HTML string) and returns a deduplicated flat array of all unique Strong's number strings (e.g., `['G3588', 'G1234']`). Uses regex on raw HTML rather than DOM parsing for speed.
- `cleanMorph(morph)` — strips a leading scheme prefix (e.g., `"robinson:"`) and returns the first code from a space-separated morph string, or `null` if input is falsy.

**Dependencies / relationships**

- No imports.
- Consumed by interlinear view components and the Word Study feature to tokenize verse content, collect all Strong's numbers for batch lexicon lookup, and clean morph tags before passing them to `decodeRobinsonMorph`.
- Works in tandem with `robinsonMorphology.js` (which decodes morph codes) and the backend's `getStrongsEntry` API method.

**Notes**

- `parseVerseTokens` requires a browser DOM (`DOMParser`); it will not work in a Node.js context without a DOM shim.
- `collectStrongsKeys` uses regex on raw HTML strings rather than DOM parsing — intentionally faster for batch processing of many verses.
- `cleanMorph` only returns the first code when multiple morph codes are space-separated (e.g., `"robinson:T-NSM robinson:ANOTHER"`); the rest are discarded.

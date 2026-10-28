# frontend/src/components/TopicGuidePane.jsx

## Purpose

The "Codex" topical reference pane — a two-panel browse/read layout for looking up any topic, person, or place across all installed SWORD dictionary/book modules, Wikipedia, and Merriam-Webster. The left panel shows a search input and categorised result list; the right panel shows the selected entry. Supports browser-history-style back/forward navigation between entries, a sliding table of contents panel (for long entries), verse-hover preview, Strong's click routing, and an AI overview synthesising all the source results.

## Props

| Prop | Type | Description |
|---|---|---|
| `initialQuery` | object | `{ term, nonce }` — external trigger (e.g. from StrongsDrawer "Codex: word →") |
| `onStrongsClick` | func | `(key, event, morph, word, module) => void` |
| `isLoggedIn` | bool | (currently unused; reserved) |
| `defaultBibleModule` | string | Used for verse hover-card fetch and VerseHoverCard "Open in Cell" |
| `onOpenInBible` | func | `(humanRef) => void` — opens a verse ref in the Bible panel |
| `onOpenInCell` | func | `(ref) => void` — passed to VerseHoverCard navigate |

## State / Key Logic

- **Search/query**: `inputValue` tracks the text box; `query` is the committed search term (set on Enter). The two are separate to avoid triggering searches on every keystroke.
- **Parallel fetches**: On `query` commit, fires `api.searchTopics` (SWORD dicts/books), `api.getWikipediaEntry`, and `api.getMerriamEntry` concurrently. Each has its own loading/result state.
- **Navigation history**: `nav = { stack: [entry], index }`. `navigateTo` appends to truncated history. `goBack`/`goForward` step through. `entry.module` is one of `SUMMARY_MODULE`, `WIKIPEDIA_MODULE`, `MERRIAM_MODULE`, or a real SWORD module code.
- **AI summary**: When results arrive, the first nav entry is `{ module: SUMMARY_MODULE, key: normalizedQuery }`. Fetches `api.getCodexSummary(q)` — returns `{ id, summaryHtml, summaryMd, tags, cached }`. `summaryState` carries all these fields so the edit UI can pre-populate correctly.
- **Inline editing**: A pencil icon appears on the AI Overview header when a cached entry is loaded (`summaryState.id` is set). Clicking it enters edit mode: a `<textarea>` pre-filled with `summaryMd` and a tag editor. Saving calls `api.updateCodexEntry(id, { summaryMd, tags })` and updates `summaryState` in-place without a re-fetch.
- **Tag management**: `editTags` array; pressing Enter or comma in the tag input calls `addTag`. Backspace on empty input removes the last tag. Tags are stored lowercase. Display tags appear as teal rounded chips with a `Tag` icon.
- **Entry fetch**: For SWORD DICT/BOOK entries, fetches via `api.getDictionaryEntry` or `api.getBookEntry`. `injectTocLinks` and `wrapSeeReferences` post-process the HTML: `wrapSeeReferences` converts `"See CAPS-TERM"` patterns to clickable `.codex-topic-ref` spans.
- **TOC**: Produced by `injectTocLinks` from `utils/dictHtml.js`. Desktop: sliding 208px side panel. Mobile: collapsible panel from top.
- **Content click routing**: `handleContentClick` handles TOC anchor `#` links, Strongs `strong:` href, Vines-style dict hrefs, `.codex-topic-ref`, `.dict-entry-ref`, footnote markers, xref markers, and verse ref spans.
- **Hover cards**: `.verse-ref` and `.xref-marker` elements trigger `VerseHoverCard` with 150 ms debounce.
- **Merriam-Webster**: Shows headword, pronunciation (with audio play button), part-of-speech groups, definitions, illustration, etymology, first use, and link to full article. Pronunciation audio plays via `new Audio(url).play()`.
- **`grouped` results**: SWORD results grouped by module code with description and moduleType for display.

## Dependencies

- `FootnotePopup`, `VerseHoverCard`
- `api.searchTopics`, `api.getWikipediaEntry`, `api.getMerriamEntry`, `api.getDictionaryEntry`, `api.getBookEntry`, `api.getCodexSummary`, `api.updateCodexEntry`
- `injectTocLinks` from `utils/dictHtml.js`
- `osisToHuman` from `utils/osisToHuman.js`

## Notes

- On mobile, the two-panel layout collapses to a single-panel experience with a "Back to results" button.
- `wrapSeeReferences` uses a position-aware regex replacement to avoid modifying text inside HTML tags — operates backward through hits to preserve string offsets.
- `MerriamLogo` (internal) tries SVG then PNG then falls back to text to handle deployments that may not have the logo assets.

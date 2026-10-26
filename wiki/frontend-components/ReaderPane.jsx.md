# frontend/src/components/ReaderPane.jsx

## Purpose

The core Bible-text reading pane used throughout the application. It fetches verses from the SWORD/MD module backend, renders them as flowing prose (or in interlinear mode stacked word-by-word), and handles the full annotation surface: verse-level highlighting (personal and group/Scriptorium), floating verse-selection toolbar, free-text phrase selection toolbar, Strong's word click detection, cross-reference hover cards, footnote popups, and a note editor. It is embedded inside `MainLayout` for every Cell Bible tab. Commentary tabs use the dedicated `CommentaryPane` component instead.

## Props

| Prop | Type | Description |
|---|---|---|
| `module` | string | SWORD/MD module code (e.g. `KJV`, `md:MyCommentary`) |
| `reference` | string | Passage reference (e.g. `John 3:16`, `Gen 1`) |
| `focusMode` | bool | If true, enables continuous-scroll reading: loads the anchor chapter ± 1 neighbor, then lazy-loads more as the user scrolls. The outer reference header is hidden; per-chapter headers are rendered inline. |
| `noScroll` | bool | Strips the outer scroll container (used when the parent handles scrolling) |
| `showMarginalia` | bool | Whether to show the left-margin annotation tick and interlinear toggle |
| `interlinearMode` | bool | Controlled interlinear toggle (uncontrolled fallback if omitted) |
| `onInterlinearToggle` | func | Called when the interlinear toggle is clicked (controlled mode) |
| `onNavigate` | func | `(ref) => void` — navigate to a new reference |
| `onOpenInTab` | func | `(ref) => void` — open a reference in a new tab |
| `onStrongsClick` | func | `(key, event, morph, word, module) => void` |
| `onVerseRefClick` | func | `(osisRef, event) => void` |
| `onAnnotate` | func | Generic annotation callback |
| `onAskAboutPassage` | func | `(module, ref) => void` — send to AI assistant |
| `onPhraseStudy` | func | `(phrase, module, strongsSequence) => void` |
| `refreshNonce` | any | Changing this value re-triggers the verse/annotation fetch |
| `onPersonalCommentarySaved` | func | Called after a note is saved via `VerseCommentaryEditor` |
| `isLoggedIn` | bool | Enables group highlight and group finding fetching |

## State / Key Logic

- **Verse loading (non-focusMode)**: `api.getPassage(module, reference)` on every reference change. Single-chapter fetch; annotation load follows.
- **Continuous reading (focusMode)**: On navigation to a new chapter, loads anchor ± 1 neighbor (3 total) via `loadSlotInPlace`. Chapter keys are tracked in `loadedSlotKeys` ref — if the reference changes to an already-loaded chapter, it simply scrolls to the anchor verse without a reload. IntersectionObserver sentinels at the top/bottom of the scroll container trigger lazy-loading of adjacent chapters as the user approaches the edges. `slotMetaRef` tracks the ordered list of loaded chapters; when the window exceeds 5 chapters the oldest is trimmed from `verses`, `highlightMap`, and group data. A scroll listener calls `onNavigate` whenever the chapter header closest to the viewport top changes, keeping `focusedReference` in sync.
- **Annotation loading**: On verse load, fetches `api.listHighlights`, `api.listNotes` (for note count badge), and — when logged in — `api.listStudyGroupFindings` and `api.listStudyGroupHighlights` for the chapter prefix. Non-fatal; annotates optimistically.
- **Verse segmentation**: `groupVerses()` groups contiguous verses into segments that share a header, inserting chapter headers and SWORD section titles between non-contiguous groups.
- **Verse selection** (`selectedRange`): Clicking a verse superscript sets `anchor`/`focus` indices. Shift-click extends the range. A portal toolbar appears at the click point offering highlight swatches, note, share-finding, copy, and "Ask about this" buttons. Highlight operations are optimistic with real IDs backfilled.
- **Phrase selection** (`phraseSelection`): `handleContentMouseUp` fires on text drag, reads `window.getSelection()`, strips xref/footnote marker characters via `extractCleanSelectionText`, and collects the Strong's keys of all `[data-strong]` words the selection overlaps. A separate portal toolbar offers highlight, note (with pre-filled quote), and phrase study buttons.
- **Interlinear mode**: When on, calls `collectStrongsKeys` over all verses and batch-fetches transcriptions via `api.getStrongsEntry`, caching results in `strongsCache`. Renders each verse as stacked `(word, strongsKey, transcription)` columns using `parseVerseTokens`.
- **Content click routing**: Delegates `.footnote-marker` clicks to `FootnotePopup`, `.xref-marker` to `onVerseRefClick`, `.verse-ref` to `onVerseRefClick`, and Strong's extraction to `onStrongsClick` via `extractStrongsData` (walks up to 4 DOM ancestors).
- **Hover card**: `.xref-marker` and `.verse-ref` mouse-over triggers `VerseHoverCard` with a 150 ms debounced close.
- **Group findings panel**: Renders a "Study Findings" section below the text when `groupFindings` is non-empty.

## Dependencies

- `SelectableNoteRegion` — wraps the verse text div to handle text selection + note popup
- `VerseCommentaryEditor` — floating Markdown note editor anchored to a verse
- `FootnotePopup` — positioned card for SWORD footnote text
- `VerseHoverCard` — hover preview for cross-references
- `ShareFindingModal` — share a verse finding to a Study group
- `api.getPassage`, `api.listHighlights`, `api.listNotes`, `api.createHighlight`, `api.deleteHighlight`, `api.listStudyGroupFindings`, `api.listStudyGroupHighlights`, `api.getStrongsEntry`
- `parseVerseTokens`, `collectStrongsKeys` from `utils/parseInterlinear.js`

## Notes

- Uses `createPortal` for the selection toolbar, phrase toolbar, and all popups so they escape `overflow-hidden` parents.
- The `extractCleanSelectionText` function is documented in detail because it addresses a real bug: selection over xref/footnote markers inserted stray characters into phrase-study queries.
- Group highlights use a lighter tint (`GROUP_HIGHLIGHT_BG`) so personal highlights always read as "mine".
- `verseRefs` is a `useRef(Map)` — not state — to avoid re-renders on every DOM mount/unmount.
- The two selection states (`selectedRange` for verse-number clicks, `phraseSelection` for text drags) are mutually exclusive.

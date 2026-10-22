# frontend/src/components/StrongsDrawer.jsx

## Purpose

A bottom-docked drawer showing the Strong's lexicon entry for the word most recently clicked in the Bible text. Structurally mirrors `VerseDrawer`: supports an internal history stack so "See also" cross-reference clicks navigate within the drawer without closing it, with a back button for history traversal. Used in the Cell reading environment as the persistent bottom panel for lexicon lookups.

## Props

| Prop | Type | Description |
|---|---|---|
| `strongsKey` | string | Strong's key(s) (comma-separated) |
| `morph` | string | Morphology code |
| `wordText` | string | Original word text |
| `module` | string | Bible module the word came from |
| `onClose` | func | Close the drawer |
| `onNavigateKey` | func | `(key) => void` — notify parent of key navigation (for syncing with dictionary pane) |
| `onOpenInDictionary` | func | `(key) => void` — open in dictionary tab (optional) |
| `onSearchTopical` | func | `(word) => void` — search topical reference (optional) |
| `onWordStudy` | func | `(key, module) => void` — trigger word study (optional) |

## State / Key Logic

- `history` — array of `{ key, morph, wordText }` entries. `historyIndex` is the current position. `navigateToKey` truncates and appends; back decrements.
- When external `strongsKey` prop changes (new word clicked in reader), history is reset to `[{ key: strongsKey, morph, wordText }]` at index 0.
- Entry fetching: `Promise.allSettled` on each comma-split key. Sets `entries` from fulfilled results; sets `error` only if all results failed.
- Morphology decoding mirrors `StrongsPopup`.
- `navigateToKey` also calls `onNavigateKey?.(key)` so parent components can sync the dictionary tab if needed.

## Dependencies

- `api.getStrongsEntry`
- `decodeRobinsonMorph` from `utils/robinsonMorphology.js`

## Notes

- Uses `Promise.allSettled` rather than `Promise.all` so a missing entry for one key in a compound (`G25,G26`) does not abort the whole fetch.
- "Codex: {wordText} →" button (calls `onSearchTopical`) is hidden when `wordText` is not provided, so the button correctly disappears for "See also" navigations that only carry a key.
- Mirrors `VerseDrawer` in structure; both are candidates for a shared `BottomDrawer` component.

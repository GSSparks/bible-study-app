# frontend/src/components/StrongsPopup.jsx

## Purpose

A floating positioned card showing the Strong's lexicon entry for one or more Strong's keys, triggered by clicking a tagged word in the Bible text. Displays morphology code + decoded gloss (Robinson morphology), transcription, phonetic transcription, definition, and "See also" cross-references as clickable chips. Optionally offers actions to open in the full dictionary, run a word study across the whole Bible, or search Nave's Topical Bible.

## Props

| Prop | Type | Description |
|---|---|---|
| `strongsKey` | string | Comma-separated Strong's key(s) (e.g. `"G25"` or `"G25,G26"`) |
| `morph` | string | Morphology code string (space-separated for multi-key compounds) |
| `wordText` | string | The original-language word text (for topical search label) |
| `module` | string | Bible module the word came from (needed for word-study scope) |
| `x` | number | Click x position |
| `y` | number | Click y position |
| `onClose` | func | Close the popup |
| `onNavigateKey` | func | `(key) => void` — navigate to a different Strong's entry |
| `onOpenInDictionary` | func | `(key) => void` — open in the dictionary pane (optional) |
| `onSearchTopical` | func | `(word) => void` — search Nave's for the word (optional) |
| `onWordStudy` | func | `(key, module) => void` — trigger full-Bible word study (optional) |

## State / Key Logic

- Keys are split on comma; each key's entry is fetched in parallel via `Promise.all(keys.map(...api.getStrongsEntry))`.
- Morphology codes are split on whitespace and stripped of scheme prefixes (e.g. `robinson:` → `robinson`), then decoded via `decodeRobinsonMorph`.
- Position is clamped: `left = min(x, window.innerWidth - 340)`, `top = min(y, window.innerHeight - 260)`.
- Uses `createPortal` + full-screen click-catcher backdrop.
- "See also" references render as chips calling `onNavigateKey`.

## Dependencies

- `api.getStrongsEntry`
- `decodeRobinsonMorph` from `utils/robinsonMorphology.js`
- `createPortal`

## Notes

- `onOpenInDictionary`, `onSearchTopical`, and `onWordStudy` are all optional; the popup hides the corresponding buttons when they are absent. This is used by `PassageQuickView` to suppress actions not available in the Study footer context.
- Intentionally lighter than `StrongsDrawer` — it is a floating popup, not a persistent bottom panel; it does not support browser-history-style back navigation.

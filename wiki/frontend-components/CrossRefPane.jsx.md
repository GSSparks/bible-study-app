# frontend/src/components/CrossRefPane.jsx

## Purpose

Displays verse-grouped cross-references for the current passage using the SWORD TSK (Treasury of Scripture Knowledge) commentary module. Each verse in the passage is listed with its cross-reference targets as clickable chips. Hovering a chip previews the verse text via `VerseHoverCard`. Requires TSK to be installed; shows an install prompt if it is not.

## Props

| Prop | Type | Description |
|---|---|---|
| `reference` | string | Current passage reference |
| `module` | string | The user's active Bible module (passed to VerseHoverCard for preview text) |
| `onVerseRefClick` | func | `(ref) => void` — called when a cross-reference chip is clicked |
| `onNavigate` | func | `(ref) => void` — passed to VerseHoverCard's "Open in Cell" link |

## State / Key Logic

- On mount, checks `api.listInstalledModules('COMMENTARY')` for TSK. Sets `tskInstalled` to `true`/`false`; renders a prompt if false.
- On `[tskInstalled, reference]` change, fetches `api.getPassage('TSK', reference)` and extracts all `data-ref` and `data-refs` attribute values from the HTML content of each verse using regex. Deduplicates with a `Set`.
- `items` array: `[{ verseLabel, refs }]` — only entries with at least one ref are kept.
- `hoverCard` — `{ refStr, rect }` — managed with a 150 ms debounced close timer.

## Dependencies

- `VerseHoverCard`
- `api.listInstalledModules`, `api.getPassage`
- `osisToHuman` from `utils/osisToHuman.js` (converts OSIS references to human-readable display)

## Notes

- Cross-references are parsed from TSK's HTML using regex rather than a DOM parser — straightforward given the predictable `data-ref`/`data-refs` attribute format.
- The `module` prop is only used by `VerseHoverCard` (to fetch preview text), not by TSK fetching, which always uses the hard-coded `'TSK'` module.

# frontend/src/components/PassageMapsModal.jsx

## Purpose

A modal dialog that shows Bible maps relevant to the currently-viewed passage. Maps are displayed in a responsive grid (2–3 columns). Clicking a map thumbnail opens a full lightbox. Used from the Cell view when the user triggers "Maps" for a passage.

## Props

| Prop | Type | Description |
|---|---|---|
| `reference` | string | The passage reference to look up maps for |
| `onClose` | func | Called on Escape key, backdrop click, or the close button |

## State / Key Logic

- `maps` — fetched via `api.getMapsForReference(reference)` on mount and on reference change. Clears and refetches when the reference changes.
- `lightbox` — set to the selected map object; renders a full-screen lightbox overlay above the modal (z-index 202 vs modal z-index 201).
- Escape key listener added to `document` closes the modal.
- Layout: fullscreen on mobile, centered fixed card (580 px wide, up to 80vh) on desktop.
- The lightbox uses "back" chevron on mobile and an X button on desktop.

## Dependencies

- `api.getMapsForReference`
- `createPortal` (renders into `document.body`)

## Notes

- Uses `getShortTitle` to strip the `"SRV "` prefix or module code from map titles before display.
- The grid uses `aspect-[4/3]` for map thumbnails to maintain consistent proportions.
- No loading skeleton — shows a plain "Loading maps…" string while fetching.

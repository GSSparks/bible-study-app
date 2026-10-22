# frontend/src/components/VerseHoverCard.jsx

## Purpose

A small floating card that previews Bible verse text when hovering over a cross-reference marker or inline verse reference. Appears near the hovered element (below or above depending on available viewport space) and stays open while the pointer is over the card. Renders up to 2 verses of stripped HTML text; for longer passages it shows a verse count. Includes an "Open in Cell" link.

## Props

| Prop | Type | Description |
|---|---|---|
| `refStr` | string | Bible reference to display (e.g. `"John 3:16"`) |
| `rect` | DOMRect | Bounding rect of the element that triggered the hover |
| `bibleModule` | string | Module to fetch verse text from |
| `onNavigate` | func | `(refStr) => void` — navigate to the reference |
| `onMouseEnter` | func | Cancel the hover-close timer (for sticky card behavior) |
| `onMouseLeave` | func | Schedule the hover-close timer |

## State / Key Logic

- `verses` — fetched via `api.getPassage(bibleModule, refStr)` on each `[refStr, bibleModule]` change. Resets to `null` on every fetch start, showing "Loading…" until resolved.
- Position calculation: if `window.innerHeight - rect.bottom < 180`, the card flips above (`translateY(-100%)`). Left position is clamped to avoid running off the right edge of the viewport. Uses `position: fixed` via inline style; `zIndex: 9999`.
- Rendered into `document.body` via `createPortal`.

## Dependencies

- `api.getPassage`
- `createPortal`

## Notes

- HTML tags are stripped from verse content (`.replace(/<[^>]+>/g, '')`) before display — the hover card is a plain-text preview, not a full rendered verse.
- The parent controls the open/close lifecycle by managing a debounced timer and passing `onMouseEnter`/`onMouseLeave` to cancel/start that timer. See the hover card pattern in `ReaderPane` and `CrossRefPane`.

# frontend/src/components/FootnotePopup.jsx

## Purpose

A minimal floating card that displays a SWORD footnote's text. Unlike `StrongsPopup` and `VerseHoverCard`, it performs no API fetching — the footnote text is already embedded in the verse HTML as a `data-note` attribute on `.footnote-marker` elements, and is passed directly as a prop. Rendered via portal into `document.body` above all other content.

## Props

| Prop | Type | Description |
|---|---|---|
| `text` | string | The footnote text to display |
| `x` | number | Click x position (clamped to keep card on screen) |
| `y` | number | Click y position (clamped to keep card on screen) |
| `onClose` | func | Dismiss the popup |

## State / Key Logic

- No internal state. Purely presentational.
- Position clamped: `left = min(x, window.innerWidth - 300)`, `top = min(y, window.innerHeight - 150)`.
- Full-screen invisible backdrop div catches clicks outside the card and calls `onClose`.

## Dependencies

- `createPortal`

## Notes

- The simplest popup in the codebase. Its no-fetch design is intentional — the same pattern used by `ContextZoomMenu` and `ModulePicker` (full-screen click catcher + fixed-position content).

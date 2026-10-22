# frontend/src/components/DocumentModal.jsx

## Purpose

A thin modal wrapper around `DocumentReader`. Handles portal rendering, backdrop (semi-transparent `bg-black/70` overlay), Escape key to close, and click-on-backdrop to close. Provides the full-screen (mobile) and centered card (desktop: 92vh × max-w-4xl, rounded) layout.

## Props

| Prop | Type | Description |
|---|---|---|
| `documentId` | string | Passed through to `DocumentReader` |
| `isLoggedIn` | bool | Passed through to `DocumentReader` |
| `isAdmin` | bool | Passed through to `DocumentReader` |
| `onAskAI` | func | Passed through to `DocumentReader` |
| `onOpenInCell` | func | Passed through to `DocumentReader` |
| `onClose` | func | Close the modal |
| `onDeleted` | func | Passed through to `DocumentReader` |
| `onRenamed` | func | Passed through to `DocumentReader` |

## State / Key Logic

- No internal state.
- Registers a `keydown` listener for `Escape` that calls `onClose`.
- Click on the outer backdrop div (not the inner content div) calls `onClose` — `stopPropagation()` on the inner div prevents bubbling.

## Dependencies

- `DocumentReader`
- `createPortal`

## Notes

- A pure layout/portal wrapper. All logic lives in `DocumentReader`.
- `z-50` ensures it appears above Cell window overlays.

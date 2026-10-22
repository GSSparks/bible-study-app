# frontend/src/components/VerseDrawer.jsx

## Purpose

A bottom-docked drawer that shows Bible verse text for one or more references (comma-separated OSIS refs). Used when the user clicks a cross-reference marker (`.xref-marker`) or inline verse reference (`.verse-ref`) in the reading pane. Supports internal navigation: clicking a cross-reference inside the drawer pushes a new history entry, and a back button appears. Truncates long passages to 2 verses with an "Open in tab" link for the full passage.

## Props

| Prop | Type | Description |
|---|---|---|
| `osisRef` | string | Comma-separated OSIS references to display (e.g. `"John.3.16,John.3.17"`) |
| `module` | string | Bible module to fetch from |
| `onClose` | func | Close the drawer |
| `onOpenInTab` | func | `(module, ref) => void` — open a reference in a full tab |

## State / Key Logic

- `history` — array of ref strings; `historyIndex` is the current position. `pushRef` appends to the truncated history. Back button decrements `historyIndex`.
- On external `osisRef` prop change, history is reset to `[osisRef]` at index 0.
- Fetches all comma-split refs in parallel via `Promise.all(refs.map(...))`, storing `entries: [{ ref, verses }]`.
- `handleContentClick` catches `.xref-marker[data-refs]` and `.verse-ref[data-ref]` clicks inside the rendered content, calling `pushRef` to navigate within the drawer.
- A VERSE_CAP of 2 verses is shown; truncated passages show "…" and an "Open in tab" link with the full verse count.

## Dependencies

- `api.getPassage`

## Notes

- Structurally mirrors `StrongsDrawer` — both are bottom-docked drawers with internal history stacks. They should be refactored as a unified drawer component if requirements converge.
- Multiple refs (e.g. from TSK's comma-separated lists) are rendered as separate sections within the same drawer body.

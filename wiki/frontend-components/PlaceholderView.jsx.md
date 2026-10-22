# frontend/src/components/PlaceholderView.jsx

## Purpose

A purely presentational placeholder screen for views that are planned but not yet implemented. Displays a centred title, an optional description paragraph, and a "Coming soon" label. Sets an honest expectation rather than faking functionality that does not exist.

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | string | Large heading text |
| `description` | string | Optional explanatory paragraph below the title |

## State / Key Logic

- No internal state. No API calls.

## Dependencies

None.

## Notes

- Used in `AppShell` as a drop-in for nav entries that have been wired up but whose views have not been built yet. Swapping it out for a real component requires only replacing the `PlaceholderView` usage in `AppShell`'s view dispatcher.

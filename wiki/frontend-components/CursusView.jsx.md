# frontend/src/components/CursusView.jsx

## Purpose

Tab container for the Cursus ("scheduled course") feature. Hosts three tabs: Reading Plan, Calendar, and Timeline. Renders the tab bar with icons (labels hidden on mobile, shown at `sm:` breakpoint) and mounts the active tab's content component below.

## Props

| Prop | Type | Description |
|---|---|---|
| `isLoggedIn` | boolean | Passed through to `ReadingPlanTab` and `CalendarTab` |
| `isAdmin` | boolean | Passed through to `ReadingPlanTab` |
| `onOpenInBible` | function | Passed through to `ReadingPlanTab`; called when a passage link is clicked |

## State / key logic

- `activeTab` — string, one of `'reading-plan'` / `'calendar'` / `'timeline'`. Defaults to `'calendar'`.
- `TABS` constant — `[{ id, label, icon, soon? }]` array defining tab order and icons (BookMarked, Calendar, Clock).
- The Timeline tab has `soon: true`, rendering it at 50% opacity.
- The "Cursus" title (`<h1>`) is hidden on mobile (`hidden sm:block`) to save horizontal space. Only icons show at mobile widths; text labels appear at `sm:` and above.
- Tab content is conditionally rendered (not always-mounted) based on `activeTab`.

## Dependencies

- `ReadingPlanTab` — reading plans list and detail view
- `CalendarTab` — full calendar with layers, day images, and print support
- `TimelineTab` — placeholder
- Lucide icons: `BookMarked`, `Calendar`, `Clock`

## Notes

- "Cursus" is Latin for a scheduled course of reading; the term is historically used for daily office / lectionary reading.
- `CursusView` itself is conditionally rendered by `AppShell` (not always-mounted), so tab state resets on navigation away and back.
- The tab content area uses `min-h-0 flex-1 overflow-hidden` to allow each tab component to fill available height with its own internal scroll.

# frontend/src/components/DailyDevotional.jsx

## Purpose

Daily devotional widget. Fetches today's devotional entry from a SWORD Daily Devotional module, auto-selects the Morning or Evening entry based on time of day, and renders it inline. Long entries are truncated with a "Read more" button that opens a full-text modal portal. Admin settings allow picking the active SWORD Daily module.

## Props

| Prop | Type | Description |
|---|---|---|
| `auth` | object | `{ user, isLoggedIn }` |
| `onOpenBibleRef` | function | Called when a verse reference link in the devotional is clicked |

## State / key logic

**Data fetching:**
- `api.getTodaysDevotional()` — fetches today's Morning and Evening entries from the active SWORD Daily module.
- Returns `{ morning: { title, text, reference }, evening: { title, text, reference } }` (or similar shape).

**Auto time-of-day selection:**
- On mount, checks current hour: before 12:00 → default to Morning; 12:00+ → default to Evening.
- `selectedEntry` state (`'morning'` or `'evening'`) controls which entry is shown. User can toggle.

**Text truncation:**
- If entry text exceeds a threshold (~400 chars), truncated version shown with "Read more" button.
- `FullTextModal` — portal (`createPortal` to `document.body`) showing the full entry text. Closes on backdrop click or "×" button.

**Admin `DevotionalSettingsModal`:**
- Rendered as an overlay for admin users.
- Shows a `<select>` populated by `api.listInstalledModules('DAILY')` (SWORD Daily devotional modules).
- Saves selection via `api.updateAppSetting('devotionalModule', value)`.
- Triggered by a gear icon visible to admins only.

**Verse reference links:**
- Entry text may contain `<a>` links with verse references.
- Click handler intercepts these and calls `onOpenBibleRef(reference)` to navigate BiblePanel or CellView.

## Dependencies

- `api` (`../api/client.js`) — `getTodaysDevotional`, `listInstalledModules`, `updateAppSetting`.
- `createPortal` (React DOM) — `FullTextModal` and `DevotionalSettingsModal`.

## Notes

- The widget is self-contained and can be embedded in any view; it is currently used in the Scriptoriums welcome panel / dashboard area.
- SWORD Daily modules have date-keyed entries (e.g. Morning and Evening by Charles Spurgeon). The `getTodaysDevotional` endpoint uses the current server date.
- If no Daily module is configured or installed, the widget renders a placeholder.

# frontend/src/components/CalendarTab.jsx

## Purpose

Full-featured calendar view supporting Gregorian, Julian, and Hebrew calendar systems. Users create named, color-coded layers and add entries to them. Each layer can be shared with other users, imported/exported as JSON, or hidden without deleting. Built-in "holidays" layers (Civil, Hebrew, Western Christian, Eastern Christian) can be generated from server-side sources. A printer button opens `PrintEditor` for calendar PDF export.

## Props

| Prop | Type | Description |
|---|---|---|
| `isLoggedIn` | boolean | Gates all write actions (entry creation, day image, layer ops) |

## State / key logic

**Calendar system:**
- `calSystem` — `'gregorian'` / `'julian'` / `'hebrew'`. Switching converts the current month to the nearest equivalent in the new system using `@hebcal/core`'s `HDate`.
- `year` / `month` — Gregorian or Julian year/month.
- `hebYear` — Hebrew year, only meaningful when `calSystem === 'hebrew'`.
- `switchCalSystem(newSystem)` performs the conversion arithmetic; Gregorian ↔ Julian uses the same month numbers, Gregorian/Julian ↔ Hebrew uses `HDate` for conversion.

**Layers sidebar (`sidebarOpen`):**
- Defaults to `true` on viewports ≥ 768 px, `false` on mobile.
- Lists all layers with eye/hide toggle, edit, delete, export, and share buttons.
- Built-in layers (Civil, Hebrew, Western Christian, Eastern Christian) show a gear icon opening `LayerConfigPopover` for regeneration.
- Shared-by-another-user layers show an X to leave the share.
- Inline create form: name, color swatch selection, calendar system (Gregorian/Hebrew/Julian).
- Inline edit form replaces the row when editing a non-built-in layer.
- Clicking a layer row selects it, loading its entries via `api.listLayerEntries` for the 12-month window starting at the current month. A second click deselects.
- Entry list appears below the selected layer: shows date, title, recurrence indicator (↻), and scripture reference.
- Entry add/edit form: title, description, month, day, year, recurrence (one-time/daily/weekly/monthly/yearly — recurrence templates use `{day}` and `{month}` placeholders filled at save time), icon picker, scripture reference, module.

**Calendar grid:**
- 35-cell grid (5 rows × 7 columns). `getGridInfo(calSystem, year, month, hebYear)` returns `firstDay` (0 = Sun) and `daysInMonth`.
- Cells where `firstDay + daysInMonth > 35` show two stacked half-cells (the "overflow" day) for the last row.
- `DayCellContent` sub-component renders: day number, up to 2 entry titles (compact mode shows 1), optional Hebrew date footer (if any Hebrew layer is visible), background image with a black/40 overlay.
- Clicking a day cell (when logged in) opens a fixed-position popover (`data-day-popover`) showing all entries for that day and a `DayImagePicker`.

**Day images:**
- Each calendar day can have a background image stored server-side keyed by Gregorian date.
- `DayImagePicker` lets the user select from previously uploaded images or upload a new one (resized client-side via `resizeImage` before upload).
- `loadEntries()` also fetches `api.listDayImages` for the overlapping Gregorian months and stores them in `dayImages` keyed `YYYY-MM-DD`.
- `getDayImage(displayDay)` converts the display-system day to a Gregorian date key and looks up `dayImages`.

**Hebrew date display:**
- When a Hebrew-system layer is visible (`hebrewLayerVisible`), `DayCellContent` shows the Hebrew date in `hd.getMonthName() day, year` format below the entries.
- `getCellHebrewDate(system, day, year, month, hebYear)` computes the Hebrew date for Gregorian/Julian cells; returns null for Hebrew-mode cells (the primary date is already Hebrew).

**Entry loading across calendar systems:**
- Entries are stored in the database as Gregorian dates. `loadEntries()` computes the Gregorian date range for the displayed month (`getGregorianRange`), finds all overlapping Gregorian months (`getOverlappingGregorianMonths`), fetches each via `api.listCalendarEntries`, deduplicates by ID, and filters to the range.
- `getDisplayDay(entry, system, year, month, hebYear)` converts an entry's stored Gregorian date to the display system's day number; returns null if the entry falls outside the viewed month.

**Layer sharing:**
- `ShareDialog` is rendered once at the bottom of the component, controlled by `shareLayer` state.
- `handleRemoveSharedLayer` calls `api.leaveCalendarLayerShare` to leave a share.

**Layer import/export:**
- Export: fetches all entries from 2000-2099 and downloads as JSON with `type: 'scriptorium-calendar-layer'`.
- Import: reads a JSON file, creates a new layer, then creates each entry sequentially via `api.createCalendarEntry`.

**Built-in layer config (`LayerConfigPopover`):**
- Civil layer: country picker from `api.listCountries()`; regenerates via `api.generateLayer`.
- Christian layers (Western/Eastern): preset buttons (All, Protestant, Catholic, Eastern Orthodox, Christmas+Easter) load feast keys from `api.getPresetKeys`; individual feast checkboxes from `api.listFeasts`.
- Hebrew layer: no config options, regenerates Diaspora holidays.
- Config (country / enabled feasts) is saved to `api.saveLayerConfig` after generation.

## Dependencies

- `api` — `listCalendarLayers`, `createCalendarLayer`, `updateCalendarLayer`, `deleteCalendarLayer`, `listCalendarEntries`, `listLayerEntries`, `createCalendarEntry`, `updateCalendarEntry`, `deleteCalendarEntry`, `listDayImages`, `setDayImage`, `removeDayImage`, `listDayBgImages`, `uploadCalendarImage`, `deleteDayBgImage`, `generateLayer`, `getLayerConfig`, `saveLayerConfig`, `listCountries`, `listFeasts`, `getPresetKeys`, `shareCalendarLayer`, `unshareCalendarLayer`, `listLayerShares`, `leaveCalendarLayerShare`
- `ShareDialog` — layer sharing modal
- `PrintEditor` — full-screen print/PDF export
- `@hebcal/core` (`HDate`) — Hebrew calendar arithmetic
- `resizeImage` (`../utils/imageUtils`) — client-side image resize before upload

## Notes

- `sidebarOpen` defaults to `window.innerWidth >= 768`. On mobile, the sidebar takes the full width and the calendar grid is hidden behind it; closing the sidebar shows the grid.
- The `justOpened` ref prevents the global click handler (which closes the day popover) from firing on the same click that opened it.
- `RECURRENCE_OPTIONS` templates contain `{day}` and `{month}` placeholders that are substituted with the actual day/month values before the entry is saved.
- `HEB_MONTH_NAMES_LEAP` has 13 entries (Adar I + Adar II) while `HEBREW_MONTHS` has 12.
- The `entryDateHint` computed value shows a cross-system date hint when the selected layer's calendar system differs from the currently viewed system.

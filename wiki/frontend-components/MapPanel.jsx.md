# frontend/src/components/MapPanel.jsx

## Purpose

A slide-in right-side map panel (always mounted, CSS-toggled) that provides three tabs: **Interactive** (a full Leaflet-based Bible map via `BibleMapView`), **Passage** (maps relevant to the current reference, with a zoom+pan image viewer), and **Browse** (all available maps searchable by title). Triggered by Ctrl+M from the Cell environment. On first open when a passage reference is available, automatically switches to the Passage tab.

## Props

| Prop | Type | Description |
|---|---|---|
| `open` | bool | Controls slide-in/out |
| `onClose` | func | Close the panel |
| `pendingMapContext` | object | Passed through to `BibleMapView` (e.g. a place to highlight) |
| `passageRef` | string | Current passage reference for the Passage tab |
| `onOpenInCell` | func | `(ref) => void` — open a Bible reference from the interactive map |
| `onOpenInCodex` | func | `(term) => void` — open a place name in Codex |
| `onOpenInMapView` | func | Navigate to the full Map page |

## State / Key Logic

- `tab` — `'interactive'`, `'passage'`, or `'browse'`.
- `allMaps` — fetched from `api.getAllMaps()` once on mount; passed to `BrowseView`.
- `wasOpen` ref prevents switching to the Passage tab on every reference change — only switches when the panel first opens.
- **`ZoomableImage` (internal)**: Handles mouse-drag pan + mouse-wheel zoom (0.5–10×) for passage map images. Clamps pan to the image bounds based on container size and scale. Uses `passive: false` on `wheel` to prevent browser scroll interference.
- **`PassageMapView` (internal)**: Fetches `api.getMapsForReference(submitted)` when the reference is submitted. Shows prev/next buttons when multiple maps exist. Uses `ZoomableImage`.
- **`BrowseView` (internal)**: Searchable list of all maps. Clicking a map opens it in a detail view with `ZoomableImage` and a back button.
- **`BibleMapView`**: The interactive Leaflet map component (separate file, not documented here).
- `controlsOpen` toggles the `BibleMapView` controls panel.

## Dependencies

- `BibleMapView`
- `api.getAllMaps`, `api.getMapsForReference`

## Notes

- `BibleMapView` is conditionally rendered only when `open` is true to avoid mounting Leaflet until needed.
- The panel is always mounted (even when closed) to preserve the interactive map's Leaflet state.
- `Attribution` (internal) shows the Biblica Open Bible Maps CC BY-SA 4.0 attribution required by the license.

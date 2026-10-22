# frontend/src/components/BibleMapView.jsx

## Purpose

Interactive biblical geography map. Renders a react-leaflet map with selectable tile layers, toggleable data overlays (empires, cities, journey routes), and era quick-navigation. Can be driven by a nonce-based deep-link (`pendingMapContext`) from other views.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | CSS visibility toggle (always-mounted pattern) |
| `pendingMapContext` | object \| null | Nonce object `{ nonce, era, journey }` for deep linking |
| `onPendingMapContextHandled` | function | Called after the nonce is consumed |
| `controlsOpen` | boolean | Whether the controls sidebar starts open (for embedded use) |

## State / key logic

**Map data (static import):**
- `../data/biblicalMapData.js` exports: `TIME_PERIODS`, `EMPIRES`, `JOURNEYS`, `CITIES`.
- `TIME_PERIODS` — array of eras with bounding box coordinates for `flyTo`.
- `EMPIRES` — polygon overlays with names and fill colors.
- `JOURNEYS` — polyline routes (e.g. Exodus, Paul's missionary journeys) with color coding.
- `CITIES` — point markers with name, coordinates, and period associations.

**Tile layers (4 options):**
- Terrain (Stadia Stamen Terrain)
- Topographic (OpenTopoMap)
- Light Gray (CartoDB Positron)
- Satellite (Esri WorldImagery)
- Active tile layer controlled by `activeTileLayer` state.

**Layer toggles:**
- `showEmpires`, `showCities`, `showJourneys` — boolean state; toggled from the Layers tab in the controls pane.

**Controls pane:**
- Slide-in left overlay (z-index 1100, above Leaflet map z-index).
- Three tabs: Era, Journey, Layers.
  - **Era tab** — list of `TIME_PERIODS`; clicking calls `flyTo(period.bounds)` via `MapSync`.
  - **Journey tab** — list of `JOURNEYS`; clicking sets `activeJourney`, centers map on route.
  - **Layers tab** — checkboxes for empire/city/journey visibility + tile layer radio buttons.

**`MapSync` inner component:**
- Uses `useMap()` (react-leaflet hook) to access the Leaflet map instance.
- Watches `activePeriod` and `activeJourney` to call `map.flyTo` / `map.flyToBounds`.
- Necessary because Leaflet map methods must be called inside the `<MapContainer>` render tree.

**Era quick-nav pills:**
- Rendered at the bottom of the map as an overlay row of era name buttons.
- Clicking sets `activePeriod` → `MapSync` flies the map to that era's bounds.

**`pendingMapContext` nonce watch:**
- On new nonce: opens the controls pane, sets the era/journey from the payload, and calls `onPendingMapContextHandled`.

## Dependencies

- `react-leaflet` — `MapContainer`, `TileLayer`, `Marker`, `Polyline`, `Polygon`, `useMap`.
- `leaflet` — direct usage for icon setup.
- `../data/biblicalMapData.js` — static map data.

## Notes

- Always-mounted: the map remains initialized (Leaflet instance alive) when hidden, so returning to the map view is instant.
- Leaflet requires `import 'leaflet/dist/leaflet.css'` to be in the bundle — this is handled at the app level.
- The controls pane uses z-index 1100 to sit above the default Leaflet tile/control z-indices (which range from 200–1000).
- The `MapSync` pattern (inner component using `useMap`) is required because `flyTo` cannot be called outside of `<MapContainer>`'s render context.

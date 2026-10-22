# frontend/src/data/biblicalMapData.js

**Purpose**

Provides the complete static geographic and historical dataset for the interactive Scripture Map feature. Contains time periods, empire boundary polygons, journey route waypoints, and city/location markers — all organized by historical era so the map can be filtered to show only data relevant to a given time period. Also exports a lookup function that maps a Bible reference to its relevant journey and era.

**Key exports / contents**

- `TIME_PERIODS` — array of 10 era objects (`{ id, label, range, description, center, zoom }`):
  `patriarchal`, `egypt`, `exodus`, `judges`, `united`, `divided`, `assyrian`, `exile`, `persian`, `nt`.
  Each includes the default map center and zoom level for that era.

- `EMPIRES` — array of political boundary overlays (`{ id, label, periods, color, polygon }`). Covers Mesopotamian city-states, Egyptian kingdoms, Canaanite city-states, Philistia, the united and divided kingdoms of Israel/Judah, Aram-Damascus, Assyrian Empire, Neo-Babylonian Empire, Persian/Achaemenid Empire, and the Roman and Parthian Empires. `polygon` is an array of `[lat, lng]` pairs.

- `JOURNEYS` — array of 14 journey route objects (`{ id, title, person, period, color, reference, summary, waypoints }`):
  Abraham, Jacob to Haran, Joseph to Egypt, the Exodus, Ruth, Elijah, Jonah, Babylonian Exile, Return from Exile, Jesus's Ministry, Paul's three missionary journeys, Paul's journey to Rome, and the Flight to Egypt. `waypoints` are `{ pos: [lat, lng], label, note }`.

- `CITIES` — array of ~80 location marker objects (`{ id, label, pos, periods, type, note }`). `type` is one of `'major'`, `'minor'`, `'holy'`, or `'region'`. Covers Mesopotamian cities, Egyptian cities, Sinai/Negev sites, Canaanite/Israelite cities, NT sites including Paul's missionary city chain and the seven churches of Revelation.

- `CITY_NAME_INDEX` — case-insensitive city label → `{ cityId, period }` index for quick lookup. The first period in a city's `periods` array is used as the representative era.

- `findJourneyForRef(ref)` — function accepting a human-readable Bible reference string (e.g., `"Acts 13:1"`) and returning `{ journeyId, periodId }` or `null`. Uses the internal `PASSAGE_JOURNEY_MAP` array which maps books (and optional chapter ranges) to journey and era IDs.

**Dependencies / relationships**

- No imports.
- Consumed by the interactive map component(s) to populate Leaflet overlays, markers, and route polylines.
- `findJourneyForRef` is consumed by the passage-guide or map panel to pre-select the relevant journey when the user navigates to a Bible passage.

**Notes**

- All coordinates follow Leaflet's `[latitude, longitude]` convention (not GeoJSON's `[lng, lat]`).
- `PASSAGE_JOURNEY_MAP` entries are matched in order; the first entry whose `books` array includes the lowercased, space-stripped book name and whose optional `chapterRange` contains the chapter number wins. Entries without a `chapterRange` serve as fallbacks.
- Polygon boundary coordinates are approximate historical reconstructions, not precise archaeological surveys.
- Journey waypoints include scripture citation notes, making the data useful both for rendering and for educational tooltip content.

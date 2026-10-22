# TODO.md

**Purpose**

Project task tracker organised by priority. Tracks completed and pending features across five named priority levels, plus a secondary improvements section covering search, navigation/UX, social features, technical debt, and UI/UX tweaks. Checked items (`[x]`) are done; unchecked (`[ ]`) remain open.

**Key exports / contents**

- **Priority 1 — Bible Full-Text Search**: All items complete. Includes a dedicated search-results pane, per-pane module selection, all-words/exact-phrase toggle, highlighted matches, result count, pane navigation, and footnote/cross-reference rendering in results.
- **Priority 2 — First-Run Experience**: Mostly complete. Auto-seed of KJV, BSB, TSK, Clarke, StrongsGreek, StrongsHebrew, and a Henry Alford MD module done. Outstanding: guided setup wizard, non-blocking (SSE/WebSocket) module installation.
- **Priority 3 — Highlights in the Margin**: All items complete. Coloured verse backgrounds, per-chapter fetch, gold margin tick, one-click colour swatches.
- **Priority 4 — Cross-Reference Display Polish**: All items complete. Human-readable references, grouped results, hover verse snippets.
- **Priority 5 — Interlinear Mode**: All items complete.
- **Secondary — Search**: Notes + PDF full-text search upgrades still open. Keyboard shortcut for search bar also open.
- **Secondary — Navigation/UX**: Commentary auto-scroll granularity and print/export are open.
- **Secondary — Social**: Messages/notifications scaffolded but not implemented. Studies feature flagged for more surface area.
- **Secondary — Technical Debt**: Mobile layout done. Offline mode/service worker and user data backup/export are open.
- **Secondary — UI/UX**: Codex search bar styling and Codex Bible-reader integration noted as open.

**Dependencies / relationships**

Standalone planning document. Not imported by any code. Reflects the state of features across the frontend and backend. Cross-references the module seeding work visible in `backend/src/scripts/seedModules.js`.

**Notes**

The most impactful open item is non-blocking module installation (Priority 2) — large SWORD modules currently block the HTTP request with no progress feedback. The secondary "Social" items (messages, notifications) indicate scaffolding exists in the codebase but UI is not yet wired up.

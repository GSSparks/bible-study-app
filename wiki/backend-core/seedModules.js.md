# backend/src/scripts/seedModules.js

**Purpose**

Startup script that installs a curated set of starter modules (both SWORD and Markdown) if they are not already present. Run once before the main server process starts (via the Dockerfile CMD). All failures are caught and logged but never fatal — the server starts regardless, ensuring a failed CrossWire network call does not prevent the app from launching.

**Key exports / contents**

- `STARTER_SWORD` array — six modules installed from the CrossWire repository:
  - `KJV` (King James Version), `BSB` (Berean Standard Bible), `TSK` (Treasury of Scripture Knowledge cross-references), `Clarke` (Clarke's Commentary), `StrongsGreek`, `StrongsHebrew`.
- `STARTER_MD` array — one bundled MD module zip:
  - `how-to-study-new-testament.zip` (read from `/app/seed-modules/` inside the container, which maps to `modules/` in the repo root).
- `seedSword()` — checks for an existing CrossWire repo config (downloads it if missing), builds a set of already-installed module codes, then installs any missing starter SWORD modules via `sword.installModule`.
- `seedMd()` — calls `listMdModules` to find installed MD modules, then installs missing ones by reading the zip buffer and calling `installMdModuleFromZip`.
- `main()` — calls both seeders in sequence, logs start/complete, catches top-level errors non-fatally.

**Dependencies / relationships**

- Imports `NodeSwordInterface` from `node-sword-interface` directly (not via `swordService`).
- Imports `installMdModuleFromZip`, `listMdModules` from `../services/mdModuleService.js`.
- Reads seed zip files from `SEED_DIR` (`../../seed-modules` relative to the script, i.e. `/app/seed-modules` in the container).
- Invoked by the Dockerfile CMD before `node src/index.js`.
- Run independently with `node src/scripts/seedModules.js` for manual seeding.

**Notes**

Module presence is checked by code string (case-sensitive) before attempting install, making the script safely re-runnable. SWORD seeding requires an outbound network connection to CrossWire — if the host has no internet access at startup, SWORD seeding is skipped with a warning. MD module detection uses the `md:` prefix convention from `mdModuleService.listMdModules`.

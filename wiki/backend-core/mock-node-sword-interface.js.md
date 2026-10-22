# backend/__mocks__/node-sword-interface.js

**Purpose**

A hand-written Jest/Vitest manual mock that replaces the native `node-sword-interface` C++ binding in test environments. It stubs every method the real module exposes, returning empty arrays, empty strings, or throwing errors where the real module would throw (e.g. `getStrongsEntry` for unknown keys). This allows the full backend test suite to run on any machine without compiled SWORD binaries or Bible module data files.

**Key exports / contents**

- `default` export — `NodeSwordInterface` class with stubbed methods:
  - `getLocalModules()` → `[]`
  - `getAllLocalModules()` → `[]`
  - `enableMarkup()` / `disableMarkup()` → no-op
  - `getBookText(_module, _book)` → `[]`
  - `getChapterText(_module, _book, _chapter)` → `[]`
  - `getVerseText(_module, _ref)` → `''`
  - `getBibleText(_module)` → `[]`
  - `searchBible(_module, _term, _type)` → `[]`
  - `getModuleDescription(_module)` → `'Mock Module'`
  - `isModuleInUserDir(_module)` → `false`
  - `getStrongsEntry(_key)` → throws `Error('Strong's entry not found: ...')` (matching real SWORD behaviour)
  - `getDictModuleKeys(_module)` → `[]`
  - `getDictModuleEntry(_module, _key)` → `''`
  - `installModule(_source, _module, cb)` → calls `cb()` if provided
  - `uninstallModule(_module)` → no-op
  - `reloadLocalModules()` → no-op
  - `getSwordVersion()` → `'1.9.0'`
  - `getRepoNames()` → `[]`
  - `getModuleList(_repo, _type)` → `[]`

**Dependencies / relationships**

- Activated by the `alias` entry in `vitest.config.js`: `'node-sword-interface'` → `'./__mocks__/node-sword-interface.js'`.
- Consumed indirectly by any test that exercises code paths through `services/swordService.js`.
- Not used in production — the real `node-sword-interface` package is used there.

**Notes**

`getStrongsEntry` deliberately throws rather than returning null, because the real SWORD binding throws for unknown keys and service code catches that exception. Tests that verify Strong's lookup error handling rely on this behaviour. When new methods are added to `node-sword-interface`, add corresponding stubs here to avoid test failures from "method not found" errors.

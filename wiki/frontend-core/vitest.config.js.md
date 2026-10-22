# frontend/vitest.config.js

**Purpose**

Configures the Vitest test runner for the frontend. It provides a jsdom browser environment (so DOM APIs like `DOMParser`, `document`, `localStorage` are available in tests), enables Vitest globals (`describe`, `it`, `expect`, etc. without explicit imports), and registers a setup file that runs before every test suite.

**Key exports / contents**

- `default export defineConfig(...)` — Vitest configuration with:
  - `plugins: [react()]` — same `@vitejs/plugin-react` plugin as `vite.config.js`, required to process JSX in test files.
  - `test.environment: 'jsdom'` — simulates a browser DOM.
  - `test.globals: true` — injects Vitest globals so test files don't need to import `describe`, `it`, `expect`, etc.
  - `test.setupFiles: ['./src/__tests__/setup.js']` — runs the setup file once before each test suite (currently imports `@testing-library/jest-dom` matchers).
  - `test.css: false` — disables CSS processing in tests (speeds up runs; CSS classes are not needed for logic tests).

**Dependencies / relationships**

- `vitest/config` — re-exports Vite's `defineConfig` with Vitest-specific types.
- `@vitejs/plugin-react` — shared with `vite.config.js` but imported here separately for the test pipeline.
- `./src/__tests__/setup.js` — the setup file loaded before each suite.
- Invoked by `npm test`, `npm run test:watch`, and `npm run test:coverage` as defined in `package.json`.

**Notes**

- A separate config file (rather than adding `test:` to `vite.config.js`) keeps the production build config clean and avoids accidental Vitest-only options leaking into Vite's dev/build pipeline.
- Because `globals: true` is set, test files in this project do not import `describe`/`it`/`expect` — they are implicitly available. New test files should follow the same convention.

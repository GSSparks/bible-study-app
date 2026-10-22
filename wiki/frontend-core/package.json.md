# frontend/package.json

**Purpose**

Declares all runtime and build-time dependencies for the frontend application, and defines the npm scripts used to run, build, and test it. The package is private, uses ES modules (`"type": "module"`), and is named `bible-study-frontend`.

**Key exports / contents**

- **Scripts:**
  - `dev` — starts the Vite dev server (port 5173, with API proxy).
  - `build` — produces a production bundle in `dist/`.
  - `preview` — serves the `dist/` build locally for smoke testing.
  - `test` — runs Vitest in single-pass mode.
  - `test:watch` — runs Vitest in interactive watch mode.
  - `test:coverage` — runs Vitest with V8 coverage reporting.

- **Runtime dependencies:**
  - `react` / `react-dom` `^18.3.1` — core React.
  - `react-router-dom` `^7.18.4` — client-side routing.
  - `react-markdown` `^10.1.0` — renders Markdown in study content, notes, etc.
  - `remark-gfm` `^4.0.1` — GitHub Flavored Markdown extension for `react-markdown`.
  - `@uiw/react-md-editor` `^4.1.1` — Markdown editor used in notes and lesson authoring.
  - `react-pdf` `^9.2.1` — PDF rendering in the Library view.
  - `leaflet` `^1.9.4` / `react-leaflet` `^4.2.1` — interactive maps in the Scripture Maps view.
  - `lucide-react` `^1.34.0` — icon library.

- **Dev dependencies:**
  - `vite` `^5.4.8` — build tool and dev server.
  - `@vitejs/plugin-react` `^4.3.1` — Vite React plugin (JSX transform, Fast Refresh).
  - `tailwindcss` `^3.4.13` / `postcss` `^8.4.47` / `autoprefixer` `^10.4.20` — CSS toolchain.
  - `vitest` `^2.0.0` / `@vitest/coverage-v8` `^2.0.0` — test runner and coverage.
  - `jsdom` `^25.0.0` — browser DOM emulation for tests.
  - `@testing-library/react` `^16.0.0` / `@testing-library/jest-dom` `^6.0.0` / `@testing-library/user-event` `^14.0.0` — React component testing utilities.

**Dependencies / relationships**

- Consumed by `npm install` to hydrate `node_modules/`.
- Scripts are invoked from the `frontend/` directory per the development setup in `CLAUDE.md`.
- `vitest.config.js` configures the test environment that `npm test` invokes.

**Notes**

- Version `0.1.0` — not published to npm (`"private": true`).
- `leaflet` requires its CSS to be imported separately in the component that uses the map (`import 'leaflet/dist/leaflet.css'`).

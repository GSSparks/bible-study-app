# frontend/vite.config.js

**Purpose**

Configures Vite for development and production builds. The only substantive setting beyond defaults is a dev-server proxy that forwards all `/api` requests to the Express backend running on port 8088, allowing the React dev server (port 5173) and the Node backend to run as separate processes without CORS issues.

**Key exports / contents**

- `default export defineConfig(...)` — Vite configuration object with:
  - `plugins: [react()]` — enables JSX transforms, Fast Refresh, and React DevTools support via `@vitejs/plugin-react`.
  - `server.proxy['/api']` — proxies API calls to `http://localhost:8088` during development.

**Dependencies / relationships**

- `vite` — `defineConfig` helper.
- `@vitejs/plugin-react` — React fast refresh plugin.
- Used indirectly by all `npm run dev` and `npm run build` invocations in `frontend/package.json`.
- Works alongside `vitest.config.js` (a separate config used only for tests; both use `@vitejs/plugin-react`).

**Notes**

- No build output path customization — uses Vite's default `dist/` directory.
- No path aliases configured; all imports use relative paths.
- The proxy target is hardcoded to `localhost:8088`; this matches the backend `PORT` default and is not picked up from a `.env` file at build time.

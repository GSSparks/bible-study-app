# frontend/src/main.jsx

**Purpose**

This is the React application entry point. It mounts the root `<App>` component into the `#root` DOM element defined in `index.html`. It wraps the entire application in `React.StrictMode` (enabling double-invocation warnings in development) and `BrowserRouter` (providing the HTML5 history API to all nested components via React Router).

**Key exports / contents**

- No named exports — this module exists solely for its side effects (DOM mounting).
- **Synchronous theme restore:** Before calling `ReactDOM.createRoot`, reads `scriptorium-theme` from `localStorage` and sets `data-theme` on `document.documentElement` if a value is found. This runs synchronously during script parse so there is no flash of the wrong theme on page load. The theme is written to `localStorage` by `AppShell` after fetching branding from the server.
- Calls `ReactDOM.createRoot(...).render(...)` once.
- Imports the global stylesheet `./styles/index.css`.

**Dependencies / relationships**

- Imports `react`, `react-dom/client`, `react-router-dom`.
- Imports `./App.jsx` — the root component tree.
- Imports `./styles/index.css` — Tailwind base + any custom global styles.
- Loaded by `index.html` via `<script type="module" src="/src/main.jsx">`.

**Notes**

- `BrowserRouter` is placed here (not inside `App`) so the router context is always available to every component, including lazy-loaded ones.
- `React.StrictMode` wraps the whole tree; effects may fire twice in development. This is intentional and should not be removed.

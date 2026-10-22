# frontend/index.html

**Purpose**

This is the Vite SPA shell document — the single HTML file that the browser loads first. It provides the `#root` mount point for React, declares the page title ("Scriptorium"), and loads the three custom fonts used throughout the application via Google Fonts. The body carries the dark ink background class (`bg-ink text-parchment`) so the page background is correct before JavaScript hydrates.

**Key exports / contents**

- `<div id="root">` — React mounts here via `ReactDOM.createRoot`.
- `<script type="module" src="/src/main.jsx">` — Vite entry point; triggers the entire frontend build graph.
- Google Fonts `<link>` for **Source Serif 4** (display/reading font), **IBM Plex Sans** (UI font), and **IBM Plex Mono** (monospace font).
- `<meta viewport>` and `<meta charset>` basics.

**Dependencies / relationships**

- Referenced by `vite.config.js` (Vite uses this file as the HTML entry point automatically by convention).
- `tailwind.config.js` includes `./index.html` in its `content` array so Tailwind scans this file for class names.
- `main.jsx` is loaded by the `<script>` tag here.

**Notes**

- The font `display=swap` parameter is used so text is readable during the font download.
- Tailwind classes (`bg-ink`, `text-parchment`) are used directly on `<body>` — these are custom design tokens defined in `tailwind.config.js`.

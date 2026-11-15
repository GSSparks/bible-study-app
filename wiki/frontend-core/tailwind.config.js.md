# frontend/tailwind.config.js

**Purpose**

Defines the Tailwind CSS design system for Scriptorium. Extends Tailwind's default theme with a custom color palette and font-family stack. All color tokens reference CSS custom properties (`--color-NAME`) defined in `index.css`, which enables runtime theme switching via `data-theme` attribute selectors on `<html>` while preserving Tailwind's opacity modifier syntax (`bg-ink/50`).

**Key exports / contents**

- `content` — scans `./index.html` and all `./src/**/*.{js,jsx}` files for class names to include in the purged build output.
- **Color tokens (12 total)** — all defined as `'rgb(var(--color-NAME) / <alpha-value>)'`:
  - `ink` — primary dark background (app chrome, sidebars).
  - `panel` — slightly lighter panel surfaces.
  - `rule` — borders and dividers.
  - `parchment` — primary light text on dark backgrounds.
  - `muted` — secondary/helper text.
  - `brass` — accent color (headings, highlights, CTAs).
  - `verdigris` — cross-reference teal accent.
  - `page` — reading-surface background (ReaderPane, DictionaryPane).
  - `pageText` — body text on reading surfaces.
  - `pageMuted` — muted text on reading surfaces.
  - `pageAccent` — accent on reading surfaces.
  - `pageBorder` — borders on reading surfaces.
- **Font families:**
  - `display` — `"Source Serif 4"`, Georgia, serif (Bible text, headings).
  - `ui` / `sans` — `"IBM Plex Sans"`, system-ui, sans-serif (UI controls, labels).
  - `mono` — `"IBM Plex Mono"`, monospace (code, Strong's numbers).
- **Custom font sizes** (sub-xs sizes for UI chrome and labels):
  - `nano` — 9 px / 1 rem line-height (map chrome, tiny indicators).
  - `micro` — 10 px / 1 rem (metadata, timestamps, range labels).
  - `label` — 11 px / 1 rem (uppercase section headers).
  - `fine` — 15 px / 1.5 rem (document body prose).
- `plugins: []` — no third-party Tailwind plugins.

**Runtime theming via CSS variables:**

CSS variable values are defined in `index.css` on the `:root` selector for the default Scriptorium theme. Five additional themes override variables via `[data-theme="..."]` attribute selectors on `<html>`:

| Theme ID | Description |
|---|---|
| `scriptorium` | Default — dark navy & gold |
| `vesper` | Warm sepia & amber |
| `aegean` | Deep ocean & teal |
| `codex` | Charcoal & crimson |
| `gruvbox` | Earthy dark & yellow |

The `data-theme` attribute is set by `AppShell` after fetching branding from the server, and restored synchronously from `localStorage` by `main.jsx` to prevent a flash of wrong theme on page load.

**Dependencies / relationships**

- Consumed by `postcss.config.js` (which registers Tailwind as a PostCSS plugin).
- Color tokens are referenced by class names throughout all JSX components.
- CSS variables are defined in `frontend/src/styles/index.css`.
- Fonts are loaded via Google Fonts in `index.html`.

**Notes**

- The `rgb(var(--color-NAME) / <alpha-value>)` format is required by Tailwind to support opacity modifiers like `bg-ink/50` while keeping values as CSS variables rather than hard-coded hex values.
- Two distinct palettes (dark chrome via `ink`/`panel`/`rule`/`parchment` and light reading surface via `page`/`pageText`/`pageBorder`) allow accent colors and red-letter text to render correctly on both surface types.

# frontend/tailwind.config.js

**Purpose**

Defines the Tailwind CSS design system for Scriptorium. It extends Tailwind's default theme with a custom color palette and a custom font-family stack that reflect the app's dark ink / warm parchment aesthetic. Every custom color token used throughout the component tree is defined here — including separate palettes for the dark application chrome and the lighter "open page" reading surfaces.

**Key exports / contents**

- `content` — scans `./index.html` and all `./src/**/*.{js,jsx}` files for class names to include in the purged build output.
- **Color tokens:**
  - `ink` (`#0D1B29`) — primary dark background (app chrome, sidebars).
  - `panel` (`#1A2634`) — slightly lighter panel surfaces.
  - `rule` (`#2D3745`) — borders and dividers.
  - `parchment` (`#F5F4F1`) — primary light text on dark backgrounds.
  - `muted` (`#8B8F98`) — secondary/helper text.
  - `brass` (`#E8A441`) — accent color (headings, highlights, CTAs).
  - `verdigris` (`#3F7168`) — cross-reference teal accent.
  - `page` (`#EDE6D3`) — reading-surface background (ReaderPane, DictionaryPane).
  - `pageText` (`#2B2620`) — body text on reading surfaces.
  - `pageMuted` (`#6B6152`) — muted text on reading surfaces.
  - `pageAccent` (`#96721C`) — accent on reading surfaces.
  - `pageBorder` (`#CFC3A3`) — borders on reading surfaces.
- **Font families:**
  - `display` — `"Source Serif 4"`, Georgia, serif (used for Bible text, headings).
  - `sans` — `"IBM Plex Sans"`, system-ui, sans-serif (UI controls, labels).
  - `mono` — `"IBM Plex Mono"`, monospace (code, Strong's numbers).
- `plugins: []` — no third-party Tailwind plugins.

**Dependencies / relationships**

- Consumed by `postcss.config.js` (which registers Tailwind as a PostCSS plugin).
- Color tokens are referenced by class names throughout all JSX components and in `index.html`'s `<body>` tag.
- Fonts are loaded via Google Fonts in `index.html`.

**Notes**

- The ink/parchment palette was sampled from UI mockup images; the verdigris and page-surface colors were left from the original design because they are functional accents rather than core brand colors.
- Using two distinct palettes (dark chrome vs. light page surface) lets red-letter Bible text and other accent colors render correctly regardless of which surface they sit on.

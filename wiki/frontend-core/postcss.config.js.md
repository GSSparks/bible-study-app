# frontend/postcss.config.js

**Purpose**

Configures the PostCSS pipeline for the frontend build. It registers two PostCSS plugins: Tailwind CSS (which generates utility classes) and Autoprefixer (which adds vendor prefixes for cross-browser CSS compatibility). This file is the minimal standard configuration required for Tailwind to work inside a Vite project.

**Key exports / contents**

- `default export` — PostCSS config object with:
  - `plugins.tailwindcss: {}` — runs Tailwind's JIT engine on all CSS processed by Vite.
  - `plugins.autoprefixer: {}` — adds `-webkit-`, `-moz-`, etc. prefixes where needed.

**Dependencies / relationships**

- Consumed automatically by Vite during `dev` and `build` whenever it processes CSS files.
- Works in tandem with `tailwind.config.js` (which Tailwind reads to discover content paths and theme tokens).
- `postcss` itself is a `devDependency` in `package.json`.

**Notes**

- No custom PostCSS plugins beyond the standard Tailwind + Autoprefixer pair.
- No special configuration options are passed to either plugin; both run with defaults.

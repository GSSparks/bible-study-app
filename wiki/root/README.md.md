# README.md

**Purpose**

The public-facing project README displayed on the repository homepage. It introduces Scriptorium to prospective users and contributors, explains the full feature set, documents how to run the stack, and serves as the primary user-facing reference for environment variables, keyboard shortcuts, and module formats.

**Key exports / contents**

- Feature inventory: Cell (tiled reader panes), Interlinear mode, full-text Bible search, Codex (topical lookup), AI Companion (Study Assistant, Word Study, Phrase Study), Books reader, Bible Maps (540+ Biblica Open Bible Maps), Notes, Personal modules, Markdown modules, Cursus (reading plans), PDF library, Scriptoriums (study groups), Studies, Fellows, Admin panel, Mobile layout.
- Stack summary: Node.js 20/Express + `node-sword-interface`, PostgreSQL 16/Prisma, React 18/Vite/Tailwind, Anthropic API, Biblica Open Bible Maps submodule.
- Quick-start: `cp .env.example .env` → fill secrets → `docker compose up --build` → open `http://localhost:8088`.
- First-run flow: admin bootstrap, auto-seeded modules (KJV, BSB, TSK, Clarke, StrongsGreek, StrongsHebrew).
- Cell pane types table: Bible, Commentary, Dictionary, Cross-References, Passage Guide, Documents, Search Results, Links.
- Keyboard shortcuts table for the Cell view.
- Reference parsing examples: single verse, range, cross-chapter range, comma-separated, whole chapter.
- Strong's, cross-reference, and footnote behaviour.
- Notes and text selection interactions.
- Codex sources: SWORD dicts, General Books, Wikipedia, Merriam-Webster, AI Overview.
- Bible Maps: Atlas tab, Scripture Refs tab, passage pin behaviour.
- Study Assistant, Word Study, Phrase Study feature descriptions.
- Books reader: TOC auto-generation, highlighting, note markers, install paths for SWORD/CCEL/Markdown book modules.
- Scriptoriums: Scroll, About, Studies, Resources, Members, Daily Devotional.
- Studies: lessons, AI drafts, progress, discussion, resources, export.
- Markdown module folder layout, `module.json` schema, file format per type.
- Environment variables reference table.
- Project layout tree (routes, services, frontend components, hooks, utils).
- Known limitations: synchronous module install, basic PDF search, no TLS, first-match book highlights.
- Design palette description.

**Dependencies / relationships**

Referenced by anyone evaluating or setting up the project. Does not import code; it references the same environment variables documented in `.env.example` and `backend/src/config.js`. Screenshots referenced from `docs/screenshot_*.png`.

**Notes**

The README's environment variable table and the `.env.example` file should be kept in sync. The project layout tree is the best quick-reference for locating any file in the codebase.

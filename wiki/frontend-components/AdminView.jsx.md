# frontend/src/components/AdminView.jsx

## Purpose

Admin control panel. Only rendered for users with `role === 'admin'`. Provides 8 tabs covering user management, module installation/visibility, content moderation, media management, system metrics, branding, devotional module selection, and the AI overview cache (Codex).

## Props

None — AdminView is rendered unconditionally; access control is handled at the route/AppShell level.

## State / key logic

**Tab system:** `tab` state selects among: `Users`, `Modules`, `Posts`, `Media`, `Metrics`, `Branding`, `Devotionals`, `Codex`. Each tab is a self-contained sub-component.

**UsersTab:**
- Fetches all users via `api.listUsers()` and the current admin via `api.me()` in parallel on mount.
- **Table columns:** Username (with "(you)" for the current admin), Role, Status, AI, Created, Last login, Actions.
- **Role badge** — clickable toggle (user ↔ admin); calls `api.updateUser(id, { role })`.
- **Status badge** — clickable toggle (active ↔ suspended); calls `api.updateUser(id, { suspended })`. Suspended rows are dimmed. Suspended users are blocked immediately on their next API request — no session destruction required.
- **AI badge** — clickable toggle (on ↔ off); calls `api.updateUser(id, { aiEnabled })`. Disabling blocks the Study Assistant and Word Study routes.
- **Delete** — shows inline "Delete? yes / no" confirmation before calling `api.deleteUser(id)`. Hard-deletes the user and all their data via Prisma cascade.
- **Self-action guard:** All toggle and delete buttons are disabled on the current admin's own row (enforced on the backend too).
- Per-action loading state tracked via a `Set` of `"${userId}:field"` strings so multiple actions can be in flight simultaneously on different rows.

**ModulesTab:**
- **Type filter:** BIBLE / COMMENTARY / DICT / BOOK buttons filter both lists.
- **Language filter dropdown** — derived from the `language` field on available module objects. Shows count per language (e.g. "English (847)"). English sorts first, rest alphabetically. Only shown when modules from more than one language are present. Resets on type/repo change.
- **"Hide already installed" checkbox** — default on; filters the browse list to exclude modules already in the Installed column. Cross-references by module name.
- **Text search** — applies on top of the language filter.
- **Language badge** — each browse card shows the module's ISO language code as a small tag.
- **Repository browse + install:** `api.listAvailableModules(repo, type)` → list with language/text filters applied. Install button calls `api.installModule(name)` (synchronous; large modules block).
- **Installed modules:** `api.listModuleVisibility(type)`. Each row has a visibility toggle and a remove button.
- **Manual .zip upload:** `FormData` POST to `/api/modules/upload`.

**PostsTab:**
- Lists all posts across the platform via `api.listAdminPosts()`. Admin can delete any post.

**MediaTab:**
- Lists all uploaded files (avatars, banners, post media). Admin can remove any file.

**MetricsTab:**
- Shows database health, user counts (total/admins/active windows), and content counts (notes, highlights, bookmarks, personal modules).

**BrandingTab:**
- App name and site URL fields. Saved via `api.saveBrandingSettings({ name, siteUrl })`.

**DevotionalsTab:**
- Loads available devotional modules via `api.listDevotionalModules()` and the currently active selection via `api.getDevotionalSettings()` in parallel on mount.
- Dropdown to select a module; saved via `api.setDevotionalModule(moduleCode)` (POST `/api/devotionals/settings`).
- If no devotional modules are installed, shows a prompt to install one from the Modules tab.

**CodexTab:**
- AI overview cache management. Lists cached Factbook summaries.
- **Export as .zip Markdown module:** `api.exportCodexModule()` → downloads a `.zip` ready to drop into `MD_MODULES_PATH`.
- Individual cache entries can be deleted.

## Dependencies

- `api` (`../api/client.js`) — `listUsers`, `updateUser`, `deleteUser`, `me`, `createUser`, `listModuleVisibility`, `setModuleVisibility`, `listAvailableModules`, `installModule`, `removeModule`, `listAdminPosts`, `deleteAdminPost`, `listAdminMedia`, `deleteAdminMedia`, `getAdminMetrics`, `getBrandingSettings`, `saveBrandingSettings`, `listDevotionalModules`, `getDevotionalSettings`, `setDevotionalModule`, `listCodexCache`, `deleteCodexEntry`, `exportCodexModule`, `listRepositories`

## Notes

- Module installation is synchronous on the server; installing large SWORD modules will block the HTTP request for several seconds (known limitation — no SSE/WebSocket progress).
- The Codex export zip format matches the Markdown module spec: `module.json` + per-book `.md` files with `## chapter:verse` headings.
- `langLabel()` helper (module-level) maps ISO 639-1/3 codes to human-readable names via `Intl.DisplayNames` with a hand-coded fallback table for SWORD-common codes (`grc` → Ancient Greek, `hbo` → Ancient Hebrew, `lat` → Latin, `syr` → Syriac, etc.).

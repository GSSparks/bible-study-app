# frontend/src/components/ScriptoriumsView.jsx

## Purpose

Study groups ("Scriptoriums") view. Always-mounted in `AppShell`. Uses URL-based routing to switch between the scriptorium list/detail, study reader (`StudyDetail`), and study builder (`StudyBuilder`). Each section persisted per-scriptorium in `localStorage`.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | CSS visibility toggle (always-mounted pattern) |
| `auth` | object | `{ user, isLoggedIn }` |
| `currentPath` | string | Current URL pathname — used for URL-based routing within the view |
| `onNavigate` | function | Pushes a new URL (calls `history.pushState`) |
| `onOpenReference` | function | Called when a verse link in a post/resource is clicked |
| `pendingCodexQuery` | object \| null | Nonce from AppShell for Codex/dictionary deep link |

## State / key logic

**URL routing within ScriptoriumsView:**
- `urlIsBuilder` — path matches `/scriptoriums/:id/builder[/:studyId]` → renders `StudyBuilder`.
- `urlStudyId` — path matches `/scriptoriums/:id/study/:studyId` → renders `StudyDetail`.
- Otherwise: renders `ScriptoriumSidebar` + `ScriptoriumDetail` (or empty right pane).

**`ScriptoriumSidebar` sub-component:**
- Three sections: Mine (member of), Browse (public), Invites (pending membership invites).
- Each section is collapsible. Clicking a scriptorium navigates to `/scriptoriums/:id`.
- "Create" button (for logged-in users): `CreateScriptoriumModal`.

**`ScriptoriumDetail` sub-component:**
- 5 tabs: Scroll (wall feed), About, Studies, Resources, Members.
- Active tab persisted to `localStorage` key `scriptorium_section_:id`.
- **Scroll tab:** `ProfileWallView` scoped to scriptorium (posts associated with this scriptorium).
- **About tab:** Description, tags. Admin/owner can edit. AI banner generation via `api.generateBanner`.
  - Tag system: text input + keyword suggestion via `api.suggestTags(description)`.
- **Studies tab:** `ScriptoriumStudiesTab` — study card grid with create/import.
- **Resources tab:** Link / library-note / document resource cards with favicon thumbnails (via `https://www.google.com/s2/favicons?domain=...`). CRUD for owners/admins.
- **Members tab:** Member list with roles. Owner can promote/demote/remove.

**Widgets:**
- `WeeklyVerseWidget` — shows the week's featured verse (fetched from app settings).
- `ActiveStudiesWidget` — lists in-progress studies for the current user within the scriptorium.

## Dependencies

- `StudyDetail` — lesson reader (rendered when `urlStudyId` is set).
- `StudyBuilder` — lesson editor (rendered when `urlIsBuilder` is set).
- `ScriptoriumStudiesTab` — study card grid within the Studies tab.
- `ProfileWallView` — wall feed within the Scroll tab.
- `api` (`../api/client.js`) — scriptorium CRUD, membership, posts, resources, banner generation.
- `createPortal` (React DOM) — used for modals/overlays rendered to `document.body`.
- `getAvatarColor` (`../utils/avatar.js`)

## Notes

- Always-mounted: switching away from Scriptoriums preserves the open scriptorium, active tab, and scroll position.
- URL-based routing (not React Router) means `currentPath` is passed as a prop from `AppShell`, which parses `location.pathname`.
- `localStorage` key `scriptorium_section_:id` persists the active tab per-scriptorium so returning to a group returns to the same tab.
- Resource types: `link` (external URL with favicon), `library-note` (note from the library), `document` (uploaded PDF from the library).

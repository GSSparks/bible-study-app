# frontend/src/components/AIChatPane.jsx

## Purpose

Lightweight single-session AI chat pane used inside `WorkspaceLayout` as the passageguide pane type. Manages one active conversation at a time (unlike `StudyAssistant` which manages multiple tabs). Supports passage overview, word study, phrase study, and document chat triggered by nonce-based requests. Provides session resume from a searchable dropdown, note attachment, and save-as-note.

## Props

| Prop | Type | Description |
|---|---|---|
| `focusedReference` | string | Current Bible reference; shown as context label and used in `send()` |
| `defaultBibleModule` | string | Bible module for context building |
| `isLoggedIn` | boolean | Shows sign-in prompt when false |
| `pendingAiRequest` | object \| null | Nonce object `{ nonce, type, ...payload }` to auto-trigger a study |

## State / key logic

**Single-session model:**
- `messages` — array of `{ role, content }` for the current conversation.
- `activeSessionId` — ID of the persisted `StudySession` on the server (null until first response).
- `chatTitle` — display name in the session selector dropdown.
- `sessions` — recent sessions from `api.listRecentSessions()`, searchable via `sessionSearch`.

**Session management:**
- `startNewChat()` — resets all conversation state.
- `resumeSession(session)` — loads a prior session's messages and ID.
- **Rename:** `renaming` state shows an inline text input. `commitRename()` calls `api.renameSession(id, title)`.
- Session dropdown: search-filtered list of recent sessions. `filteredSessions` = sessions matching `sessionSearch`.

**`send()` — sends a message in the current conversation:**
1. Appends user message.
2. Builds context: if `focusedReference` + `defaultBibleModule` are set, calls `api.buildContext({ sources: [{ module, reference, kind: 'bible' }], noteIds: [...] })`.
3. Calls `api.askAssistant({ context, messages, sessionId, title })`.
4. Appends assistant reply; sets `activeSessionId` from first response.
5. Refreshes session list.

**Auto-triggered study types (via `pendingAiRequest` nonce):**
- `overview` → `runOverview({ module, reference })`: builds full context with all commentaries + word studies, then `api.askAssistant`.
- `phraseStudy` → `runPhraseStudy({ module, phrase, strongsSequence })`: calls `api.buildPhraseStudyContext`, then `api.askPhraseStudy`. Loading label: "Scanning the whole Bible…".
- `wordStudy` → `runWordStudy({ module, strongsKey })`: calls `api.buildWordStudyContext`, then `api.askWordStudy`. Loading label: "Scanning the whole Bible…".
- `document` → `runDocumentChat({ documentId })`: builds context with `documentIds`, then `api.askAssistant`.

**Note attachment:**
- `showNotePicker` toggle shows a search input + results list.
- `toggleAttachNote(note)` adds/removes notes from `attachedNotes`.
- `searchNotes(q)` calls `api.listNotes({ q })` → `noteResults`.

**Save-as-note:**
- Each assistant message has a hover "save as note" button.
- `saveAsNote(content, idx)` creates a Note record; shows "✓ saved" for 1500ms via `savedIdx` state.

**Message rendering:**
- User messages: right-aligned rounded bubble (bg-panel).
- Assistant messages: left-aligned with brass left border, rendered via `react-markdown` + `remark-gfm`.
- Tables, lists, headings, code all styled via Tailwind class selectors in the container div.

**Auto-scroll:** `messagesEndRef` scrolled into view on every `messages` update.

**Input textarea:**
- Auto-grows (`scrollHeight`-based) up to `max-h-32`.
- `Enter` sends; `Shift+Enter` inserts newline.
- Context label shown above input when `focusedReference` and `defaultBibleModule` are set.

## Dependencies

- `api` (`../api/client.js`) — `askAssistant`, `askWordStudy`, `askPhraseStudy`, `buildContext`, `buildWordStudyContext`, `buildPhraseStudyContext`, `listRecentSessions`, `renameSession`, `createNote`, `listNotes`.
- `react-markdown` — assistant message rendering.
- `remark-gfm` — GitHub Flavored Markdown (tables, strikethrough, etc.).

## Notes

- `AIChatPane` is the pane-embedded counterpart to `StudyAssistant`. Key differences:
  - `AIChatPane`: single active session, session resume via dropdown, used in `WorkspaceLayout` pane grid.
  - `StudyAssistant`: multi-tab conversations, used in `AICompanionView` and older `StudyMode`.
- No "save as personal module" option (that is in `StudyAssistant` only).
- The `handledNonceRef` pattern prevents re-running the same `pendingAiRequest` on re-renders.
- Word/phrase study first-run can take up to a minute server-side (full-Bible index building); the loading label communicates this to the user.

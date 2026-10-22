# frontend/src/components/StudyAssistant.jsx

## Purpose

Multi-conversation LLM chat panel for AI-powered Bible study. Supports four conversation kinds: freeform chat, passage overview, word study (Strong's), and phrase study. Each conversation is a separate tab. Integrates with the Claude API via the backend's context-building and tool-use endpoints.

## Props

| Prop | Type | Description |
|---|---|---|
| `focusedReference` | string | Current Bible reference passed as context |
| `defaultBibleModule` | string | Bible module for context building |
| `isLoggedIn` | boolean | Gates all AI functionality |
| `pendingRequest` | object \| null | Nonce object `{ nonce, type, ...payload }` to auto-trigger a conversation |
| `onRequestHandled` | function | Called after the nonce is consumed |

## State / key logic

**Conversation model:**
Each conversation object: `{ id, kind, title, meta, messages, sessionId, attachedNotes, loading, loadingLabel, error }`

- `conversations` — array of open conversation tabs.
- `activeConvId` — which tab is displayed.
- Conversation tabs are always-mounted within this component (CSS visibility); switching tabs preserves message history and scroll position.

**Conversation kinds and launchers:**
- `chat` — `runAskQuestion(question)`: builds a context from `focusedReference` + attached notes, then calls `api.askAssistant`.
- `overview` — `runOverview({ module, reference })`: builds context with `includeAllCommentaries: true, includeWordStudies: true`, then calls `api.askAssistant`.
- `wordStudy` — `runWordStudy({ module, strongsKey })`: calls `api.buildWordStudyContext` (full-Bible occurrence index), then `api.askWordStudy`. Loading label: "Scanning the whole Bible…".
- `phraseStudy` — `runPhraseStudy({ module, phrase, strongsSequence })`: calls `api.buildPhraseStudyContext` (exact text or original-word sequence match), then `api.askPhraseStudy`. Loading label: "Scanning the whole Bible…".
- `resumeSession` — reloads an existing `StudySession` from the server by ID and messages.

**`send()` — continues the active conversation:**
- Appends user message, builds fresh context, calls `api.askAssistant({ context, messages, sessionId, title })`.
- Sets `sessionId` on the conversation from the first response (server creates the session on first call).

**Note attachment:**
- Each conversation has `attachedNotes` array.
- Note picker: search input → `api.listNotes({ q })` → toggle notes in/out of `attachedNotes`.
- Attached note IDs are passed to `api.buildContext({ noteIds: [...] })`.

**Save-as-note:**
- Each assistant message has a "save as note" hover button.
- Creates a Note record via `api.createNote` with `tags: ['assistant'], fromAssistant: true`.

**Save-as-personal-module:**
- Saves the assistant message as a `PersonalEntry` in the user's personal commentary/dictionary.
- Calls `api.createPersonalEntry({ module, key, body })`.

**`pendingRequest` nonce watch:**
- Switches on `type`: `overview` → `runOverview`; `phraseStudy` → `runPhraseStudy`; `wordStudy` → `runWordStudy`; default chat → `runAskQuestion`.
- Skips if nonce already handled.

## Dependencies

- `api` (`../api/client.js`) — `askAssistant`, `askWordStudy`, `askPhraseStudy`, `buildContext`, `buildWordStudyContext`, `buildPhraseStudyContext`, `listRecentSessions`, `createNote`, `createPersonalEntry`, `listNotes`.
- `react-markdown` + `remark-gfm` — renders assistant message content.

## Notes

- `StudyAssistant` is used in both `WorkspaceLayout` (as the passageguide pane) and `AICompanionView`. In `WorkspaceLayout` it operates within a Cell pane. In `AICompanionView` it is always-mounted in a hidden state until activated.
- Word/phrase study context building can take up to a minute on first request because it builds a full-Bible occurrence index and caches it in-memory server-side.
- The backend study assistant uses a tool-use loop: Claude can call a `get_passage` tool mid-response to fetch additional Bible text, which the backend resolves and feeds back before producing the final reply.
- `StudyAssistant` differs from `AIChatPane` in that it manages multiple conversation tabs; `AIChatPane` manages only a single active session at a time.

# frontend/src/components/PassageGuidePane.jsx

## Purpose

The AI study assistant panel that lives in the right-side pane of the Cell reading environment. It handles four distinct study types — passage guide, passage overview, phrase study, and word study — all surfaced through one persistent chat interface. The panel also supports document chat (asking the AI about a PDF). It maintains a session history, shows a session-selector dropdown with search, and allows attaching personal notes as extra context. Study results can be saved directly as notes or as personal dictionary entries (for word/phrase studies).

## Props

| Prop | Type | Description |
|---|---|---|
| `reference` | string | Currently focused Bible reference; drives auto-load of cached guides |
| `module` | string | Current Bible module |
| `isLoggedIn` | bool | When false, renders a sign-in prompt |
| `pendingAiRequest` | object | `{ nonce, type, module?, reference?, phrase?, strongsSequence?, strongsKey?, documentId? }` — incoming trigger from parent (ReaderPane "Ask about this", StrongsDrawer "Word study", etc.) |
| `onPersonalDictionarySaved` | func | Callback after a word study is saved to My Word Studies |

## State / Key Logic

- **Session management**: `sessions` list (from `api.listRecentSessions`) is searchable via `sessionSearch`. Active session tracks `activeSessionId`, `activeSessionKind`, `activeSessionUpdatedAt`, and `sessionTitle`. `resumeSession` restores `messages` from the session object. `startNew` clears all of these.
- **Auto-load on reference change**: `useEffect` on `[reference, isLoggedIn]` calls `api.getGuideForReference(reference)` and silently resumes the cached guide if one exists, or clears state if none.
- **Pending request routing**: A `handledNonceRef` guards against re-running the same nonce. Type-switches to `runOverview`, `runPhraseStudy`, `runWordStudy`, or `runDocumentChat`.
- **`runPassageGuide`**: Builds context via `api.buildContext` with `includeAllCommentaries: true`, then calls `api.askAssistant`. The user message is constructed with a structured prompt requesting a 5-part study guide.
- **`runWordStudy`**: Calls `api.buildWordStudyContext({ module, strongsKey })` (which scans the entire Bible — can take ~60 s on first call), then `api.askWordStudy`. Sets `activeStudyKind` and `activeStudyKey` to unlock "save to My Word Studies".
- **`runPhraseStudy`**: Calls `api.buildPhraseStudyContext` with either an exact phrase or a Strong's sequence, then `api.askPhraseStudy`.
- **Chat (`send`)**: Builds fresh context on every message, appending to the existing `messages` array, sending `sessionId` if one exists.
- **Saving**: `saveAsNote` creates a note tagged `['assistant']`. `saveAsDictEntry` calls `api.savePersonalModule` with type `DICT`.
- **Note attachment**: `showNotePicker` reveals a search-as-you-type note picker; selected notes are shown as chips and included via `noteIds` in context.
- **Inline Markdown renderer**: `markdownToHtml` converts assistant replies to HTML (headings, lists, blockquotes, tables) with styled Tailwind classes — used for display only, not editable.
- **`_header` field on messages**: Display-only metadata (the reference or word being studied) rendered as a divider line, not sent to the API.

## Dependencies

- `api.listRecentSessions`, `api.getGuideForReference`, `api.renameSession`, `api.buildContext`, `api.buildPhraseStudyContext`, `api.buildWordStudyContext`, `api.askAssistant`, `api.askWordStudy`, `api.askPhraseStudy`, `api.createNote`, `api.savePersonalModule`, `api.listNotes`

## Notes

- The `messagesEndRef` auto-scroll on `messages` change keeps the latest reply visible.
- `sessionIdRef` is a ref (not state) to avoid stale closures in `send` — the session ID from a new session mid-flight must be accessible without triggering re-renders.
- `loadingLabel` changes between study types because phrase/word studies scan the whole Bible and users need the "can take a minute" warning.
- `toApiMessages` strips the `_header` display field before sending to the backend.

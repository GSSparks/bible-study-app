# frontend/src/components/AICompanionView.jsx

## Purpose

Standalone AI companion page. Shows a welcome panel with example questions and a freeform input on first load. Once a conversation is started, `StudyAssistant` takes over the main area. A right sidebar (desktop) provides tool buttons (passage overview, phrase study, compare translations) and a recent sessions list.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | Controls rendering (conditionally rendered by AppShell) |
| `auth` | object | `{ user, isLoggedIn }` |
| `defaultBibleModule` | string | Passed to StudyAssistant |
| `pendingOverviewRequest` | object \| null | Nonce from AppShell for a cross-view passage overview |
| `pendingPhraseStudyRequest` | object \| null | Nonce from AppShell for a cross-view phrase study |
| `pendingDocumentRequest` | object \| null | Nonce from AppShell to chat about a document |
| `onRequestHandled` | function | Called after any pending nonce is consumed |

## State / key logic

**Mode:**
- `mode === 'welcome'` — welcome panel shown; `StudyAssistant` mounted but hidden.
- `mode === 'chat'` — welcome panel hidden; `StudyAssistant` visible.
- Mode switches to `'chat'` when any conversation is started.

**Welcome panel:**
- Example question cards: clicking one pre-fills and submits a question (transitions to `'chat'` mode).
- Freeform text input: submitting also transitions to `'chat'`.

**Right sidebar (desktop):**
- **Tools section:** Three buttons:
  - "Ask a Question" — opens `StudyAssistant` in chat mode.
  - "Study a Passage" — opens `ReferenceModal` to pick a passage, then triggers overview via `pendingRequest` to `StudyAssistant`.
  - "Compare Translations" — opens `CompareModal` to pick a reference and multiple modules; renders a comparison grid.
- **Recent Sessions list** — fetched via `api.listRecentSessions()`. Clicking a session calls `StudyAssistant`'s `resumeSession`.

**`ReferenceModal`:**
- Dialog with a reference input and module selector.
- Confirm → sets a `pendingRequest` nonce of type `overview` on `StudyAssistant`.

**`CompareModal`:**
- Dialog with reference input + multi-select for installed Bible modules.
- On submit, calls `api.getVerseInModules(reference, modules)` and renders a side-by-side table.

**Nonce forwarding:**
- `pendingOverviewRequest`, `pendingPhraseStudyRequest`, `pendingDocumentRequest` from AppShell are forwarded directly to `StudyAssistant` as its `pendingRequest` prop (with nonce). On receipt, automatically switches mode to `'chat'`.

**`StudyAssistant` always-mounted (within this view):**
- Mounted with `hidden` className when `mode === 'welcome'`.
- This preserves conversation tabs across welcome ↔ chat transitions.

## Dependencies

- `StudyAssistant` — AI chat engine; always-mounted within this view.
- `api` (`../api/client.js`) — `listRecentSessions`, `getVerseInModules`, `listInstalledModules`.

## Notes

- This view is conditionally rendered by `AppShell` (not always-mounted at the app level) because it is a discrete navigation destination.
- The nonce forwarding chain: `AppShell` sets `pendingAiOverview` → passes to `AICompanionView` as `pendingOverviewRequest` → forwarded to `StudyAssistant` as `pendingRequest`. `AICompanionView` also switches `mode` to `'chat'` on receipt.
- `CompareModal` is the only place in the app where multiple Bible modules are loaded simultaneously for the same reference — useful for translation comparison studies.

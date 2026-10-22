# frontend/src/components/DictionaryPane.jsx

## Purpose

Dictionary and reference pane used inside `MainLayout` and `WorkspaceLayout`. Supports three operational modes: probing a reference for content, displaying a Bible reference's contextual dictionary entry, and browsing the dictionary by filtered key search. Handles Strong's links, cross-references, footnotes, and inline TOC injection.

## Props

| Prop | Type | Description |
|---|---|---|
| `tabState` | object | useTabbedWindow tab state for this pane |
| `onTabUpdate` | function | Updates tab state |
| `focusedReference` | string | Current Bible reference for reference-mode lookups |
| `pendingKey` | string \| null | Dictionary entry key to open immediately |
| `pendingFilter` | string \| null | Pre-filled filter text |
| `pendingTabId` | string \| null | Tab ID targeted by the pending key action |
| `onKeyHandled` | function | Called after pendingKey is consumed |
| `refreshNonce` | number | Incrementing nonce to force content reload |
| `auth` | object | `{ user, isLoggedIn }` |

## State / key logic

**Modes:**
- `probing` — fires a low-cost API request to check whether the focused reference has dictionary content. Transitions to `reference` mode if content is found, `keys` mode otherwise.
- `reference` — shows verse-contextual content (e.g. all Strong's entries for words in a verse). Entry HTML rendered via `innerHTML`.
- `keys` — entry browser. Text filter input (debounced), key list from `api.listDictKeys(module, filter)`. Clicking a key loads entry HTML.

**Greek transliteration:** Filter input automatically converts typed Greek transliteration to Unicode for searching Greek lexicons.

**Bookmarks:** Entries can be bookmarked via `api.createBookmark` / `api.deleteBookmark`. Uses optimistic UI — bookmark state toggled immediately, reverted on error.

**`injectTocLinks(html)`:** Applied to entry HTML from `utils/dictHtml.js` — detects and processes ISBE-style inline tables of contents, converting them to clickable anchor links.

**Link handling within entry HTML:**
- Strong's number links (e.g. `<a data-strongs="G3056">`) → dispatches `openStrongsInDictionary` via callback.
- Dict cross-ref links → loads the referenced entry.
- Footnote markers → toggles footnote display inline.
- Verse reference links → opens BiblePanel or CellView via `onOpenVerseRef` callback.

**`pendingKey` watch:** `useEffect` on `pendingKey`; if it matches this tab's `pendingTabId`, loads the specified entry and calls `onKeyHandled`.

**`refreshNonce` watch:** Re-fetches the current entry when nonce changes (used after personal module entry updates).

## Dependencies

- `utils/dictHtml.js` — `injectTocLinks`.
- `api` (`../api/client.js`) — `getDictEntry`, `listDictKeys`, `probeReference`, `createBookmark`, `deleteBookmark`.

## Notes

- The probing mode avoids a blank pane when the dictionary has no content for the current reference — it falls through to the key browser automatically.
- Strong's markup in Bible text is emitted by SWORD with `sword.enableMarkup()`; the resulting links are handled here with `data-strongs` attributes.
- Personal module entries (user-created commentary/dictionary) surface alongside SWORD module entries — same API endpoints, filtered by module prefix.

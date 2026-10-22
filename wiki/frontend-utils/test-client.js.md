# frontend/src/__tests__/api/client.test.js

**Purpose**

Unit tests for `frontend/src/api/client.js`. Verifies that each API method constructs the correct URL and request options, that the `request()` wrapper handles errors and edge cases correctly, and that the `Content-Type` header behavior is correct (set for JSON bodies, omitted for FormData). Uses Vitest with `vi.spyOn` to mock `global.fetch` without network calls.

**Key exports / contents**

No exports — test file only. Test suites organized by feature area:

- **Auth** (`api.me`, `api.login`, `api.logout`) — verifies URL, HTTP method, JSON body serialization, and Content-Type header.
- **Notes** (`api.listNotes`, `api.createNote`) — verifies query string construction (with and without `reference` param), POST body.
- **Highlights** (`api.listHighlights`) — verifies reference query param is included.
- **Bible Maps** (`api.getAllMaps`, `api.getMapsForReference`) — verifies correct endpoints and URL encoding.
- **Error handling** — three cases: server returns `{ error: "..." }` body, server returns non-ok with no error field (uses generic message), and `fetch` itself throws (network error).
- **Content-Type header** — verifies JSON requests get the header, FormData requests do not.
- **204 No Content** — verifies `api.logout()` returns `null` for a 204 response.

**Dependencies / relationships**

- `vitest` — `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`.
- `../../api/client.js` — the module under test.
- `setup.js` — runs before each suite (jest-dom matchers; not used directly in this file but ensures the environment is consistent).

**Notes**

- `beforeEach` sets up a default successful `fetch` mock; individual tests override it with `global.fetch.mockResolvedValue(...)` as needed.
- `afterEach` calls `vi.restoreAllMocks()` to prevent mock bleed between tests.
- FormData detection is tested via `api.createPost({ body: 'Hello world' })`, which uses `FormData` internally — no manual FormData construction needed in the test.
- URL assertions check both the full URL string and individual decoded query parameters via `URLSearchParams`.

# backend/src/services/connectionService.js

## Purpose

Manages the "Fellows" social graph — bidirectional connection requests between users. A `Connection` row records a directed request (requester → recipient) with a status of `pending`, `accepted`, or `declined`. This service handles sending requests, responding to them, cancelling or removing them, listing connections by state, and searching for users annotated with their relationship to the searcher.

## Key exports

- **`sendRequest(requesterId, recipientUsername)`** — Sends a Fellow request. Handles mutual-request detection (if the target already sent a request the other way, it auto-accepts), duplicate-request idempotency for `pending` state, and re-request after a prior decline by resetting the existing row rather than inserting a duplicate.
- **`respondToRequest(userId, connectionId, accept)`** — Accepts or declines a pending request. Only the recipient can respond; any other caller gets a 404 (not 403) to avoid confirming the row's existence.
- **`removeConnection(userId, connectionId)`** — Handles all three removal cases: removing an accepted connection, the requester cancelling a sent request, or the recipient dismissing a received one. Deletes the row outright so a fresh request is immediately possible.
- **`listConnections(userId)`** — Returns all accepted connections, normalized to the shape `{ connectionId, id, username, since }` with "the other person" regardless of which direction the original request ran.
- **`listPendingReceived(userId)`** — Returns incoming pending requests awaiting the user's response.
- **`listPendingSent(userId)`** — Returns outgoing pending requests the user has sent.
- **`searchUsers(query, currentUserId)`** — Case-insensitive username search (minimum 2 characters, max 20 results). Annotates each result with the current relationship status (`none`, `connected`, `pending_sent`, `pending_received`, `declined`) in a single batch query rather than per-result round trips.

## Dependencies

- **Prisma models:** `User`, `Connection`

## Patterns / notes

- **404 masking on ownership checks:** `respondToRequest` returns 404 (not 403) when the caller is not the recipient, so an attacker cannot confirm that a connection row exists at a given ID.
- **Concurrent mutual-request handling:** `sendRequest` checks for a reverse-direction pending row before creating a new one; if found, it accepts the existing row immediately, avoiding a confusing two-row state.
- **Declined-request re-request:** Rather than trying to create a new row (which would violate the unique constraint), both `sendRequest` (for same-direction declined) and `removeConnection` (delete + fresh create path) handle this gracefully.
- **Batch connection lookup in search:** `searchUsers` runs one query for all connections touching the current user, then joins in memory, avoiding N+1 queries for search results.

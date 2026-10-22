# backend/src/routes/connections.js

## Purpose

Manages the "Fellows" social graph — bidirectional peer connections between users. It supports searching for users by username, sending connection requests, accepting or declining incoming requests, viewing pending sent/received requests, listing accepted connections, and removing connections in any state. The entire router requires a logged-in session.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/connections/search?q=<query>` | Searches users by username fragment, excluding the requesting user from results |
| GET | `/api/connections` | Lists all accepted connections for the current user |
| GET | `/api/connections/requests` | Lists incoming pending connection requests |
| GET | `/api/connections/sent` | Lists outgoing pending connection requests |
| POST | `/api/connections` | Sends a connection request to the user identified by `username`; body: `{ username }` |
| POST | `/api/connections/:id/accept` | Accepts a pending incoming request by connection ID |
| POST | `/api/connections/:id/decline` | Declines a pending incoming request by connection ID |
| DELETE | `/api/connections/:id` | Removes an accepted connection, cancels a sent request, or dismisses a received one depending on the row's current state |

## Auth

`connectionsRouter.use(requireLogin)` is applied at the top of the router. All endpoints require a valid session.

## Dependencies

- `connectionService` — `sendRequest`, `respondToRequest`, `removeConnection`, `listConnections`, `listPendingReceived`, `listPendingSent`, `searchUsers`

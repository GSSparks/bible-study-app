# backend/src/middleware/errorHandler.js

**Purpose**

The global Express error-handling middleware, mounted last in `app.js`. It normalises all unhandled errors into a consistent JSON response shape and applies tiered logging: full stack traces for 5xx server errors, a single warn-level line for 4xx client errors (reducing noise from routine "not found" lookups).

**Key exports / contents**

- `errorHandler(err, req, res, next)` — four-argument Express error handler.
  - Reads `err.status` (or defaults to `500`).
  - Logs `console.error(err)` for 5xx; `console.warn(METHOD URL -> STATUS: message)` for 4xx.
  - Responds with `res.status(status).json({ error: err.message || 'Internal server error' })`.

**Dependencies / relationships**

- Imported by `app.js` and mounted as the last `app.use` call.
- Route handlers and service functions signal specific HTTP errors by throwing or passing an error object with a `.status` property (e.g. `const err = new Error('Not found'); err.status = 404; next(err)`).

**Notes**

The logging split between 4xx and 5xx is intentional: a 404 for a missing Strong's entry or dictionary key is expected behaviour, not a server problem, and logging full stack traces for them made the logs difficult to read. Any error without a `.status` property defaults to 500 and gets full stack trace logging.

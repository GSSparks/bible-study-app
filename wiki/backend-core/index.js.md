# backend/src/index.js

**Purpose**

The process entry point for the backend server. It is intentionally minimal: imports `createApp` from `app.js`, calls `app.listen` on the configured port, and triggers the `ensureBuiltInPlans` reading-plan seeder as a fire-and-forget side effect after the server is up. Separating app construction (`app.js`) from the listen call makes the app fully testable without binding a real port.

**Key exports / contents**

- No named exports — this is a runnable script, not a module.
- Calls `createApp()` then `app.listen(config.port, ...)`.
- Calls `ensureBuiltInPlans()` post-listen, with error logging on failure (never fatal).

**Dependencies / relationships**

- Imports `createApp` from `./app.js`.
- Imports `config` from `./config.js` for the port.
- Imports `ensureBuiltInPlans` from `./services/readingPlanService.js`.
- Invoked by `npm start` (`node src/index.js`) and `npm run dev` (`node --watch src/index.js`).
- Also invoked from the Dockerfile CMD after migrations and module seeding.

**Notes**

The test suite imports `createApp` from `app.js` directly and never touches `index.js`, which is the standard pattern for keeping tests free of network port conflicts. If you add additional startup side-effects (e.g. warming a cache), add them here after `app.listen`, not inside `app.js`.

# backend/vitest.config.js

**Purpose**

Configures Vitest for the backend test suite. Its most important job is aliasing `node-sword-interface` to the hand-written mock at `__mocks__/node-sword-interface.js`, so tests run without requiring compiled native SWORD binaries or real Bible module data files.

**Key exports / contents**

- `test.environment: 'node'` — runs tests in a plain Node.js environment (not jsdom).
- `test.globals: true` — makes `describe`, `it`, `expect`, etc. available globally without explicit imports.
- `test.fileParallelism: false` and `test.sequence.concurrent: false` — forces all test files and all tests within them to run sequentially. This is necessary because tests share a single PostgreSQL database and a single Express app instance; concurrent execution causes state interference.
- `test.setupFiles: ['./tests/setup.js']` — runs the shared test setup file before each test file (expected to handle database bootstrapping and app creation).
- `test.alias`: `'node-sword-interface'` → `'./__mocks__/node-sword-interface.js'` — the key configuration that replaces the native module with the stub.
- `testTimeout: 30000` and `hookTimeout: 30000` — 30-second timeouts, accommodating potentially slow database operations in tests.

**Dependencies / relationships**

- References `./tests/setup.js` (not read here) for global test setup.
- References `./__mocks__/node-sword-interface.js` for the SWORD mock.
- Used by `npm test`, `npm run test:watch`, and `npm run test:coverage` scripts in `package.json`.

**Notes**

The sequential test execution (`fileParallelism: false`, `concurrent: false`) is a deliberate tradeoff — it makes the suite slower but correct when multiple tests mutate shared database state. If the test suite ever grows large enough to need parallelism, tests would need to be isolated by database schema or transaction rollbacks.

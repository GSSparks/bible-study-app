# frontend/src/__tests__/setup.js

**Purpose**

Global test setup file that runs once before each test suite (configured in `vitest.config.js` via `setupFiles`). Its sole purpose is to extend Vitest's `expect` with the `@testing-library/jest-dom` custom matchers, enabling assertions like `toBeInTheDocument()`, `toHaveClass()`, `toHaveTextContent()`, etc. in all test files without needing to import them individually.

**Key exports / contents**

- No exports.
- Side effect: `import '@testing-library/jest-dom'` — registers all jest-dom matchers globally.

**Dependencies / relationships**

- `@testing-library/jest-dom` — provides the DOM-specific assertion matchers.
- Referenced by `vitest.config.js` as `test.setupFiles: ['./src/__tests__/setup.js']`.
- Applied automatically before every test file in the project.

**Notes**

- Because `vitest.config.js` sets `globals: true`, the matchers registered here are available as `expect(...).toBeInTheDocument()` etc. without any import in individual test files.
- If additional global setup is needed (e.g., mocking `window.matchMedia`, setting up MSW), it should be added to this file.

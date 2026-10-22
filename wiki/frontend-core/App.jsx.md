# frontend/src/App.jsx

**Purpose**

`App` is the root component of the React application. Its sole responsibility is to gate which top-level screen is shown based on authentication state. It uses the `useAuth` hook to determine three possible states: loading (show a spinner), setup required (show the first-run bootstrap screen), or ready (show the main application shell). Anonymous users are deliberately allowed through to the main shell — public features such as Study Mode reading and search work without an account.

**Key exports / contents**

- `default export App` — functional component, no props.

**Dependencies / relationships**

- `./hooks/useAuth.js` — provides `{ loading, setupRequired, bootstrap, user }`.
- `./components/BootstrapScreen.jsx` — rendered when no admin account exists yet; receives `onComplete={auth.bootstrap}`.
- `./components/AppShell.jsx` — rendered for all other cases (authenticated or anonymous); receives the full `auth` object as a prop.

**Notes**

- The loading state renders a minimal full-screen dark overlay with `bg-ink text-parchment` Tailwind classes; this avoids a flash of white before styles load.
- `auth.user` being `null` is a valid operating state — `AppShell` is responsible for showing/hiding individual features based on login status.

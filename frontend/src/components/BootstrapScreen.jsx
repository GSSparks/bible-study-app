import { useState } from 'react';

const MIN_PASSWORD_LENGTH = 10; // matches the backend's own rule — checked client-side too, so an obvious mistake doesn't cost a round trip

/** Shown instead of the entire rest of the app when no user account
 * exists yet (useAuth's setupRequired). This is the one-time "claim"
 * screen for a freshly deployed instance — whoever completes this
 * becomes the admin. Deliberately blocking: there's no way to dismiss
 * it or use anything else underneath, since an app with no owner yet
 * shouldn't be otherwise usable on a public server. */
export default function BootstrapScreen({ onComplete }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function validate() {
    if (username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (password !== confirmPassword) return "Passwords don't match.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onComplete({ username: username.trim(), password });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-ink px-4 text-parchment">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl tracking-wide">Scriptorium</h1>
          <p className="mt-2 text-sm text-muted">
            This instance hasn't been set up yet. Create the administrator account to get started —
            you'll be able to create additional accounts for others afterward.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-rule bg-panel p-6">
          <div>
            <label htmlFor="bootstrap-username" className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Username
            </label>
            <input
              id="bootstrap-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>

          <div>
            <label htmlFor="bootstrap-password" className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Password
            </label>
            <input
              id="bootstrap-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
            <p className="mt-1 text-xs text-muted">At least {MIN_PASSWORD_LENGTH} characters.</p>
          </div>

          <div>
            <label htmlFor="bootstrap-confirm" className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Confirm password
            </label>
            <input
              id="bootstrap-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create administrator account'}
          </button>
        </form>
      </div>
    </div>
  );
}
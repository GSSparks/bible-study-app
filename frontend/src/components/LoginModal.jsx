import { useState } from 'react';

/** A straightforward login modal — no self-service signup anywhere in
 * this app; every account past the first admin is created by an admin
 * via the (separate) user-management UI. This just authenticates
 * someone who already has credentials. */
export default function LoginModal({ onClose, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await onLogin({ username: username.trim(), password });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Log in</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="login-username" className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Username
            </label>
            <input
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
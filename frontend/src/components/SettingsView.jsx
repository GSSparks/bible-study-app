/** Currently just hosts change-password (moved here from the UserMenu
 * dropdown, matching the mockup's dedicated Settings nav item rather
 * than a dropdown entry) — a natural place for account-level
 * preferences as more get added later. */
export default function SettingsView({ username, onOpenChangePassword }) {
  return (
    <div className="mx-auto w-full max-w-lg p-8">
      <h2 className="mb-6 font-display text-2xl text-parchment">Settings</h2>

      <div className="rounded-md border border-rule bg-panel p-4">
        <div className="mb-1 text-sm text-parchment">Account</div>
        <div className="mb-4 text-xs text-muted">
          Signed in as <span className="text-parchment">{username}</span>
        </div>
        <button
          onClick={onOpenChangePassword}
          className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment"
        >
          Change password
        </button>
      </div>
    </div>
  );
}
import BootstrapScreen from './components/BootstrapScreen.jsx';
import AppShell from './components/AppShell.jsx';
import { useAuth } from './hooks/useAuth.js';

export default function App() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink text-parchment">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (auth.setupRequired) {
    return <BootstrapScreen onComplete={auth.bootstrap} />;
  }

  // Anonymous visitors reach here too, deliberately — public features
  // (Study Mode's reading/search) stay fully usable without an
  // account; AppShell itself handles what to show/hide based on
  // auth.user being null.
  return <AppShell auth={auth} />;
}
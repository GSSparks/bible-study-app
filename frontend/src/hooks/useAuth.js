import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Central auth state for the whole app. Two checks happen on mount, in
 * order: whether this instance has ever been set up at all
 * (setupRequired), and — only if it has — whether the current browser
 * session already has someone logged in (api.me()). These are
 * deliberately separate from "is the app usable at all": an anonymous,
 * already-set-up, not-logged-in visitor is a perfectly normal, expected
 * state (public reading/search features stay fully available); only
 * setupRequired should force a completely different screen.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await api.bootstrapStatus();
      setSetupRequired(status.setupRequired);
      if (!status.setupRequired) {
        const me = await api.me();
        setUser(me.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function bootstrap({ username, password }) {
    const res = await api.bootstrap({ username, password });
    setUser(res.user);
    setSetupRequired(false);
    return res.user;
  }

  async function login({ username, password }) {
    const res = await api.login({ username, password });
    setUser(res.user);
    return res.user;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  return { user, setupRequired, loading, error, bootstrap, login, logout, refresh };
}
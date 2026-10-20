import { useEffect, useRef, useState } from 'react';
import { Search, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';

export default function FellowsView({ isLoggedIn }) {
  const [fellows, setFellows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const searchRef = useRef(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [f, r] = await Promise.all([api.listConnections(), api.listConnectionRequests()]);
      setFellows(f);
      setRequests(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await api.searchConnections(search.trim()));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function sendRequest(username) {
    setActionError(null);
    try {
      await api.sendConnectionRequest(username);
      refresh();
      if (search.trim()) setSearchResults(await api.searchConnections(search.trim()));
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function accept(connectionId) {
    setActionError(null);
    try {
      await api.acceptConnectionRequest(connectionId);
      refresh();
      if (search.trim()) setSearchResults(await api.searchConnections(search.trim()));
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function decline(connectionId) {
    setActionError(null);
    try {
      await api.declineConnectionRequest(connectionId);
      refresh();
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function remove(connectionId) {
    setActionError(null);
    try {
      await api.removeConnection(connectionId);
      refresh();
      if (search.trim()) setSearchResults(await api.searchConnections(search.trim()));
    } catch (e) {
      setActionError(e.message);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Users size={32} className="text-muted/40" strokeWidth={1} />
        <p className="font-display text-lg text-parchment">Fellows</p>
        <p className="text-sm text-muted">Log in to connect with other Bible students.</p>

      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-6 py-8">

        <div className="mb-6">
          <h1 className="font-display text-2xl text-parchment">Fellows</h1>
          <p className="mt-1 text-sm text-muted">Connect with family and other Bible students.</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username…"
              className="w-full rounded-lg border border-rule bg-ink py-2.5 pl-9 pr-8 text-sm text-parchment placeholder:text-muted/60 focus:border-brass focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-parchment">
                <X size={13} />
              </button>
            )}
          </div>
          {actionError && <p className="mt-2 text-xs text-red-400">{actionError}</p>}
          {search.trim() && (
            <div className="mt-2 overflow-hidden rounded-lg border border-rule bg-panel">
              {searching ? (
                <p className="px-4 py-3 text-sm text-muted">Searching…</p>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">No users found.</p>
              ) : (
                searchResults.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-0">
                    <Avatar username={u.username} size={32} />
                    <span className="flex-1 text-sm text-parchment">{u.username}</span>
                    <SearchResultAction user={u} onSend={sendRequest} onAccept={accept} onDecline={decline} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

        {/* Incoming requests */}
        {requests.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-ui text-xs font-semibold uppercase tracking-widest text-muted">
              Requests{' '}
              <span className="ml-1 rounded-full bg-brass/20 px-1.5 py-0.5 text-brass">
                {requests.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-lg border border-rule bg-panel">
              {requests.map((r) => (
                <div key={r.connectionId} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-0">
                  <Avatar username={r.username} size={32} />
                  <span className="flex-1 text-sm text-parchment">{r.username}</span>
                  <button
                    onClick={() => accept(r.connectionId)}
                    className="rounded border border-brass/60 px-3 py-1 text-xs text-brass hover:bg-brass/10"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => decline(r.connectionId)}
                    className="rounded border border-rule px-3 py-1 text-xs text-muted hover:border-red-400/60 hover:text-red-400"
                  >
                    Decline
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fellows list */}
        <section>
          <h2 className="mb-3 font-ui text-xs font-semibold uppercase tracking-widest text-muted">
            Your Fellows{' '}
            {!loading && <span className="text-muted/60">({fellows.length})</span>}
          </h2>
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : fellows.length === 0 ? (
            <div className="rounded-lg border border-rule bg-panel px-4 py-10 text-center">
              <Users size={28} className="mx-auto mb-3 text-muted/30" strokeWidth={1} />
              <p className="text-sm text-muted">No fellows yet. Search above to add family or friends.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-rule bg-panel">
              {fellows.map((f) => (
                <div key={f.connectionId} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-0">
                  <Avatar username={f.username} size={32} />
                  <span className="flex-1 text-sm text-parchment">{f.username}</span>
                  <button
                    onClick={() => remove(f.connectionId)}
                    className="rounded border border-rule px-3 py-1 text-xs text-muted hover:border-red-400/60 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

function SearchResultAction({ user, onSend, onAccept, onDecline }) {
  if (user.status === 'connected') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted">
        <UserCheck size={12} /> Fellow
      </span>
    );
  }
  if (user.status === 'pending_sent') {
    return <span className="text-xs text-muted">Request sent</span>;
  }
  if (user.status === 'pending_received') {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onAccept(user.connectionId)}
          className="rounded border border-brass/60 px-2.5 py-1 text-xs text-brass hover:bg-brass/10"
        >
          Accept
        </button>
        <button
          onClick={() => onDecline(user.connectionId)}
          className="rounded border border-rule px-2.5 py-1 text-xs text-muted hover:border-red-400/60 hover:text-red-400"
        >
          Decline
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => onSend(user.username)}
      className="flex items-center gap-1.5 rounded border border-rule px-2.5 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
    >
      <UserPlus size={11} /> Add
    </button>
  );
}

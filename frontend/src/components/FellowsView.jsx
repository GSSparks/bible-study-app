import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';

const TABS = ['My Fellows', 'Requests', 'Find people'];

export default function FellowsView() {
  const [tab, setTab] = useState('My Fellows');
  // Bumped after any action that changes connection state elsewhere
  // (accepting/declining/sending/removing), so every tab's data stays
  // in sync without needing a shared store — simplest thing that
  // actually works given how small this surface is.
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="flex h-full flex-col p-6">
      <h2 className="mb-4 font-display text-2xl text-parchment">Fellows</h2>
      <div className="mb-6 flex border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'My Fellows' && <MyFellowsTab refreshKey={refreshKey} onChange={bump} />}
        {tab === 'Requests' && <RequestsTab refreshKey={refreshKey} onChange={bump} />}
        {tab === 'Find people' && <FindPeopleTab onChange={bump} />}
      </div>
    </div>
  );
}

function PersonRow({ username, right }) {
  return (
    <div className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm last:border-0">
      <div className="flex items-center gap-2">
        <Avatar username={username} size={28} />
        <span className="text-parchment">{username}</span>
      </div>
      <div className="flex gap-2">{right}</div>
    </div>
  );
}

function MyFellowsTab({ refreshKey, onChange }) {
  const [fellows, setFellows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .listConnections()
      .then(setFellows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleRemove(connectionId) {
    setRemoving(connectionId);
    try {
      await api.removeConnection(connectionId);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setRemoving(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="overflow-hidden rounded-md border border-rule">
      {fellows.map((f) => (
        <PersonRow
          key={f.connectionId}
          username={f.username}
          right={
            <button
              disabled={removing === f.connectionId}
              onClick={() => handleRemove(f.connectionId)}
              className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
            >
              {removing === f.connectionId ? '…' : 'remove'}
            </button>
          }
        />
      ))}
      {fellows.length === 0 && <p className="p-3 text-sm text-muted">No Fellows yet — try "Find people" to search.</p>}
    </div>
  );
}

function RequestsTab({ refreshKey, onChange }) {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  function refresh() {
    setLoading(true);
    Promise.all([api.listConnectionRequests(), api.listSentConnectionRequests()])
      .then(([r, s]) => {
        setReceived(r);
        setSent(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [refreshKey]);

  async function handleAccept(connectionId) {
    setBusy(connectionId);
    try {
      await api.acceptConnectionRequest(connectionId);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDecline(connectionId) {
    setBusy(connectionId);
    try {
      await api.declineConnectionRequest(connectionId);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(connectionId) {
    setBusy(connectionId);
    try {
      await api.removeConnection(connectionId);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-muted">Awaiting your response</h3>
        <div className="overflow-hidden rounded-md border border-rule">
          {received.map((r) => (
            <PersonRow
              key={r.connectionId}
              username={r.username}
              right={
                <>
                  <button
                    disabled={busy === r.connectionId}
                    onClick={() => handleAccept(r.connectionId)}
                    className="rounded bg-verdigris/80 px-2 py-1 text-xs text-parchment hover:bg-verdigris disabled:opacity-50"
                  >
                    accept
                  </button>
                  <button
                    disabled={busy === r.connectionId}
                    onClick={() => handleDecline(r.connectionId)}
                    className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                  >
                    decline
                  </button>
                </>
              }
            />
          ))}
          {received.length === 0 && <p className="p-3 text-sm text-muted">No pending requests.</p>}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-muted">Sent, awaiting response</h3>
        <div className="overflow-hidden rounded-md border border-rule">
          {sent.map((s) => (
            <PersonRow
              key={s.connectionId}
              username={s.username}
              right={
                <button
                  disabled={busy === s.connectionId}
                  onClick={() => handleCancel(s.connectionId)}
                  className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                >
                  cancel
                </button>
              }
            />
          ))}
          {sent.length === 0 && <p className="p-3 text-sm text-muted">Nothing pending.</p>}
        </div>
      </div>
    </div>
  );
}

function FindPeopleTab({ onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.searchConnections(query).then(setResults).catch((e) => setError(e.message));
    }, 200); // light debounce while typing
    return () => clearTimeout(t);
  }, [query]);

  async function handleConnect(username) {
    setBusy(username);
    setError(null);
    try {
      await api.sendConnectionRequest(username);
      // Re-run the search so this result's status updates in place
      // (none -> pending_sent) without the person disappearing from view.
      const fresh = await api.searchConnections(query);
      setResults(fresh);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  function actionFor(person) {
    if (person.status === 'connected') {
      return <span className="text-xs text-muted">already Fellows</span>;
    }
    if (person.status === 'pending_sent') {
      return <span className="text-xs text-muted">request sent</span>;
    }
    if (person.status === 'pending_received') {
      return <span className="text-xs text-brass">check Requests tab</span>;
    }
    return (
      <button
        disabled={busy === person.username}
        onClick={() => handleConnect(person.username)}
        className="rounded bg-brass/90 px-2 py-1 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
      >
        {busy === person.username ? '…' : 'connect'}
      </button>
    );
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by username…"
        className="mb-3 w-full rounded-md border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
      />
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <div className="overflow-hidden rounded-md border border-rule">
        {results.map((p) => (
          <PersonRow key={p.id} username={p.username} right={actionFor(p)} />
        ))}
        {query.trim().length >= 2 && results.length === 0 && (
          <p className="p-3 text-sm text-muted">No one found matching "{query}".</p>
        )}
        {query.trim().length < 2 && <p className="p-3 text-sm text-muted">Type at least 2 characters to search.</p>}
      </div>
    </div>
  );
}
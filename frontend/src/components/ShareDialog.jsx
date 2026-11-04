import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';

export default function ShareDialog({ layer, open, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [shares, setShares] = useState([]);
    const [role, setRole] = useState('viewer');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open || !layer) return;
        setQuery('');
        setResults([]);
        loadShares(layer.id);
        inputRef.current?.focus();
    }, [open, layer?.id]);

    useEffect(() => {
        if (!open || query.length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.searchFellows(query);
                const sharedIds = new Set(shares.map(s => s.userId));
                setResults(res.filter(u => !sharedIds.has(u.id)));
            } finally {
                setLoading(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [query, open, shares]);

    async function loadShares(layerId) {
        const data = await api.listLayerShares(layerId);
        setShares(data);
    }

    async function addShare(user) {
        await api.shareCalendarLayer(layer.id, user.username, role);
        setQuery('');
        setResults([]);
        loadShares(layer.id);
    }

    async function changeRole(userId, username, newRole) {
        await api.unshareCalendarLayer(layer.id, userId);
        await api.shareCalendarLayer(layer.id, username, newRole);
        loadShares(layer.id);
    }

    async function removeShare(userId) {
        await api.unshareCalendarLayer(layer.id, userId);
        loadShares(layer.id);
    }

    if (!open || !layer) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
        <div
        className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl"
        onClick={e => e.stopPropagation()}
        >
        <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg">Share "{layer.name}"</h2>
        <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
        close
        </button>
        </div>

        <div className="relative mb-3">
        <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search Fellows…"
        className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
        />
        {loading && <span className="absolute right-3 top-2.5 text-xs text-muted">…</span>}
        </div>

        <div className="mb-4 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">Role</span>
        <button
        onClick={() => setRole('viewer')}
        className={`rounded px-2 py-0.5 text-xs ${role === 'viewer' ? 'bg-brass/90 text-ink' : 'border border-rule text-muted hover:text-parchment'}`}
        >Viewer</button>
        <button
        onClick={() => setRole('editor')}
        className={`rounded px-2 py-0.5 text-xs ${role === 'editor' ? 'bg-brass/90 text-ink' : 'border border-rule text-muted hover:text-parchment'}`}
        >Editor</button>
        </div>

        {results.length > 0 && (
            <ul className="mb-4 max-h-40 overflow-y-auto rounded border border-rule divide-y divide-rule">
            {results.map(u => (
                <li key={u.id} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                {u.avatarUrl
                    ? <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />
                    : <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center text-xs text-muted">{u.username[0]?.toUpperCase()}</div>}
                    <span className="text-sm text-parchment">{u.displayName || u.username}</span>
                    </div>
                    <button
                    onClick={() => addShare(u)}
                    className="text-xs text-brass hover:underline"
                    >Share</button>
                    </li>
            ))}
            </ul>
        )}

        {shares.length > 0 && (
            <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Shared with</p>
            <ul className="divide-y divide-rule">
            {shares.map(s => (
                <li key={s.userId} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                {s.avatarUrl
                    ? <img src={s.avatarUrl} className="w-6 h-6 rounded-full" />
                    : <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center text-xs text-muted">{s.username[0]?.toUpperCase()}</div>}
                    <span className="text-sm text-parchment">{s.displayName || s.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <select
                    value={s.role}
                    onChange={e => changeRole(s.userId, s.username, e.target.value)}
                    className="rounded border border-rule bg-ink px-1 py-0.5 text-xs text-parchment"
                    >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    </select>
                    <button
                    onClick={() => removeShare(s.userId)}
                    className="text-xs text-red-400 hover:underline"
                    >Remove</button>
                    </div>
                    </li>
            ))}
            </ul>
            </div>
        )}
        </div>
        </div>
    );
}

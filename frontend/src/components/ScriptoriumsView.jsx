import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';
import PostFeed from './PostFeed.jsx';

const TABS = [
  { key: 'discover', label: 'Discover' },
  { key: 'mine', label: 'My Scriptoriums' },
  { key: 'invites', label: 'Invites' },
];

export default function ScriptoriumsView({ currentUserId }) {
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  function openDetail(id) {
    setSelectedId(id);
    setView('detail');
  }

  function backToList() {
    setView('list');
    setSelectedId(null);
    bump(); // in case membership changed while in detail (joined/left/deleted)
  }

  if (view === 'detail' && selectedId) {
    return <ScriptoriumDetail id={selectedId} onBack={backToList} currentUserId={currentUserId} />;
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl text-parchment">Scriptoriums</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass"
        >
          + create a Scriptorium
        </button>
      </div>

      <div className="mb-6 flex border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm ${tab === t.key ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'discover' && <DiscoverTab onOpen={openDetail} refreshKey={refreshKey} />}
        {tab === 'mine' && <MineTab onOpen={openDetail} refreshKey={refreshKey} />}
        {tab === 'invites' && <InvitesTab refreshKey={refreshKey} onChange={bump} />}
      </div>

      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            bump();
            openDetail(id);
          }}
        />
      )}
    </div>
  );
}

function DiscoverTab({ onOpen, refreshKey }) {
  const [scriptoriums, setScriptoriums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(null);

  function refresh() {
    setLoading(true);
    api
      .listPublicScriptoriums()
      .then(setScriptoriums)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [refreshKey]);

  async function handleJoin(id) {
    setJoining(id);
    try {
      await api.joinScriptorium(id);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {scriptoriums.map((s) => (
        <div key={s.id} className="rounded-md border border-rule bg-panel p-4">
          <button onClick={() => onOpen(s.id)} className="mb-1 block text-left font-display text-base text-parchment hover:text-brass">
            {s.name}
          </button>
          {s.description && <p className="mb-3 text-xs text-muted">{s.description}</p>}
          {s.isMember ? (
            <button
              onClick={() => onOpen(s.id)}
              className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
            >
              open
            </button>
          ) : (
            <button
              disabled={joining === s.id}
              onClick={() => handleJoin(s.id)}
              className="rounded bg-verdigris/80 px-2 py-1 text-xs text-parchment hover:bg-verdigris disabled:opacity-50"
            >
              {joining === s.id ? 'joining…' : 'join'}
            </button>
          )}
        </div>
      ))}
      {scriptoriums.length === 0 && <p className="text-sm text-muted">No public Scriptoriums yet — be the first to create one.</p>}
    </div>
  );
}

function MineTab({ onOpen, refreshKey }) {
  const [scriptoriums, setScriptoriums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .listMyScriptoriums()
      .then(setScriptoriums)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {scriptoriums.map((s) => (
        <button key={s.id} onClick={() => onOpen(s.id)} className="rounded-md border border-rule bg-panel p-4 text-left hover:border-brass">
          <div className="mb-1 font-display text-base text-parchment">{s.name}</div>
          <div className="text-xs text-muted">
            {s.visibility} · {s.myRole}
          </div>
        </button>
      ))}
      {scriptoriums.length === 0 && <p className="text-sm text-muted">You're not part of any Scriptoriums yet.</p>}
    </div>
  );
}

function InvitesTab({ refreshKey, onChange }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  function refresh() {
    setLoading(true);
    api
      .listScriptoriumInvites()
      .then(setInvites)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [refreshKey]);

  async function handleAccept(inviteId) {
    setBusy(inviteId);
    try {
      await api.acceptScriptoriumInvite(inviteId);
      refresh();
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDecline(inviteId) {
    setBusy(inviteId);
    try {
      await api.declineScriptoriumInvite(inviteId);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="overflow-hidden rounded-md border border-rule">
      {invites.map((i) => (
        <div key={i.inviteId} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm last:border-0">
          <div>
            <div className="text-parchment">{i.name}</div>
            <div className="text-xs text-muted">invited by {i.invitedBy}</div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={busy === i.inviteId}
              onClick={() => handleAccept(i.inviteId)}
              className="rounded bg-verdigris/80 px-2 py-1 text-xs text-parchment hover:bg-verdigris disabled:opacity-50"
            >
              accept
            </button>
            <button
              disabled={busy === i.inviteId}
              onClick={() => handleDecline(i.inviteId)}
              className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
            >
              decline
            </button>
          </div>
        </div>
      ))}
      {invites.length === 0 && <p className="p-3 text-sm text-muted">No pending invites.</p>}
    </div>
  );
}

function VisibilityToggle({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('private')}
        className={`flex-1 rounded border px-3 py-2 text-xs ${
          value === 'private' ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted'
        }`}
      >
        Private — invite only
      </button>
      <button
        type="button"
        onClick={() => onChange('public')}
        className={`flex-1 rounded border px-3 py-2 text-xs ${
          value === 'public' ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted'
        }`}
      >
        Public — anyone can join
      </button>
    </div>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createScriptorium({ name, description, visibility });
      onCreated(created.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Create a Scriptorium</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Visibility</label>
            <VisibilityToggle value={visibility} onChange={setVisibility} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {submitting ? 'creating…' : 'create'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditModal({ scriptorium, onClose, onSaved }) {
  const [name, setName] = useState(scriptorium.name);
  const [description, setDescription] = useState(scriptorium.description || '');
  const [visibility, setVisibility] = useState(scriptorium.visibility);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateScriptorium(scriptorium.id, { name, description, visibility });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Edit Scriptorium</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Visibility</label>
            <VisibilityToggle value={visibility} onChange={setVisibility} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {saving ? 'saving…' : 'save'}
          </button>
        </form>
      </div>
    </div>
  );
}

function InviteModal({ scriptoriumId, existingMemberIds, onClose }) {
  const [fellows, setFellows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviting, setInviting] = useState(null);
  const [sentTo, setSentTo] = useState(new Set());

  useEffect(() => {
    api
      .listConnections()
      .then(setFellows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite(username) {
    setInviting(username);
    setError(null);
    try {
      await api.inviteToScriptorium(scriptoriumId, username);
      setSentTo((prev) => new Set([...prev, username]));
    } catch (e) {
      setError(e.message);
    } finally {
      setInviting(null);
    }
  }

  const invitable = fellows.filter((f) => !existingMemberIds.has(f.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Invite a Fellow</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <div className="max-h-72 overflow-y-auto rounded-md border border-rule">
          {invitable.map((f) => (
            <div key={f.id} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm last:border-0">
              <span className="text-parchment">{f.username}</span>
              {sentTo.has(f.username) ? (
                <span className="text-xs text-muted">invited</span>
              ) : (
                <button
                  disabled={inviting === f.username}
                  onClick={() => handleInvite(f.username)}
                  className="rounded bg-brass/90 px-2 py-1 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
                >
                  {inviting === f.username ? '…' : 'invite'}
                </button>
              )}
            </div>
          ))}
          {!loading && invitable.length === 0 && (
            <p className="p-3 text-sm text-muted">All your Fellows are already members, or you have no Fellows yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScriptoriumDetail({ id, onBack, currentUserId }) {
  const [scriptorium, setScriptorium] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [section, setSection] = useState('wall'); // 'wall' | 'members'
  const [wallPosts, setWallPosts] = useState([]);
  const [wallLoading, setWallLoading] = useState(true);
  const [wallError, setWallError] = useState(null);

  function refresh() {
    setLoading(true);
    setError(null);
    Promise.all([api.getScriptorium(id), api.listScriptoriumMembers(id)])
      .then(([s, m]) => {
        setScriptorium(s);
        setMembers(m);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function refreshWall() {
    setWallLoading(true);
    setWallError(null);
    api
      .getScriptoriumWall(id)
      .then((data) => setWallPosts(data.posts))
      .catch((e) => setWallError(e.message))
      .finally(() => setWallLoading(false));
  }

  useEffect(refresh, [id]);
  useEffect(refreshWall, [id]);

  async function handleLeave() {
    setLeaving(true);
    try {
      await api.leaveScriptorium(id);
      onBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setLeaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteScriptorium(id);
      onBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleRemoveMember(membershipId) {
    setRemovingId(membershipId);
    try {
      await api.removeScriptoriumMember(id, membershipId);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error && !scriptorium) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!scriptorium) return null;

  const isOwner = scriptorium.myRole === 'owner';
  const isMember = scriptorium.isMember;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <button onClick={onBack} className="mb-4 self-start text-xs text-muted hover:text-parchment">
        ‹ back to Scriptoriums
      </button>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-parchment">{scriptorium.name}</h2>
          <p className="text-xs uppercase tracking-wide text-muted">{scriptorium.visibility}</p>
          {scriptorium.description && <p className="mt-2 max-w-xl text-sm text-muted">{scriptorium.description}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isMember && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment"
            >
              invite a Fellow
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setShowEditModal(true)}
              className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment"
            >
              edit
            </button>
          )}
          {isMember && !isOwner && (
            <button
              disabled={leaving}
              onClick={handleLeave}
              className="rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
            >
              {leaving ? '…' : 'leave'}
            </button>
          )}
          {isOwner && (
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="rounded border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 disabled:opacity-50"
            >
              {deleting ? '…' : 'delete'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="mb-4 flex gap-4 border-b border-rule text-sm">
        <button
          onClick={() => setSection('wall')}
          className={`pb-2 ${section === 'wall' ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
        >
          Wall
        </button>
        <button
          onClick={() => setSection('members')}
          className={`pb-2 ${section === 'members' ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
        >
          Members ({members.length})
        </button>
      </div>

      {section === 'wall' && (
        <PostFeed
          posts={wallPosts}
          loading={wallLoading}
          error={wallError}
          canPost={isMember}
          scriptoriumId={id}
          currentUserId={currentUserId}
          onRefresh={refreshWall}
        />
      )}

      {section === 'members' && (
        <div className="overflow-hidden rounded-md border border-rule">
          {members.map((m) => (
            <div key={m.membershipId} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm last:border-0">
              <div className="flex items-center gap-2">
                <Avatar username={m.username} size={24} />
                <span className="text-parchment">{m.username}</span>
                {m.role === 'owner' && <span className="text-xs text-brass">owner</span>}
              </div>
              {isOwner && m.role !== 'owner' && (
                <button
                  disabled={removingId === m.membershipId}
                  onClick={() => handleRemoveMember(m.membershipId)}
                  className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                >
                  {removingId === m.membershipId ? '…' : 'remove'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showInviteModal && (
        <InviteModal scriptoriumId={id} existingMemberIds={new Set(members.map((m) => m.id))} onClose={() => setShowInviteModal(false)} />
      )}
      {showEditModal && (
        <EditModal
          scriptorium={scriptorium}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
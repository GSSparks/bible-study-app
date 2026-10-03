import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Search } from 'lucide-react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';
import { getAvatarColor } from '../utils/avatar.js';
import PostFeed from './PostFeed.jsx';
import ScriptoriumStudiesTab from './ScriptoriumStudiesTab.jsx';
import StudyDetail from './StudyDetail.jsx';

export default function ScriptoriumsView({ currentUserId, urlScriptoriumId, urlStudyId, onOpenInPassages, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy }) {
  const routerNavigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  if (urlScriptoriumId) {
    return (
      <ScriptoriumDetail
        id={urlScriptoriumId}
        urlStudyId={urlStudyId}
        onBack={() => { bump(); routerNavigate('/scriptoriums'); }}
        currentUserId={currentUserId}
        onOpenInPassages={onOpenInPassages}
        onAskAiCompanionAbout={onAskAiCompanionAbout}
        onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-5xl">
        <ScriptoriumsList
          onOpen={(id) => routerNavigate('/scriptoriums/' + id)}
          refreshKey={refreshKey}
          onRequestCreate={() => setShowCreateModal(true)}
        />
      </div>

      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            bump();
            routerNavigate('/scriptoriums/' + id);
          }}
        />
      )}
    </div>
  );
}

function ScriptoriumsList({ onOpen, refreshKey, onRequestCreate }) {
  const [mine, setMine] = useState([]);
  const [publicList, setPublicList] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState(null);
  const [busy, setBusy] = useState(null);

  function refresh() {
    setLoading(true);
    Promise.all([
      api.listMyScriptoriums(),
      api.listPublicScriptoriums(),
      api.listScriptoriumInvites(),
    ])
      .then(([m, p, i]) => { setMine(m); setPublicList(p); setInvites(i); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [refreshKey]);

  const q = search.toLowerCase();
  const myIds = new Set(mine.map((s) => s.id));

  const filteredMine = mine.filter(
    (s) => !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
  );
  const filteredBrowse = publicList
    .filter((s) => !myIds.has(s.id))
    .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));

  async function handleJoin(id) {
    setJoining(id);
    try {
      await api.joinScriptorium(id);
      refresh();
      onOpen(id);
    } catch (e) {
      setError(e.message);
      setJoining(null);
    }
  }

  async function handleAcceptInvite(inviteId) {
    setBusy(inviteId);
    try { await api.acceptScriptoriumInvite(inviteId); refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function handleDeclineInvite(inviteId) {
    setBusy(inviteId);
    try { await api.declineScriptoriumInvite(inviteId); refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div>
      {/* Search + create */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Scriptoriums…"
            className="w-full rounded-md border border-rule bg-panel py-2 pl-9 pr-3 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
          />
        </div>
        <button
          onClick={onRequestCreate}
          className="shrink-0 rounded bg-brass/90 px-3 py-2 text-xs font-medium text-ink hover:bg-brass"
        >
          + new
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {loading && <p className="text-sm text-muted">Loading…</p>}

      {/* Pending invites */}
      {!loading && invites.length > 0 && (
        <div className="mb-8 rounded-xl border border-brass/30 bg-brass/5 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brass">Pending Invites</p>
          <div className="space-y-2.5">
            {invites.map((i) => (
              <div key={i.inviteId} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-parchment">{i.name}</span>
                  <span className="ml-2 text-xs text-muted">from {i.invitedBy}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy === i.inviteId}
                    onClick={() => handleAcceptInvite(i.inviteId)}
                    className="rounded bg-verdigris/80 px-2.5 py-1 text-xs text-parchment hover:bg-verdigris disabled:opacity-50"
                  >
                    accept
                  </button>
                  <button
                    disabled={busy === i.inviteId}
                    onClick={() => handleDeclineInvite(i.inviteId)}
                    className="rounded border border-rule px-2.5 py-1 text-xs text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                  >
                    decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* My Scriptoriums */}
          <section className="mb-10">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">My Scriptoriums</h3>
            {filteredMine.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMine.map((s) => (
                  <ScriptoriumCard key={s.id} s={s} onOpen={() => onOpen(s.id)} badge={s.myRole} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                {search ? 'No matches.' : "You're not in any Scriptoriums yet — browse below or create your own."}
              </p>
            )}
          </section>

          {/* Browse public */}
          {(filteredBrowse.length > 0 || (!search && publicList.filter((s) => !myIds.has(s.id)).length > 0)) && (
            <section>
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">Browse</h3>
              {filteredBrowse.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBrowse.map((s) => (
                    <ScriptoriumCard
                      key={s.id}
                      s={s}
                      onOpen={() => onOpen(s.id)}
                      joinButton={
                        <button
                          disabled={joining === s.id}
                          onClick={() => handleJoin(s.id)}
                          className="rounded bg-verdigris/80 px-2.5 py-1 text-xs text-parchment hover:bg-verdigris disabled:opacity-50"
                        >
                          {joining === s.id ? 'joining…' : 'join'}
                        </button>
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No public Scriptoriums match your search.</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ScriptoriumCard({ s, onOpen, badge, joinButton }) {
  const bannerColor = getAvatarColor(s.name);
  return (
    <div className="group overflow-hidden rounded-xl border border-rule bg-panel transition-colors hover:border-brass/50">
      {/* Banner strip — clickable */}
      <button onClick={onOpen} className="relative block h-24 w-full overflow-hidden bg-ink">
        {s.bannerUrl ? (
          <img
            src={s.bannerUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 25% 65%, ${bannerColor}66 0%, transparent 65%)` }} />
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 25%, ${bannerColor}33 0%, transparent 60%)` }} />
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 110%, #0D1B2966 0%, transparent 50%)` }} />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-panel to-transparent" />
      </button>

      {/* Info — clickable */}
      <button onClick={onOpen} className="block w-full px-4 pb-3 pt-2 text-left">
        <div className="font-display text-base leading-snug text-parchment transition-colors group-hover:text-brass">
          {s.name}
        </div>
        {s.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{s.description}</p>
        ) : (
          <p className="mt-1 text-xs italic text-muted/40">No description</p>
        )}
      </button>

      {/* Footer row */}
      <div className="flex items-center justify-between border-t border-rule/40 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted/60">
          {s.memberCount != null && (
            <span>{s.memberCount} {s.memberCount === 1 ? 'member' : 'members'}</span>
          )}
          {s.memberCount != null && <span>·</span>}
          <span className="capitalize">{s.visibility}</span>
        </div>
        {badge && <span className="text-xs capitalize text-muted">{badge}</span>}
        {joinButton}
      </div>
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
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
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
            disabled={submitting || !name.trim()}
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
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
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
    api.listConnections().then(setFellows).catch((e) => setError(e.message)).finally(() => setLoading(false));
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
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
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

function ScriptoriumDetail({ id, urlStudyId, onBack, currentUserId, onOpenInPassages, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy }) {
  const routerNavigate = useNavigate();
  const [scriptorium, setScriptorium] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [section, setSection] = useState('wall');
  const [wallPosts, setWallPosts] = useState([]);
  const [wallLoading, setWallLoading] = useState(true);
  const [wallError, setWallError] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(null);
  const bannerInputRef = useRef(null);

  function refresh() {
    setLoading(true);
    setError(null);
    Promise.all([api.getScriptorium(id), api.listScriptoriumMembers(id)])
      .then(([s, m]) => { setScriptorium(s); setMembers(m); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function refreshWall() {
    setWallLoading(true);
    setWallError(null);
    api.getScriptoriumWall(id)
      .then((data) => setWallPosts(data.posts))
      .catch((e) => setWallError(e.message))
      .finally(() => setWallLoading(false));
  }

  useEffect(refresh, [id]);
  useEffect(refreshWall, [id]);
  useEffect(() => { if (scriptorium) setBannerUrl(scriptorium.bannerUrl || null); }, [scriptorium?.id]);

  async function handleLeave() {
    setLeaving(true);
    try { await api.leaveScriptorium(id); onBack(); }
    catch (e) { setError(e.message); setLeaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try { await api.deleteScriptorium(id); onBack(); }
    catch (e) { setError(e.message); setDeleting(false); }
  }

  async function handleRemoveMember(membershipId) {
    setRemovingId(membershipId);
    try { await api.removeScriptoriumMember(id, membershipId); refresh(); }
    catch (e) { setError(e.message); }
    finally { setRemovingId(null); }
  }

  async function handleBannerChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const { url } = await api.uploadScriptoriumBanner(id, file);
      setBannerUrl(url);
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  }

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error && !scriptorium) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!scriptorium) return null;

  // Study detail — nested within this Scriptorium context so we have
  // the name for the back label without an extra fetch.
  if (urlStudyId) {
    return (
      <StudyDetail
        studyId={urlStudyId}
        currentUserId={currentUserId}
        onBack={() => routerNavigate('/scriptoriums/' + id)}
        backLabel={scriptorium.name}
        onOpenInPassages={onOpenInPassages}
        onAskAiCompanionAbout={onAskAiCompanionAbout}
        onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
      />
    );
  }

  const isOwner = scriptorium.myRole === 'owner';
  const isMember = scriptorium.isMember;
  const bannerColor = getAvatarColor(scriptorium.name);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Hero banner */}
      <div className="relative mx-auto h-48 w-full max-w-5xl shrink-0 overflow-hidden bg-ink">
        <div className="absolute inset-0 overflow-hidden">
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 25% 65%, ${bannerColor}55 0%, transparent 65%)` }} />
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 75% 30%, ${bannerColor}20 0%, transparent 55%)` }} />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
        </div>

        <button onClick={onBack} className="absolute left-6 top-4 z-10 text-xs text-parchment/60 hover:text-parchment">
          ‹ Scriptoriums
        </button>

        <div className="absolute right-6 top-3 z-10 flex flex-wrap gap-2">
          {isOwner && (
            <>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                className="flex items-center gap-1.5 rounded-md border border-parchment/20 bg-ink/50 px-2.5 py-1.5 text-xs text-parchment/80 backdrop-blur-sm hover:border-brass hover:text-parchment disabled:opacity-50"
              >
                <Camera size={13} />
                {uploadingBanner ? 'uploading…' : 'banner'}
              </button>
            </>
          )}
          {isMember && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="rounded-md border border-parchment/20 bg-ink/50 px-3 py-1.5 text-xs text-parchment/80 backdrop-blur-sm hover:border-brass hover:text-parchment"
            >
              invite
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setShowEditModal(true)}
              className="rounded-md border border-parchment/20 bg-ink/50 px-3 py-1.5 text-xs text-parchment/80 backdrop-blur-sm hover:border-brass hover:text-parchment"
            >
              edit
            </button>
          )}
          {isMember && !isOwner && (
            <button
              disabled={leaving}
              onClick={handleLeave}
              className="rounded-md border border-parchment/20 bg-ink/50 px-3 py-1.5 text-xs text-parchment/60 backdrop-blur-sm hover:border-red-400 hover:text-red-400 disabled:opacity-50"
            >
              {leaving ? '…' : 'leave'}
            </button>
          )}
          {isOwner && (
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="rounded-md border border-red-900/50 bg-ink/50 px-3 py-1.5 text-xs text-red-400/80 backdrop-blur-sm hover:border-red-400 hover:text-red-400 disabled:opacity-50"
            >
              {deleting ? '…' : 'delete'}
            </button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 z-10 px-6 pb-4">
          <h2 className="font-display text-3xl text-parchment">{scriptorium.name}</h2>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-parchment/40">{scriptorium.visibility}</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-4">
          {scriptorium.description && (
            <p className="mb-4 max-w-xl text-sm leading-relaxed text-muted">{scriptorium.description}</p>
          )}
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <div className="mb-4 flex gap-4 border-b border-rule text-sm">
            {['wall', 'studies', 'members'].map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`pb-2 capitalize ${section === s ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
              >
                {s === 'members' ? `Members (${members.length})` : s}
              </button>
            ))}
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
            <div className="overflow-hidden rounded-lg border border-rule">
              {members.map((m) => (
                <div key={m.membershipId} className="flex items-center justify-between border-b border-rule px-4 py-2.5 text-sm last:border-0">
                  <div className="flex items-center gap-2.5">
                    <Avatar username={m.username} size={28} />
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

          {section === 'studies' && (
            <ScriptoriumStudiesTab
              scriptoriumId={id}
              isMember={isMember}
              onOpenStudy={(studyId) => routerNavigate('/scriptoriums/' + id + '/studies/' + studyId)}
            />
          )}
        </div>
      </div>

      {showInviteModal && (
        <InviteModal
          scriptoriumId={id}
          existingMemberIds={new Set(members.map((m) => m.id))}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      {showEditModal && (
        <EditModal
          scriptorium={scriptorium}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); refresh(); }}
        />
      )}
    </div>
  );
}

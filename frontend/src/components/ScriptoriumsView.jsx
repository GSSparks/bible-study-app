import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Camera, Search, Sparkles, ExternalLink, FileText, Trash2, Plus } from 'lucide-react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';
import AvatarRoll from './AvatarRoll.jsx';
import { getAvatarColor } from '../utils/avatar.js';
import PostFeed from './PostFeed.jsx';
import RichEditor from './RichEditor.jsx';
import RichContent from './RichContent.jsx';
import ScriptoriumStudiesTab from './ScriptoriumStudiesTab.jsx';
import StudyDetail from './StudyDetail.jsx';
import DailyDevotional from './DailyDevotional.jsx';
import DocumentModal from './DocumentModal.jsx';

function parseDocumentId(url) {
  if (!url) return null;
  const m = url.match(/\/api\/pdf\/([^/]+)\/file/);
  return m ? m[1] : null;
}

export default function ScriptoriumsView({ currentUserId, currentUserRole, urlScriptoriumId, urlStudyId, onOpenInPassages, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel }) {
  const routerNavigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);
  const isAdmin = currentUserRole === 'admin';

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
        onOpenBiblePanel={onOpenBiblePanel}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="shrink-0 lg:order-2 lg:w-72">
            <DailyDevotional isAdmin={isAdmin} onOpenBiblePanel={onOpenBiblePanel} />
          </div>
          <div className="min-w-0 flex-1 lg:order-1">
            <ScriptoriumsList
              onOpen={(id) => routerNavigate('/scriptoriums/' + id)}
              refreshKey={refreshKey}
              onRequestCreate={() => setShowCreateModal(true)}
            />
          </div>
        </div>
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
  const [activeTag, setActiveTag] = useState(null);
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

  const allTags = [...new Set([...mine, ...publicList].flatMap((s) => s.tags || []))].sort();

  function matchesFilters(s) {
    const textMatch = !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    const tagMatch = !activeTag || (s.tags || []).includes(activeTag);
    return textMatch && tagMatch;
  }

  const filteredMine = mine.filter(matchesFilters);
  const filteredBrowse = publicList.filter((s) => !myIds.has(s.id)).filter(matchesFilters);

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

      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                activeTag === tag
                  ? 'bg-brass text-ink'
                  : 'border border-rule text-muted hover:border-brass/60 hover:text-parchment'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

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

      {/* Tags */}
      {s.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          {s.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-rule/60 px-2 py-0.5 text-[10px] text-muted/70">
              #{tag}
            </span>
          ))}
        </div>
      )}

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

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
  'as','is','was','are','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','must','can','this','that',
  'these','those','it','its','we','our','they','their','you','your','he','she',
  'his','her','i','my','me','us','not','no','so','if','then','than','more','most',
  'all','each','every','some','any','few','about','into','over','after','before',
  'what','which','who','when','where','how','why','also','through','just','very',
  'study','bible','scripture','scriptorium','chapter','verse','book','god','lord',
]);

function suggestTags(name, description, about, existing = []) {
  const raw = [name, description, about].filter(Boolean).join(' ');
  const stripped = raw.replace(/[#*`[\]()_>~]/g, ' ').replace(/https?:\/\/\S+/g, '');
  const words = stripped.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
  const freq = {};
  for (const w of words) {
    if (w.length >= 4 && !STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  const existingSet = new Set(existing);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w)
    .filter((w) => !existingSet.has(w));
}

function EditModal({ scriptorium, onClose, onSaved, bannerUrl, uploadingBanner, generatingBanner, onBannerChange, onGenerateBanner, onDelete }) {
  const bannerInputRef = useRef(null);
  const [name, setName] = useState(scriptorium.name);
  const [description, setDescription] = useState(scriptorium.description || '');
  const [visibility, setVisibility] = useState(scriptorium.visibility);
  const [about, setAbout] = useState(scriptorium.about || '');
  const [weeklyVerse, setWeeklyVerse] = useState(scriptorium.weeklyVerse || '');
  const [tags, setTags] = useState(scriptorium.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function addTag(raw) {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !tags.includes(tag) && tags.length < 20) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateScriptorium(scriptorium.id, { name, description, visibility, tags, about, weeklyVerse });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Edit Scriptorium</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-3 overflow-y-auto pr-1">
          {/* Banner */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Banner</label>
            <div className="relative mb-2 h-24 overflow-hidden rounded-lg border border-rule bg-ink">
              {bannerUrl
                ? <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center"><p className="text-xs text-muted">No banner</p></div>}
            </div>
            <div className="flex gap-2">
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={onBannerChange} />
              <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner || generatingBanner}
                className="flex items-center gap-1.5 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-50">
                <Camera size={12} />{uploadingBanner ? 'uploading…' : 'upload'}
              </button>
              <button type="button" onClick={onGenerateBanner} disabled={generatingBanner || uploadingBanner}
                className="flex items-center gap-1.5 rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-50">
                <Sparkles size={12} />{generatingBanner ? 'generating…' : 'AI banner'}
              </button>
            </div>
          </div>
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
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs uppercase tracking-wide text-muted">Tags</label>
              <button
                type="button"
                onClick={() => setSuggestions(suggestTags(name, description, about, tags))}
                className="text-xs text-muted hover:text-parchment"
              >
                suggest from content
              </button>
            </div>
            <div className="flex min-h-[2.5rem] flex-wrap gap-1.5 rounded border border-rule bg-ink px-2 py-1.5 focus-within:border-brass">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-brass/20 px-2 py-0.5 text-xs text-brass">
                  #{tag}
                  <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-brass/60 hover:text-brass">×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={tags.length === 0 ? 'Add tags (Enter to add)…' : ''}
                className="min-w-[6rem] flex-1 bg-transparent text-sm text-parchment placeholder:text-muted/40 focus:outline-none"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { addTag(s); setSuggestions(suggestions.filter((x) => x !== s)); }}
                    className="rounded-full border border-rule/50 px-2 py-0.5 text-[10px] text-muted/70 hover:border-brass/60 hover:text-parchment"
                  >
                    + #{s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Weekly Verse Reference</label>
            <input
              value={weeklyVerse}
              onChange={(e) => setWeeklyVerse(e.target.value)}
              placeholder="e.g. John 3:16"
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted/40 focus:border-brass"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">About (Introduction)</label>
            <RichEditor value={about} onChange={setAbout} height={160} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {saving ? 'saving…' : 'save'}
          </button>
          {onDelete && (
            <div className="border-t border-rule pt-3">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-muted">Delete this Scriptorium permanently?</span>
                  <button type="button" onClick={onDelete} className="rounded border border-red-900/60 px-3 py-1.5 text-xs text-red-400 hover:border-red-400">delete</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-parchment">cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-muted hover:text-red-400">
                  delete scriptorium…
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function AboutSection({ scriptorium, isOwner, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(scriptorium.about || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.updateScriptorium(scriptorium.id, {
        name: scriptorium.name,
        description: scriptorium.description || '',
        visibility: scriptorium.visibility,
        about: draft,
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <RichEditor value={draft} onChange={setDraft} height={300} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {saving ? 'saving…' : 'save'}
          </button>
          <button onClick={() => { setEditing(false); setDraft(scriptorium.about || ''); }} className="text-xs text-muted hover:text-parchment">
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isOwner && (
        <div className="mb-3 flex justify-end">
          <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-parchment">
            {scriptorium.about ? 'edit' : '+ add introduction'}
          </button>
        </div>
      )}
      {scriptorium.about ? (
        <div className="prose-sm max-w-none">
          <RichContent>{scriptorium.about}</RichContent>
        </div>
      ) : (
        <p className="text-sm italic text-muted/50">No introduction yet.</p>
      )}
    </div>
  );
}

function ResourcesSection({ scriptoriumId, isMember, currentUserId, isOwner }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addSource, setAddSource] = useState('link');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [libraryNotes, setLibraryNotes] = useState(null);
  const [libraryDocs, setLibraryDocs] = useState(null);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [viewingNote, setViewingNote] = useState(null);
  const [viewingDocId, setViewingDocId] = useState(null);

  function load() {
    setLoading(true);
    api.listScriptoriumResources(scriptoriumId)
      .then(setResources)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [scriptoriumId]);

  useEffect(() => {
    if (addSource === 'library-note' && libraryNotes === null) {
      api.listNotes({}).then(setLibraryNotes).catch(() => setLibraryNotes([]));
    }
    if (addSource === 'document' && libraryDocs === null) {
      api.listDocuments().then(setLibraryDocs).catch(() => setLibraryDocs([]));
    }
  }, [addSource]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectLibraryNote(note) {
    setBody(note.body);
    setLabel((prev) => prev || note.title || note.reference || 'Note');
  }

  function selectDocument(doc) {
    setUrl(api.documentFileUrl(doc.id));
    setLabel((prev) => prev || doc.title);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const payload = addSource === 'library-note'
        ? { type: 'note', label, body }
        : { type: 'link', label, url };
      await api.addScriptoriumResource(scriptoriumId, payload);
      setLabel('');
      setUrl('');
      setBody('');
      setShowAdd(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(resourceId) {
    setRemovingId(resourceId);
    try {
      await api.removeScriptoriumResource(scriptoriumId, resourceId);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRemovingId(null);
    }
  }

  function openAddForm() {
    setLabel(''); setUrl(''); setBody(''); setAddSource('link');
    setShowAdd(true);
  }

  const addDisabled = adding || !label.trim() ||
    ((addSource === 'link' || addSource === 'document') && !url.trim()) ||
    (addSource === 'library-note' && !body.trim());

  return (
    <div>
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {!loading && resources.length === 0 && (
        <p className="text-sm italic text-muted/50">No resources yet.</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {resources.map((r) => {
          const docId = parseDocumentId(r.url);
          const isDoc = Boolean(docId);
          const isNote = r.type === 'note';
          const isExtLink = !isDoc && !isNote && (!r.type || r.type === 'link');
          let hostname = '';
          if (isExtLink && r.url) {
            try { hostname = new URL(r.url).hostname.replace(/^www\./, ''); } catch {}
          }
          const canDelete = isOwner || r.addedBy?.id === currentUserId;

          function handleClick() {
            if (isDoc) { setViewingDocId(docId); return; }
            if (isNote) { setViewingNote(r); return; }
            window.open(r.url, '_blank', 'noopener,noreferrer');
          }

          return (
            <div key={r.id} className="group relative overflow-hidden rounded-xl border border-rule bg-panel transition-colors hover:border-brass/50">
              <div className="flex h-20 items-center justify-center border-b border-rule/50 bg-ink/50">
                {isDoc ? (
                  <FileText size={22} className="text-muted/40" strokeWidth={1.5} />
                ) : isExtLink && hostname ? (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                    alt=""
                    className="h-10 w-10 opacity-60"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : isExtLink ? (
                  <ExternalLink size={22} className="text-muted/40" strokeWidth={1.5} />
                ) : (
                  <FileText size={22} className="text-muted/40" strokeWidth={1.5} />
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="truncate font-display text-sm text-parchment">{r.label}</p>
                {hostname && <p className="mt-0.5 font-mono text-[10px] text-muted">{hostname}</p>}
                {isNote && r.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted/60">
                    {r.body.replace(/[#*_`[\]]/g, '').slice(0, 80)}
                  </p>
                )}
              </div>
              <button onClick={handleClick} className="absolute inset-0" aria-label={r.label} />
              {canDelete && (
                <button
                  disabled={removingId === r.id}
                  onClick={(e) => { e.stopPropagation(); handleRemove(r.id); }}
                  className="absolute right-1.5 top-1.5 z-10 rounded bg-ink/80 p-1 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 disabled:opacity-30"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isMember && (
        <div className="mt-4">
          {showAdd ? (
            <form onSubmit={handleAdd} className="space-y-2 rounded-lg border border-rule bg-panel/50 p-3">
              <div className="flex gap-1.5">
                {[{ key: 'link', label: 'Link' }, { key: 'library-note', label: 'Library Note' }, { key: 'document', label: 'Document' }].map(({ key, label: btnLabel }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAddSource(key)}
                    className={`rounded border px-2.5 py-1 text-xs transition-colors ${addSource === key ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted hover:text-parchment'}`}
                  >
                    {btnLabel}
                  </button>
                ))}
              </div>

              {addSource === 'link' && (
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="URL"
                  type="url"
                  className="w-full rounded border border-rule bg-ink px-3 py-1.5 text-sm text-parchment placeholder:text-muted/40 focus:border-brass focus:outline-none"
                />
              )}

              {addSource === 'library-note' && (
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {libraryNotes === null ? (
                    <p className="text-xs text-muted">Loading…</p>
                  ) : libraryNotes.length === 0 ? (
                    <p className="text-xs text-muted">No notes in your library.</p>
                  ) : libraryNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => selectLibraryNote(n)}
                      className={`w-full rounded border px-2.5 py-1.5 text-left text-xs transition-colors ${body === n.body ? 'border-brass bg-brass/10 text-brass' : 'border-rule text-muted hover:text-parchment'}`}
                    >
                      {n.title || n.reference || 'Untitled'}
                    </button>
                  ))}
                </div>
              )}

              {addSource === 'document' && (
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {libraryDocs === null ? (
                    <p className="text-xs text-muted">Loading…</p>
                  ) : libraryDocs.length === 0 ? (
                    <p className="text-xs text-muted">No documents in your library.</p>
                  ) : libraryDocs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => selectDocument(d)}
                      className={`w-full rounded border px-2.5 py-1.5 text-left text-xs transition-colors ${url === api.documentFileUrl(d.id) ? 'border-brass bg-brass/10 text-brass' : 'border-rule text-muted hover:text-parchment'}`}
                    >
                      {d.title}
                    </button>
                  ))}
                </div>
              )}

              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label"
                autoFocus={addSource === 'link'}
                className="w-full rounded border border-rule bg-ink px-3 py-1.5 text-sm text-parchment placeholder:text-muted/40 focus:border-brass focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addDisabled}
                  className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
                >
                  {adding ? 'adding…' : 'add'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-muted hover:text-parchment">
                  cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={openAddForm} className="flex items-center gap-1.5 text-xs text-muted hover:text-parchment">
              <Plus size={13} /> add resource
            </button>
          )}
        </div>
      )}

      {viewingNote && (
        <ScriptoriumNoteModal resource={viewingNote} onClose={() => setViewingNote(null)} />
      )}
      {viewingDocId && (
        <DocumentModal
          documentId={viewingDocId}
          isLoggedIn
          onClose={() => setViewingDocId(null)}
        />
      )}
    </div>
  );
}

function ScriptoriumNoteModal({ resource, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 sm:items-center sm:justify-center sm:px-6 sm:py-10"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-page shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-xl sm:border sm:border-pageBorder"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-pageBorder px-5 py-4">
          <h2 className="font-display text-lg text-pageText">{resource.label}</h2>
          <button onClick={onClose} className="text-xs text-pageMuted hover:text-pageText">close</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <RichContent colorMode="light">{resource.body}</RichContent>
        </div>
      </div>
    </div>,
    document.body
  );
}

function WeeklyVerseWidget({ verse }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setText(null);
    api.listInstalledModules('BIBLE').then((modules) => {
      const mod = modules[0];
      if (!mod || cancelled) { setLoading(false); return; }
      return api.getPassage(mod.name, verse).then((data) => {
        const raw = data?.verses?.[0]?.content || null;
        if (!cancelled) setText(raw ? raw.replace(/<[^>]*>/g, '') : null);
      });
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [verse]);

  return (
    <div className="mb-4 rounded-lg border border-rule bg-panel/50 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-brass">Weekly Verse</p>
      <p className="mb-1 text-xs font-medium text-parchment/80">{verse}</p>
      {loading && <p className="text-xs text-muted/50">Loading…</p>}
      {!loading && text && (
        <p className="text-xs leading-relaxed text-muted">{text}</p>
      )}
    </div>
  );
}

function ActiveStudiesWidget({ scriptoriumId, onOpenStudy }) {
  const [studies, setStudies] = useState([]);

  useEffect(() => {
    api.listScriptoriumStudies(scriptoriumId).then((all) => setStudies(all.slice(0, 3))).catch(() => {});
  }, [scriptoriumId]);

  if (studies.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-rule bg-panel/50 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brass">Active Studies</p>
      <div className="space-y-2">
        {studies.map((s) => (
          <button
            key={s.id}
            onClick={() => onOpenStudy(s.id)}
            className="block w-full text-left text-xs text-parchment/80 hover:text-brass"
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function TagsWidget({ tags }) {
  return (
    <div className="rounded-lg border border-rule bg-panel/50 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brass">Tags</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-rule/60 px-2.5 py-0.5 text-xs text-muted/80">
            #{tag}
          </span>
        ))}
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

function ScriptoriumDetail({ id, urlStudyId, onBack, currentUserId, onOpenInPassages, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel }) {
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
  const [section, setSection] = useState(() => {
    try { return localStorage.getItem(`scriptorium-section-${id}`) || 'scroll'; } catch { return 'scroll'; }
  });

  function changeSection(s) {
    setSection(s);
    try { localStorage.setItem(`scriptorium-section-${id}`, s); } catch {}
  }
  const [wallPosts, setWallPosts] = useState([]);
  const [wallLoading, setWallLoading] = useState(true);
  const [wallError, setWallError] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [generatingBanner, setGeneratingBanner] = useState(false);
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

  async function handleGenerateBanner() {
    setGeneratingBanner(true);
    try {
      const { url } = await api.generateScriptoriumBanner(id);
      setBannerUrl(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingBanner(false);
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
        onOpenBiblePanel={onOpenBiblePanel}
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
        </div>

        <div className="absolute bottom-0 left-0 z-10 px-6 pb-4">
          <h2 className="font-display text-3xl text-parchment">{scriptorium.name}</h2>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-parchment/40">{scriptorium.visibility}</p>
        </div>

        {members.length > 0 && (
          <div className="absolute bottom-4 right-6 z-10">
            <AvatarRoll
              members={members}
              total={members.length}
              onMemberClick={null}
              onOverflowClick={() => changeSection('members')}
            />
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-4">
          {scriptorium.description && (
            <p className="mb-4 max-w-xl text-sm leading-relaxed text-muted">{scriptorium.description}</p>
          )}
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <div className="flex gap-6">
            {/* Main column */}
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex gap-6 border-b border-rule text-sm">
                {[
                  { key: 'scroll', label: 'Scroll' },
                  { key: 'about', label: 'About' },
                  { key: 'studies', label: 'Studies' },
                  { key: 'resources', label: 'Resources' },
                  { key: 'members', label: `Members (${members.length})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => changeSection(key)}
                    className={`pb-2 ${section === key ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {section === 'scroll' && (
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

              {section === 'about' && (
                <AboutSection
                  scriptorium={scriptorium}
                  isOwner={isOwner}
                  onSaved={refresh}
                />
              )}

              {section === 'studies' && (
                <ScriptoriumStudiesTab
                  scriptoriumId={id}
                  isMember={isMember}
                  onOpenStudy={(studyId) => routerNavigate('/scriptoriums/' + id + '/studies/' + studyId)}
                />
              )}

              {section === 'resources' && (
                <ResourcesSection
                  scriptoriumId={id}
                  isMember={isMember}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                />
              )}

              {section === 'members' && (
                <div className="overflow-hidden rounded-lg border border-rule">
                  {members.map((m) => (
                    <div key={m.membershipId} className="flex items-center justify-between border-b border-rule px-4 py-2.5 text-sm last:border-0">
                      <div className="flex items-center gap-2.5">
                        <Avatar username={m.username} avatarUrl={m.avatarUrl} size={28} />
                        <span className="text-parchment">
                          {m.displayName || m.username}
                        </span>
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
            </div>

            {/* Right sidebar */}
            <div className="hidden w-64 shrink-0 lg:block">
              {scriptorium.weeklyVerse && (
                <WeeklyVerseWidget verse={scriptorium.weeklyVerse} />
              )}
              <ActiveStudiesWidget scriptoriumId={id} onOpenStudy={(studyId) => routerNavigate('/scriptoriums/' + id + '/studies/' + studyId)} />
              {scriptorium.tags?.length > 0 && (
                <TagsWidget tags={scriptorium.tags} />
              )}
            </div>
          </div>
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
          bannerUrl={bannerUrl}
          uploadingBanner={uploadingBanner}
          generatingBanner={generatingBanner}
          onBannerChange={handleBannerChange}
          onGenerateBanner={handleGenerateBanner}
          onDelete={() => { setShowEditModal(false); handleDelete(); }}
        />
      )}
    </div>
  );
}

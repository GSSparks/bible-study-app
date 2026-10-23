import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Camera, ChevronDown, ChevronLeft, Download, Video, Sparkles, FileText, BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';
import PassageQuickView from './PassageQuickView.jsx';
import RichEditor from './RichEditor.jsx';
import RichContent from './RichContent.jsx';
import DocumentModal from './DocumentModal.jsx';

/** Returns the document ID if the URL is a library PDF file URL, else null. */
function parseDocumentId(url) {
  if (!url) return null;
  const m = url.match(/\/api\/pdf\/([^/]+)\/file/);
  return m ? m[1] : null;
}

// The passage API returns processed HTML (Strong's links,
// cross-reference markup) meant for the main interactive reader. This
// study-lesson view is a plain quick-reference display, not that full
// experience, so tags are stripped rather than rendered — a simple
// regex strip is good enough for SWORD's fairly structured markup and
// avoids dangerouslySetInnerHTML for content this component doesn't
// need to render interactively.
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

function ProgressRing({ percent, size = 64 }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} className="text-rule" stroke="currentColor" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className="text-brass"
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function StudyDetail({ studyId, currentUserId, onBack, onOpenBuilder, onOpenInPassages, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel, bibleModule, backLabel = 'Studies' }) {
  const [study, setStudy] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [participants, setParticipants] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [mobileShowLesson, setMobileShowLesson] = useState(false);
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem(`study-tab-${studyId}`) || 'content'; } catch { return 'content'; }
  });

  function changeTab(newTab) {
    setTab(newTab);
    try { localStorage.setItem(`study-tab-${studyId}`, newTab); } catch {}
  }

  function jumpToLesson(id) {
    setActiveLessonId(id);
    try { localStorage.setItem(`study-lesson-${studyId}`, id); } catch {}
  }

  const bannerInputRef = useRef(null);
  const noteTextareaRef = useRef(null);

  function refresh() {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getStudy(studyId),
      api.listStudyLessons(studyId),
      api.listStudyResources(studyId),
      api.listStudyParticipants(studyId).catch(() => []),
    ])
      .then(([s, l, r, p]) => {
        setStudy(s);
        setLessons(l);
        setResources(r);
        setParticipants(p);
        setActiveLessonId((prev) => {
          if (prev && l.some((lesson) => lesson.id === prev)) return prev;
          try {
            const saved = localStorage.getItem(`study-lesson-${studyId}`);
            if (saved && l.some((lesson) => lesson.id === saved)) return saved;
          } catch {}
          return l[0]?.id || null;
        });
        if (s.isParticipant) {
          api.getStudyProgress(studyId).then(setProgress).catch(() => {});
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [studyId]);

  async function handleJoin() {
    try {
      await api.joinStudy(studyId);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleLeave() {
    try {
      await api.leaveStudy(studyId);
      onBack();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete() {
    try {
      await api.deleteStudy(studyId);
      onBack();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleExport() {
    try {
      const { blob, filename } = await api.exportStudy(studyId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error && !study) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!study) return null;

  const isOwner = study.myRole === 'owner';
  const canEdit = isOwner || study.myScriptoriumRole === 'owner' || study.myScriptoriumRole === 'collaborator';
  const isParticipant = study.isParticipant;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || null;
  const percent = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <aside className={`flex shrink-0 flex-col border-r border-rule bg-panel ${mobileShowLesson ? 'hidden lg:flex lg:w-64' : 'w-full lg:w-64'}`}>
        <div className="shrink-0 border-b border-rule px-4 py-3">
          <button onClick={onBack} className="mb-2 flex items-center text-xs text-muted hover:text-parchment">
            ‹ {backLabel}
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="shrink-0 text-brass" />
            <h1 className="font-display truncate text-base font-semibold text-parchment">{study.title}</h1>
          </div>
          <p className="mt-0.5 font-ui text-[10px] uppercase tracking-widest text-muted">
            {study.scriptoriumId ? 'Group Study' : 'Solo Study'}
          </p>
        </div>

        {study.isParticipant && (
          <div className="shrink-0 border-b border-rule px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="relative flex shrink-0 items-center justify-center">
                <ProgressRing percent={percent} size={40} />
                <span className="absolute text-[9px] font-medium text-parchment">{percent}%</span>
              </div>
              <p className="text-xs text-muted">
                {progress ? `Lesson ${progress.completed} of ${progress.total}` : 'Not started'}
              </p>
            </div>
          </div>
        )}

        <nav className="min-h-0 flex-1 overflow-y-auto py-1">
          {lessons.map((l) => {
            const isActive = l.id === activeLessonId;
            const isComplete = progress?.completedLessonIds?.includes(l.id);
            return (
              <button
                key={l.id}
                onClick={() => { jumpToLesson(l.id); if (tab !== 'content') changeTab('content'); setMobileShowLesson(true); }}
                className={`flex w-full items-center gap-2 border-l-2 px-4 py-2 text-left text-sm leading-snug transition-colors ${
                  isActive ? 'border-brass bg-ink/50 text-brass' : 'border-transparent text-muted hover:bg-ink/30 hover:text-parchment'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{l.title}</span>
                {isComplete && <span className="shrink-0 text-[10px] text-brass">✓</span>}
              </button>
            );
          })}
          {lessons.length === 0 && <p className="px-4 py-3 text-xs text-muted">No lessons yet.</p>}
        </nav>

        <div className="shrink-0 border-t border-rule px-4 py-3">
          {!isParticipant && study.scriptoriumId && (
            <button onClick={handleJoin} className="mb-2 w-full rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass">
              join study
            </button>
          )}
          <div className="space-y-1.5 text-xs">
            {isParticipant && (
              <button onClick={handleExport} className="flex w-full items-center gap-1.5 text-muted hover:text-parchment">
                <Download size={12} className="shrink-0" /> export
              </button>
            )}
            {canEdit && (
              <button onClick={onOpenBuilder} className="flex w-full items-center gap-1.5 text-muted hover:text-parchment">✎ edit study</button>
            )}
            {isParticipant && !isOwner && (
              <button onClick={handleLeave} className="flex w-full items-center gap-1.5 text-red-400/60 hover:text-red-400">leave study</button>
            )}
          </div>
        </div>
      </aside>

      {/* Right pane */}
      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden bg-page ${mobileShowLesson ? 'flex' : 'hidden lg:flex'}`}>
        <button
          onClick={() => setMobileShowLesson(false)}
          className="flex shrink-0 items-center gap-1.5 border-b border-rule px-4 py-2.5 text-sm text-muted hover:text-parchment lg:hidden"
        >
          <ChevronLeft size={15} />
          Lessons
        </button>
        {error && <p className="shrink-0 border-b border-pageBorder px-6 py-2 text-sm text-red-500">{error}</p>}

        {activeLesson ? (
          <>
            <div className="shrink-0 border-b border-pageBorder px-6 pb-0 pt-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-xl text-pageText">{activeLesson.title}</h2>
                  {(activeLesson.reference || activeLesson.module) && (
                    <p className="mt-0.5 text-xs text-pageMuted">
                      {activeLesson.reference}{activeLesson.module && ` · ${activeLesson.module}`}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs">
                  {activeLesson.reference && activeLesson.module && (
                    <>
                      <button onClick={() => onOpenInPassages?.(activeLesson.module, activeLesson.reference)} className="text-pageMuted hover:text-pageAccent">open in Cell →</button>
                      <button onClick={() => onAskAiCompanionAbout?.(activeLesson.module, activeLesson.reference)} className="text-pageMuted hover:text-pageAccent">ask AI →</button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-5 text-sm">
                {[
                  { key: 'content', label: 'Content' },
                  { key: 'discussion', label: 'Discussion' },
                  { key: 'resources', label: 'Resources' },
                  ...(isOwner ? [{ key: 'reflections', label: 'Reflections' }] : []),
                  { key: 'members', label: `Members (${participants.length})` },
                  { key: 'activity', label: 'Activity' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => changeTab(key)}
                    className={`pb-2.5 ${tab === key ? 'border-b-2 border-pageAccent text-pageText' : 'text-pageMuted hover:text-pageText'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === 'content' && (
                <div className="px-7 py-8">
                  <LessonContent
                    lesson={activeLesson}
                    currentUserId={study.creatorId}
                    isOwner={canEdit}
                    onLessonsChanged={refresh}
                    onOpenInPassages={onOpenInPassages}
                    onAskAiCompanionAbout={onAskAiCompanionAbout}
                    noteTextareaRef={noteTextareaRef}
                    onOpenBiblePanel={onOpenBiblePanel}
                    bibleModule={bibleModule}
                  />
                </div>
              )}
              {tab === 'discussion' && (
                <div className="px-7 py-8">
                  <div className="max-w-2xl">
                    <StudyDiscussionTab
                      studyId={studyId}
                      isParticipant={study.isParticipant}
                      isOwner={canEdit}
                      currentUserId={currentUserId}
                      onOpenInPassages={onOpenInPassages}
                      onOpenBiblePanel={onOpenBiblePanel}
                      bibleModule={bibleModule}
                    />
                  </div>
                </div>
              )}
              {tab === 'members' && (
                <div className="px-7 py-8">
                  <div className="max-w-2xl">
                    <MembersTab studyId={studyId} isOwner={isOwner} />
                  </div>
                </div>
              )}
              {tab === 'reflections' && isOwner && (
                <div className="px-7 py-8">
                  <div className="max-w-2xl">
                    <ReflectionsTab studyId={studyId} />
                  </div>
                </div>
              )}
              {tab === 'activity' && (
                <div className="px-7 py-8">
                  <div className="max-w-2xl">
                    <ActivityTab studyId={studyId} />
                  </div>
                </div>
              )}
              {tab === 'resources' && (
                <div className="px-7 py-8">
                  <div className="max-w-2xl">
                    <ResourcesTabContent
                      study={study}
                      resources={resources}
                      activeLesson={activeLesson}
                      isOwner={canEdit}
                      onResourcesChanged={refresh}
                      onAskAiCompanionAbout={onAskAiCompanionAbout}
                      onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
                      onOpenBiblePanel={onOpenBiblePanel}
                      bibleModule={bibleModule}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            {lessons.length === 0 ? (
              <div className="text-center">
                <p className="mb-3 text-sm text-pageMuted">This study has no lessons yet.</p>
                {canEdit && (
                  <div className="flex gap-2">
                    <button onClick={onOpenBuilder} className="rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent">✎ edit study</button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-pageMuted">Select a lesson to begin.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StudySidebar({ study, lessons, progress, resources, activeLesson, nextLesson, onCompleteNext, onJumpToLesson, ProgressRing, isOwner, onResourcesChanged, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel }) {
  const percent = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [openResource, setOpenResource] = useState(null);
  const [openDocumentId, setOpenDocumentId] = useState(null);

  async function handleRemoveResource(id) {
    try {
      await api.removeStudyResource(id);
      onResourcesChanged();
    } catch (e) {
      alert(e.message);
    }
  }

  function handleResourceClick(r) {
    const docId = parseDocumentId(r.url);
    if (docId) { setOpenDocumentId(docId); return; }
    if (r.type === 'link') { window.open(r.url, '_blank', 'noopener,noreferrer'); return; }
    setOpenResource(r);
  }

  return (
    <div className="space-y-6">
      {study.isParticipant && (
        <div>
          <h4 className="mb-2 text-xs uppercase tracking-wide text-muted">Study Progress</h4>
          <div className="flex items-center gap-3 rounded-md border border-rule bg-panel p-3">
            <div className="relative flex shrink-0 items-center justify-center">
              <ProgressRing percent={percent} />
              <span className="absolute text-sm font-medium text-parchment">{percent}%</span>
            </div>
            <div className="text-sm text-muted">
              {progress ? (
                <>
                  Lesson {progress.completed} of {progress.total}
                  <div className="text-xs text-brass">Keep going!</div>
                </>
              ) : (
                'Not started'
              )}
            </div>
          </div>
        </div>
      )}

      {nextLesson && (
        <div>
          <h4 className="mb-2 text-xs uppercase tracking-wide text-muted">Next Up</h4>
          <div className="rounded-md border border-rule bg-panel p-3">
            <button onClick={() => onJumpToLesson(nextLesson.id)} className="mb-2 block text-left text-sm text-parchment hover:text-brass">
              {nextLesson.title}
            </button>
            {nextLesson.reflectionPrompt ? (
              <button
                onClick={() => onJumpToLesson(nextLesson.id)}
                className="w-full rounded border border-rule py-1.5 text-xs text-muted hover:border-brass hover:text-parchment"
              >
                Answer the reflection prompt to complete this lesson
              </button>
            ) : (
              <button onClick={onCompleteNext} className="w-full rounded border border-rule py-1.5 text-xs text-muted hover:border-brass hover:text-parchment">
                Mark as complete
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-wide text-muted">Study Resources</h4>
          {isOwner && (
            <button onClick={() => setShowAddResourceModal(true)} className="text-xs text-brass hover:underline">
              + add
            </button>
          )}
        </div>
        <div className="space-y-1 rounded-md border border-rule bg-panel p-3">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <button
                onClick={() => handleResourceClick(r)}
                disabled={!activeLesson && r.type !== 'note' && r.type !== 'link' && !parseDocumentId(r.url)}
                className="min-w-0 flex-1 truncate text-left text-sm text-muted hover:text-parchment disabled:cursor-default disabled:opacity-40"
              >
                {r.label}
              </button>
              {isOwner && (
                <button onClick={() => handleRemoveResource(r.id)} className="shrink-0 text-xs text-muted hover:text-red-400">
                  remove
                </button>
              )}
            </div>
          ))}
          {resources.length === 0 && <p className="text-xs text-muted">No resources added yet.</p>}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs uppercase tracking-wide text-muted">All Lessons</h4>
        <div className="space-y-1">
          {lessons.map((l, i) => (
            <button
              key={l.id}
              onClick={() => onJumpToLesson(l.id)}
              className="block w-full rounded px-2 py-1 text-left text-sm text-muted hover:bg-ink hover:text-parchment"
            >
              {i + 1}. {l.title}
            </button>
          ))}
        </div>
      </div>

      {showAddResourceModal && (
        <AddResourceModal
          studyId={study.id}
          onClose={() => setShowAddResourceModal(false)}
          onAdded={() => {
            setShowAddResourceModal(false);
            onResourcesChanged();
          }}
        />
      )}

      {openResource && (
        <ResourceModal
          resource={openResource}
          activeLesson={activeLesson}
          onClose={() => setOpenResource(null)}
          onAskAiCompanionAbout={onAskAiCompanionAbout}
          onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
          onOpenBiblePanel={onOpenBiblePanel}
          bibleModule={bibleModule}
        />
      )}
      {openDocumentId && (
        <DocumentModal
          documentId={openDocumentId}
          isLoggedIn
          onClose={() => setOpenDocumentId(null)}
          onDeleted={() => { setOpenDocumentId(null); onResourcesChanged(); }}
          onRenamed={onResourcesChanged}
        />
      )}
    </div>
  );
}

function ContentTab({ study, lessons, activeLesson, onSelectLesson, isOwner, onAddLesson, onGenerate, onLessonsChanged, onOpenInPassages, onAskAiCompanionAbout, onOpenBiblePanel, bibleModule }) {
  const noteTextareaRef = useRef(null);

  if (lessons.length === 0) {
    return (
      <div className="rounded-md border border-rule bg-panel p-6 text-center">
        <p className="mb-3 text-sm text-muted">This study has no lessons yet.</p>
        {isOwner && (
          <div className="flex justify-center gap-2">
            <button onClick={onAddLesson} className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass">
              + add a lesson
            </button>
            <button onClick={onGenerate} className="rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment">
              ✨ generate with AI
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:h-full">
      <div className="mb-4 flex flex-wrap gap-2">
        {lessons.map((l, i) => (
          <button
            key={l.id}
            onClick={() => onSelectLesson(l.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeLesson?.id === l.id ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted hover:border-brass hover:text-parchment'
            }`}
          >
            {i + 1}. {l.title}
          </button>
        ))}
        {isOwner && (
          <>
            <button onClick={onAddLesson} className="rounded-full border border-dashed border-rule px-3 py-1 text-xs text-muted hover:border-brass hover:text-parchment">
              + add lesson
            </button>
            <button onClick={onGenerate} className="rounded-full border border-dashed border-rule px-3 py-1 text-xs text-muted hover:border-brass hover:text-parchment">
              ✨ generate with AI
            </button>
          </>
        )}
      </div>

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {activeLesson && (
          <LessonContent
            lesson={activeLesson}
            currentUserId={study.creatorId}
            isOwner={isOwner}
            onLessonsChanged={onLessonsChanged}
            onOpenInPassages={onOpenInPassages}
            onAskAiCompanionAbout={onAskAiCompanionAbout}
            noteTextareaRef={noteTextareaRef}
            onOpenBiblePanel={onOpenBiblePanel}
            bibleModule={bibleModule}
          />
        )}
      </div>

    </div>
  );
}

function MediaGrid({ items }) {
  const [lightbox, setLightbox] = useState(null);
  if (!items?.length) return null;
  return (
    <>
      <div className={`mb-3 grid gap-1.5 overflow-hidden rounded-lg ${items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {items.map((m, i) =>
          m.type === 'video' ? (
            <video key={i} src={m.url} controls className="w-full rounded" style={{ maxHeight: items.length === 1 ? 360 : 200 }} />
          ) : (
            <img
              key={i}
              src={m.url}
              alt=""
              onClick={() => setLightbox(m.url)}
              className="w-full cursor-zoom-in rounded object-cover"
              style={{ maxHeight: items.length === 1 ? 360 : 200 }}
            />
          )
        )}
      </div>
      {lightbox && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-screen max-w-full object-contain p-8"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}

function StudyDiscussionTab({ studyId, isParticipant, isOwner, currentUserId, onOpenInPassages, onOpenBiblePanel, bibleModule }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const [copiedPostId, setCopiedPostId] = useState(null);

  // compose
  const [newBody, setNewBody] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [posting, setPosting] = useState(false);
  const mediaInputRef = useRef(null);

  // reply
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);

  // edit
  const [editingPostId, setEditingPostId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.listStudyPosts(studyId)
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [studyId]);

  // Scroll to and highlight a post when the URL hash points at one.
  // Runs after posts load so the DOM element exists.
  useEffect(() => {
    if (!posts.length || !location.hash?.startsWith('#post-')) return;
    const postId = location.hash.slice(6);
    const el = document.getElementById(`post-${postId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightedPostId(postId);
    const t = setTimeout(() => setHighlightedPostId(null), 2000);
    return () => clearTimeout(t);
  }, [posts, location.hash]);

  function copyPostLink(postId) {
    navigate({ hash: `post-${postId}` }, { replace: true });
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 1500);
  }

  function handleMediaSelect(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const combined = [...mediaFiles, ...selected].slice(0, 4);
    setMediaFiles(combined);
    setMediaPreviews(combined.map((f) => ({ url: URL.createObjectURL(f), type: f.type.startsWith('video') ? 'video' : 'image' })));
    e.target.value = '';
  }

  function removeMedia(index) {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles((p) => p.filter((_, i) => i !== index));
    setMediaPreviews((p) => p.filter((_, i) => i !== index));
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!newBody.trim() && mediaFiles.length === 0) return;
    setPosting(true);
    setError(null);
    try {
      await api.createStudyPost(studyId, { type: 'post', body: newBody, mediaFiles });
      setNewBody('');
      mediaPreviews.forEach((p) => URL.revokeObjectURL(p.url));
      setMediaFiles([]);
      setMediaPreviews([]);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleReply(e, postId) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setReplying(true);
    setError(null);
    try {
      await api.createStudyReply(postId, replyBody.trim());
      setReplyBody('');
      setReplyingToId(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setReplying(false);
    }
  }

  async function handleDelete(postId) {
    setError(null);
    try {
      await api.deleteStudyPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(post) {
    setEditingPostId(post.id);
    setEditBody(post.body);
    setReplyingToId(null);
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditBody('');
  }

  async function handleSaveEdit(postId) {
    if (!editBody.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateStudyPost(postId, { body: editBody });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, body: updated.body } : p));
      cancelEdit();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {isParticipant ? (
        <form onSubmit={handlePost} className="mb-6 rounded-md border border-pageBorder bg-white/30 p-3">
          <div data-color-mode="light">
            <RichEditor value={newBody} onChange={setNewBody} height={160} colorMode="light" />
          </div>

          {mediaPreviews.length > 0 && (
            <div className={`mt-2 grid gap-1.5 ${mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {mediaPreviews.map((p, i) => (
                <div key={i} className="relative overflow-hidden rounded-md">
                  {p.type === 'video' ? (
                    <video src={p.url} className="max-h-40 w-full rounded" />
                  ) : (
                    <img src={p.url} alt="" className="max-h-40 w-full rounded object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input ref={mediaInputRef} type="file" accept="image/*,video/mp4,video/webm" multiple className="hidden" onChange={handleMediaSelect} />
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                disabled={mediaFiles.length >= 4}
                className="text-xs text-pageMuted hover:text-pageText disabled:opacity-40"
                title="Attach photo or video (max 4)"
              >
                + photo/video {mediaFiles.length > 0 && `(${mediaFiles.length}/4)`}
              </button>
              <span className="text-xs text-pageMuted/60">Select a verse in the Bible pane and click <strong className="font-medium text-pageText/80">Share →</strong> to share a finding</span>
            </div>
            <button
              type="submit"
              disabled={posting || (!newBody.trim() && mediaFiles.length === 0)}
              className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
            >
              {posting ? 'posting…' : 'post'}
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-5 text-xs text-pageMuted">Join this study to take part in the discussion.</p>
      )}

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-pageMuted">Loading…</p>}

      <div className="space-y-4">
        {posts.map((post) => {
          const isAuthor = post.author.id === currentUserId;
          const canDelete = isAuthor || isOwner;
          const isEditing = editingPostId === post.id;
          const isReplying = replyingToId === post.id;
          return (
            <div
              key={post.id}
              id={`post-${post.id}`}
              className={`scroll-mt-4 rounded-md border p-4 transition-colors duration-700 ${highlightedPostId === post.id ? 'border-brass bg-brass/10' : 'border-pageBorder bg-white/30'}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Avatar username={post.author.username} size={24} />
                  <span className="text-sm font-medium text-pageText">{post.author.displayName || post.author.username}</span>
                  {post.type === 'finding' && post.reference && (
                    <span className="flex items-center gap-1">
                      <span className="font-mono text-xs font-medium text-pageAccent">{post.reference}</span>
                      {onOpenInPassages && (
                        <button onClick={() => onOpenInPassages(post.module || undefined, post.reference)} className="text-xs text-pageMuted hover:text-pageAccent">
                          open →
                        </button>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => copyPostLink(post.id)}
                    title="Copy link to this post"
                    className="text-xs text-pageMuted hover:text-pageText"
                  >
                    {copiedPostId === post.id ? 'copied!' : '🔗'}
                  </button>
                  {isAuthor && !isEditing && (
                    <button onClick={() => startEdit(post)} className="text-xs text-pageMuted hover:text-pageText">edit</button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(post.id)} className="text-xs text-pageMuted hover:text-red-500">delete</button>
                  )}
                </div>
              </div>

              {post.title && <p className="mb-1 text-sm font-medium text-pageText">{post.title}</p>}

              {isEditing ? (
                <div className="mb-3">
                  <div data-color-mode="light">
                    <RichEditor value={editBody} onChange={setEditBody} height={160} colorMode="light" />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={cancelEdit} className="text-xs text-pageMuted hover:text-pageText">cancel</button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(post.id)}
                      disabled={saving || !editBody.trim()}
                      className="rounded bg-pageAccent/80 px-3 py-1 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50"
                    >
                      {saving ? 'saving…' : 'save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <RichContent
                    colorMode="light"
                    className="text-sm leading-relaxed text-pageText/90"
                    onVerseClick={onOpenBiblePanel}
                    onNavigate={(ref) => onOpenInPassages?.(null, ref)}
                    bibleModule={bibleModule}
                  >{post.body}</RichContent>
                </div>
              )}

              <MediaGrid items={post.mediaUrls} />

              {post.replies.length > 0 && (
                <div className="mb-3 space-y-2 border-l-2 border-pageBorder pl-3">
                  {post.replies.map((reply) => {
                    const canDeleteReply = reply.author.id === currentUserId || isOwner;
                    return (
                      <div key={reply.id} className="flex items-start justify-between gap-2">
                        <div>
                          <span className="mr-1.5 text-xs font-medium text-pageText">{reply.author.displayName || reply.author.username}</span>
                          <span className="whitespace-pre-wrap text-xs text-pageText/80">{reply.body}</span>
                        </div>
                        {canDeleteReply && (
                          <button onClick={() => handleDelete(reply.id)} className="shrink-0 text-xs text-pageMuted hover:text-red-500">✕</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isParticipant && (
                isReplying ? (
                  <form onSubmit={(e) => handleReply(e, post.id)} className="flex items-start gap-2">
                    <input
                      autoFocus
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Write a reply…"
                      className="min-w-0 flex-1 rounded border border-pageBorder bg-white/50 px-2 py-1 text-xs text-pageText placeholder:text-pageMuted focus:border-pageAccent focus:outline-none"
                    />
                    <button type="submit" disabled={replying || !replyBody.trim()} className="rounded bg-pageAccent/80 px-2.5 py-1 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50">
                      {replying ? '…' : 'reply'}
                    </button>
                    <button type="button" onClick={() => { setReplyingToId(null); setReplyBody(''); }} className="text-xs text-pageMuted hover:text-pageText">
                      cancel
                    </button>
                  </form>
                ) : (
                  <button onClick={() => { setReplyingToId(post.id); setReplyBody(''); }} className="text-xs text-pageMuted hover:text-pageText">
                    reply
                  </button>
                )
              )}
            </div>
          );
        })}
        {!loading && posts.length === 0 && (
          <p className="text-sm text-pageMuted">No posts yet — start the discussion!</p>
        )}
      </div>
    </div>
  );
}

function LessonContent({ lesson, isOwner, onLessonsChanged, onOpenInPassages, onAskAiCompanionAbout, noteTextareaRef, onOpenBiblePanel, bibleModule }) {
  const [passageOpen, setPassageOpen] = useState(false);
  const [passage, setPassage] = useState(null);
  const [passageError, setPassageError] = useState(null);
  const [note, setNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [pendingBody, setPendingBody] = useState('');
  const [savingBody, setSavingBody] = useState(false);
  const [bodyError, setBodyError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoInputRef = useRef(null);
  const [reflectionText, setReflectionText] = useState(lesson.myReflection?.body || '');
  const [reflectionShared, setReflectionShared] = useState(Boolean(lesson.myReflection?.shared));
  const [reflectionSubmitted, setReflectionSubmitted] = useState(Boolean(lesson.myReflection));
  const [editingReflection, setEditingReflection] = useState(false);
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState(null);
  const [groupReflections, setGroupReflections] = useState([]);

  useEffect(() => {
    setPassage(null);
    setPassageError(null);
    setEditingBody(false);
    setVideoUrl(lesson.videoUrl || null);
    setReflectionText(lesson.myReflection?.body || '');
    setReflectionShared(Boolean(lesson.myReflection?.shared));
    setReflectionSubmitted(Boolean(lesson.myReflection));
    setEditingReflection(false);
    setReflectionError(null);
    setGroupReflections([]);
    if (lesson.module && lesson.reference) {
      api
        .getPassage(lesson.module, lesson.reference)
        .then((res) => setPassage(res.verses || []))
        .catch((e) => setPassageError(e.message));
    }
    if (lesson.reflectionPrompt) {
      api.getStudySharedReflections(lesson.id).then(setGroupReflections).catch(() => {});
    }
  }, [lesson.id]);

  useEffect(() => {
    setNoteLoading(true);
    if (lesson.reference) {
      api
        .listNotes({ reference: lesson.reference })
        .then((notes) => {
          const existing = notes?.[0] || null;
          setNote(existing);
          setNoteText(existing?.body || '');
        })
        .catch(() => {})
        .finally(() => setNoteLoading(false));
    } else {
      setNoteLoading(false);
    }
  }, [lesson.id]);

  async function saveNote() {
    setSavingNote(true);
    try {
      if (note) {
        await api.updateNote(note.id, { body: noteText });
      } else {
        const created = await api.createNote({ reference: lesson.reference, body: noteText });
        setNote(created);
      }
      setEditingNote(false);
    } catch (e) {
      // Surfaced inline below rather than a top-level error, since
      // this is a small, recoverable part of the page.
    } finally {
      setSavingNote(false);
    }
  }

  async function handleVideoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { url } = await api.uploadLessonVideo(lesson.id, file);
      setVideoUrl(url);
      onLessonsChanged();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  }

  async function handleRemoveVideo() {
    if (!confirm('Remove the video from this lesson?')) return;
    try {
      await api.removeLessonVideo(lesson.id);
      setVideoUrl(null);
      onLessonsChanged();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSubmitReflection(andComplete) {
    setSavingReflection(true);
    setReflectionError(null);
    try {
      await api.saveStudyLessonReflection(lesson.id, reflectionText, reflectionShared);
      setReflectionSubmitted(true);
      setEditingReflection(false);
      if (andComplete) {
        await api.markStudyLessonComplete(lesson.id);
      }
      if (reflectionShared) {
        api.getStudySharedReflections(lesson.id).then(setGroupReflections).catch(() => {});
      }
      onLessonsChanged();
    } catch (e) {
      setReflectionError(e.message);
    } finally {
      setSavingReflection(false);
    }
  }

  async function saveBody() {
    setSavingBody(true);
    setBodyError(null);
    try {
      await api.updateStudyLesson(lesson.id, {
        order: lesson.order,
        title: lesson.title,
        module: lesson.module || null,
        reference: lesson.reference || null,
        body: pendingBody || null,
      });
      onLessonsChanged();
      setEditingBody(false);
    } catch (e) {
      setBodyError(e.message);
    } finally {
      setSavingBody(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">

      {/* Passage */}
      <div>
        <button
          onClick={() => setPassageOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <h3 className="font-display text-lg leading-snug text-pageText">
            {lesson.reference || 'No passage set'}
            {lesson.module && <span className="ml-2 text-sm font-normal text-pageMuted">{lesson.module}</span>}
          </h3>
          <ChevronDown
            size={16}
            className={`shrink-0 text-pageMuted transition-transform duration-200 ${passageOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {passageOpen && (
          <div className="mt-4">
            {passageError && <p className="text-sm text-red-500">{passageError}</p>}
            {!lesson.reference && <p className="text-sm italic text-pageMuted">No passage set for this lesson yet.</p>}
            {lesson.reference && !passage && !passageError && <p className="text-sm text-pageMuted">Loading…</p>}
            {passage && (
              <p className="font-display text-base leading-loose text-pageText">
                {passage.map((v) => (
                  <span key={v.verseNr}>
                    <sup className="mr-0.5 text-xs text-pageMuted">{v.verseNr}</sup>
                    {stripHtml(v.content)}{' '}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Video */}
      {(videoUrl || isOwner) && (
        <div className="overflow-hidden rounded-xl border border-rule bg-ink">
          <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoChange} />
          {videoUrl ? (
            <>
              <video src={videoUrl} controls className="w-full" style={{ maxHeight: '480px' }} />
              {isOwner && (
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-muted">Lesson Video</span>
                  <div className="flex gap-3">
                    <button onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} className="text-xs text-muted hover:text-parchment disabled:opacity-50">
                      {uploadingVideo ? 'uploading…' : 'replace'}
                    </button>
                    <button onClick={handleRemoveVideo} className="text-xs text-muted hover:text-red-400">
                      remove
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingVideo}
              className="flex w-full flex-col items-center justify-center gap-2 py-10 text-muted hover:text-parchment disabled:opacity-50"
            >
              <Video size={24} strokeWidth={1.5} />
              <span className="text-sm">{uploadingVideo ? 'uploading…' : 'add a lesson video'}</span>
              <span className="text-xs text-muted/60">mp4, webm, or mov · up to 500 MB</span>
            </button>
          )}
        </div>
      )}

      {/* Study Notes */}
      {(lesson.body || isOwner) && (
        <div className="border-t border-pageBorder pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-pageMuted">Study Notes</h4>
            {isOwner && !editingBody && (
              <button
                onClick={() => { setPendingBody(lesson.body || ''); setEditingBody(true); }}
                className="text-xs text-pageMuted hover:text-pageAccent"
              >
                {lesson.body ? 'edit' : '+ add notes'}
              </button>
            )}
          </div>
          {editingBody ? (
            <>
              <RichEditor value={pendingBody} onChange={setPendingBody} height={300} colorMode="light" />
              {bodyError && <p className="mt-1 text-xs text-red-500">{bodyError}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => { setEditingBody(false); setBodyError(null); }}
                  className="text-xs text-pageMuted hover:text-pageText"
                >
                  cancel
                </button>
                <button
                  onClick={saveBody}
                  disabled={savingBody}
                  className="rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50"
                >
                  {savingBody ? 'saving…' : 'save'}
                </button>
              </div>
            </>
          ) : (
            <div
              onDoubleClick={isOwner ? () => { setPendingBody(lesson.body || ''); setEditingBody(true); } : undefined}
              className={isOwner ? 'cursor-text select-none' : ''}
              title={isOwner ? 'Double-click to edit' : undefined}
            >
              {lesson.body ? (
                <RichContent colorMode="light" onVerseClick={onOpenBiblePanel} onNavigate={(ref) => onOpenInPassages?.(null, ref)} bibleModule={bibleModule}>{lesson.body}</RichContent>
              ) : (
                <p className="text-sm italic text-pageMuted">Double-click to add study notes for this lesson…</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Your Notes */}
      <div className="border-t border-pageBorder pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-pageMuted">Your Notes</h4>
          {!editingNote && (
            <button
              onClick={() => setEditingNote(true)}
              className="text-xs text-pageMuted hover:text-pageAccent"
            >
              {noteText.trim() ? 'edit' : '+ add note'}
            </button>
          )}
        </div>
        {noteLoading ? (
          <p className="text-sm text-pageMuted">Loading…</p>
        ) : editingNote ? (
          <>
            <textarea
              ref={noteTextareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={6}
              placeholder="Write your personal notes for this lesson…"
              className="w-full rounded border border-pageBorder bg-white/50 px-3 py-2.5 text-sm leading-relaxed text-pageText placeholder:text-pageMuted focus:border-pageAccent focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setEditingNote(false)} className="text-xs text-pageMuted hover:text-pageText">cancel</button>
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50"
              >
                {savingNote ? 'saving…' : 'save'}
              </button>
            </div>
          </>
        ) : noteText.trim() ? (
          <RichContent colorMode="light" onVerseClick={onOpenBiblePanel} onNavigate={(ref) => onOpenInPassages?.(null, ref)} bibleModule={bibleModule}>{noteText}</RichContent>
        ) : (
          <p className="text-sm italic text-pageMuted">Click '+ add note' to write personal notes for this lesson.</p>
        )}
      </div>

      {/* Your Response */}
      {lesson.reflectionPrompt && (
        <div className="space-y-4 border-t border-pageBorder pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-pageMuted">Your Response</p>

          <div className="rounded-xl border border-pageBorder bg-page p-6">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-pageMuted">Reflection</h4>
            <p className="mb-4 font-display text-base leading-relaxed text-pageText">{lesson.reflectionPrompt}</p>
            {reflectionSubmitted && !editingReflection ? (
              <div>
                <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-pageText/90">{reflectionText}</p>
                <button
                  onClick={() => setEditingReflection(true)}
                  className="text-xs text-pageMuted hover:text-pageAccent"
                >
                  edit response
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  rows={5}
                  placeholder="Write your response here…"
                  className="w-full rounded border border-pageBorder bg-white/50 px-3 py-2.5 text-sm leading-relaxed text-pageText placeholder:text-pageMuted focus:border-pageAccent focus:outline-none"
                />
                {reflectionError && <p className="mt-1 text-xs text-red-500">{reflectionError}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-pageMuted select-none">
                    <input
                      type="checkbox"
                      checked={reflectionShared}
                      onChange={(e) => setReflectionShared(e.target.checked)}
                      className="accent-pageAccent"
                    />
                    Share with group
                  </label>
                  <div className="flex gap-2">
                    {editingReflection && (
                      <button
                        onClick={() => { setEditingReflection(false); setReflectionError(null); }}
                        className="text-xs text-pageMuted hover:text-pageText"
                      >
                        cancel
                      </button>
                    )}
                    {editingReflection ? (
                      <button
                        onClick={() => handleSubmitReflection(false)}
                        disabled={savingReflection || !reflectionText.trim()}
                        className="rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50"
                      >
                        {savingReflection ? 'saving…' : 'Update response'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubmitReflection(true)}
                        disabled={savingReflection || !reflectionText.trim()}
                        className="rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50"
                      >
                        {savingReflection ? 'saving…' : 'Submit & mark complete'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {groupReflections.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-pageMuted">From Your Group</p>
              {groupReflections.map((r) => (
                <div key={r.id} className="rounded-lg border border-pageBorder/50 bg-white/30 px-4 py-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Avatar username={r.user.username} avatarUrl={r.user.avatarUrl} size={18} />
                    <span className="text-xs font-medium text-pageText">{r.user.displayName || r.user.username}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-pageText/80">{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}


function MembersTab({ studyId, isOwner }) {
  const [members, setMembers] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const requests = [api.listStudyParticipants(studyId)];
    if (isOwner) requests.push(api.getStudyParticipantProgress(studyId));
    Promise.all(requests)
      .then(([m, p]) => { setMembers(m); if (p) setProgress(p); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [studyId, isOwner]);

  if (loading) return <p className="text-sm text-pageMuted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  if (isOwner && progress) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-pageMuted">{progress.participants.length} participant{progress.participants.length !== 1 ? 's' : ''} · {progress.lessons.length} lesson{progress.lessons.length !== 1 ? 's' : ''}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="pb-2 pr-4 text-left text-xs font-normal text-pageMuted">Participant</th>
                {progress.lessons.map((l) => (
                  <th key={l.id} className="pb-2 px-1 text-center text-xs font-normal text-pageMuted" title={l.title}>
                    {l.order}
                  </th>
                ))}
                <th className="pb-2 pl-4 text-right text-xs font-normal text-pageMuted">Done</th>
              </tr>
            </thead>
            <tbody>
              {progress.participants.map((p) => {
                const done = p.completedLessonIds.length;
                const total = progress.lessons.length;
                return (
                  <tr key={p.id} className="border-t border-pageBorder/40">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <Avatar username={p.username} avatarUrl={p.avatarUrl} size={20} />
                        <span className="text-pageText">{p.displayName || p.username}</span>
                        {p.role === 'owner' && <span className="text-[10px] text-pageAccent">owner</span>}
                      </div>
                    </td>
                    {progress.lessons.map((l) => (
                      <td key={l.id} className="px-1 text-center">
                        {p.completedLessonIds.includes(l.id)
                          ? <span className="text-xs text-pageAccent">✓</span>
                          : <span className="text-xs text-pageBorder">·</span>}
                      </td>
                    ))}
                    <td className="py-2 pl-4 text-right text-xs text-pageMuted">
                      {done}/{total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-pageBorder">
      {members.map((m) => (
        <div key={m.participantId} className="flex items-center justify-between border-b border-pageBorder px-3 py-2 text-sm last:border-0">
          <div className="flex items-center gap-2">
            <Avatar username={m.username} size={24} />
            <span className="text-pageText">{m.username}</span>
            {m.role === 'owner' && <span className="text-xs text-pageAccent">owner</span>}
          </div>
        </div>
      ))}
      {members.length === 0 && <p className="p-3 text-sm text-pageMuted">No participants yet.</p>}
    </div>
  );
}

function ReflectionsTab({ studyId }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    setLoading(true);
    api.listStudyReflections(studyId)
      .then((data) => {
        setLessons(data);
        // Auto-expand the first lesson that has responses
        const first = data.find((l) => l.reflections.length > 0);
        if (first) setExpanded({ [first.id]: true });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [studyId]);

  if (loading) return <p className="text-sm text-pageMuted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (lessons.length === 0) {
    return <p className="py-8 text-center text-sm text-pageMuted">No lessons with reflection prompts yet.</p>;
  }

  return (
    <div className="space-y-3 pb-6">
      {lessons.map((lesson) => {
        const isOpen = !!expanded[lesson.id];
        const count = lesson.reflections.length;
        return (
          <div key={lesson.id} className="rounded-xl border border-pageBorder bg-white/30">
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [lesson.id]: !prev[lesson.id] }))}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-base text-pageText">
                  {lesson.order}. {lesson.title || 'Untitled lesson'}
                </p>
                <p className="mt-0.5 text-xs text-pageMuted">
                  {count === 0 ? 'No responses yet' : `${count} response${count !== 1 ? 's' : ''}`}
                </p>
              </div>
              <span className="ml-4 shrink-0 text-pageMuted">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="border-t border-pageBorder px-4 pb-4 pt-3">
                <p className="mb-3 rounded-lg bg-pageBorder/30 px-3 py-2 text-sm italic text-pageText/70">
                  "{lesson.reflectionPrompt}"
                </p>
                {count === 0 ? (
                  <p className="text-sm text-pageMuted">No one has responded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {lesson.reflections.map((r) => (
                      <div key={r.id} className="rounded-lg border border-pageBorder/50 bg-white/40 px-4 py-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Avatar username={r.user.username} size={20} />
                          <span className="text-xs font-medium text-pageText">
                            {r.user.displayName || r.user.username}
                          </span>
                          <span className="text-xs text-pageMuted">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-pageText/80">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActivityTab({ studyId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getStudyActivity(studyId)
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [studyId]);

  if (loading) return <p className="text-sm text-pageMuted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (events.length === 0) return <p className="py-8 text-center text-sm text-pageMuted">No activity yet.</p>;

  function EventRow({ event }) {
    const user = event.user || event.author;
    const dateStr = new Date(event.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    let icon = '·';
    let text = null;

    if (event.type === 'joined') {
      icon = '👋';
      text = <><strong>{user?.displayName || user?.username}</strong> joined the study</>;
    } else if (event.type === 'lesson_added') {
      icon = '📖';
      text = <>Lesson added: <strong>{event.lesson?.title}</strong></>;
    } else if (event.type === 'completed') {
      icon = '✓';
      text = <><strong>{user?.displayName || user?.username}</strong> completed <em>{event.lesson?.title}</em></>;
    } else if (event.type === 'reflection_shared') {
      icon = '💬';
      text = <><strong>{user?.displayName || user?.username}</strong> shared a reflection on <em>{event.lesson?.title}</em></>;
    } else if (event.type === 'discussion_post') {
      icon = '📝';
      text = <><strong>{user?.displayName || user?.username}</strong> posted: <em className="text-pageMuted">{event.preview}</em></>;
    } else if (event.type === 'resource_added') {
      icon = '🔗';
      text = <>Resource added: <strong>{event.resource?.label}</strong></>;
    }

    return (
      <div className="flex items-start gap-3 border-b border-pageBorder/40 py-2.5 last:border-0">
        <span className="mt-0.5 w-5 shrink-0 text-center text-sm">{icon}</span>
        <div className="min-w-0 flex-1 text-sm text-pageText/80">{text}</div>
        <span className="shrink-0 text-xs text-pageMuted">{dateStr}</span>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {events.map((e, i) => <EventRow key={i} event={e} />)}
    </div>
  );
}

function ResourceCard({ resource, onClick, onRemove, isOwner }) {
  const docId = parseDocumentId(resource.url);
  let hostname = '';
  if (resource.type === 'link' && resource.url && !docId) {
    try { hostname = new URL(resource.url).hostname.replace(/^www\./, ''); } catch {}
  }
  const isLink = resource.type === 'link' && !docId;
  const isNote = resource.type === 'note';
  const isDoc = Boolean(docId);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-pageBorder bg-white/40 transition-colors hover:border-pageAccent/50">
      <div className="flex h-20 items-center justify-center border-b border-pageBorder/50 bg-white/30">
        {isDoc ? (
          <FileText size={22} className="text-muted/40" strokeWidth={1.5} />
        ) : isLink && hostname ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
            alt=""
            className="h-10 w-10 opacity-60"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : isLink ? (
          <ExternalLink size={22} className="text-muted/40" strokeWidth={1.5} />
        ) : isNote ? (
          <FileText size={22} className="text-muted/40" strokeWidth={1.5} />
        ) : (
          <BookOpen size={22} className="text-muted/40" strokeWidth={1.5} />
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate font-display text-sm text-pageText">{resource.label}</p>
        {hostname && <p className="mt-0.5 font-mono text-[10px] text-pageMuted">{hostname}</p>}
        {isNote && resource.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-pageMuted/70">
            {resource.body.replace(/^#{1,6}\s+.+\n?/, '').replace(/[#*_`[\]]/g, '').slice(0, 80)}
          </p>
        )}
      </div>
      <button onClick={onClick} className="absolute inset-0" aria-label={resource.label} />
      {isOwner && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute right-1.5 top-1.5 z-10 rounded bg-pageBorder/80 p-1 text-pageMuted opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

function ResourcesTabContent({ study, resources, activeLesson, isOwner, onResourcesChanged, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel, bibleModule }) {
  const [openResource, setOpenResource] = useState(null);
  const [openDocumentId, setOpenDocumentId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [pending, setPending] = useState([]);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    if (isOwner) {
      api.getStudyPendingResources(study.id).then(setPending).catch(() => {});
    }
  }, [study.id, isOwner]);

  function handleClick(r) {
    const docId = parseDocumentId(r.url);
    if (docId) { setOpenDocumentId(docId); return; }
    if (r.type === 'link') { window.open(r.url, '_blank', 'noopener,noreferrer'); return; }
    setOpenResource(r);
  }

  async function handleRemove(id) {
    try { await api.removeStudyResource(id); onResourcesChanged(); }
    catch (e) { alert(e.message); }
  }

  async function handleApprove(resourceId) {
    setApprovingId(resourceId);
    try {
      await api.approveStudyResource(resourceId);
      setPending((prev) => prev.filter((r) => r.id !== resourceId));
      onResourcesChanged();
    } catch (e) { alert(e.message); }
    finally { setApprovingId(null); }
  }

  async function handleReject(resourceId) {
    try {
      await api.removeStudyResource(resourceId);
      setPending((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="pb-6">
      <div className="mb-4 flex justify-end gap-3">
        {isOwner && (
          <button onClick={() => setShowAddModal(true)} className="text-xs text-brass hover:underline">+ add resource</button>
        )}
        {!isOwner && (
          <button onClick={() => setShowSuggestModal(true)} className="text-xs text-muted hover:text-brass">suggest a resource</button>
        )}
      </div>

      {isOwner && pending.length > 0 && (
        <div className="mb-6 rounded-lg border border-pageBorder bg-pageAccent/5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-pageMuted">
            Pending suggestions ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded border border-pageBorder bg-page px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="truncate text-pageText">{r.label}</span>
                  {r.suggestor && (
                    <span className="ml-2 text-xs text-pageMuted">from {r.suggestor.displayName || r.suggestor.username}</span>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    disabled={approvingId === r.id}
                    onClick={() => handleApprove(r.id)}
                    className="rounded border border-pageAccent/40 px-2 py-0.5 text-xs text-pageAccent hover:bg-pageAccent/10 disabled:opacity-50"
                  >
                    {approvingId === r.id ? '…' : 'approve'}
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    className="text-xs text-pageMuted hover:text-red-500"
                  >
                    reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resources.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-pageMuted">No resources added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              isOwner={isOwner}
              onClick={() => handleClick(r)}
              onRemove={() => handleRemove(r.id)}
            />
          ))}
        </div>
      )}
      {showAddModal && (
        <AddResourceModal
          studyId={study.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); onResourcesChanged(); }}
        />
      )}
      {showSuggestModal && (
        <AddResourceModal
          studyId={study.id}
          isSuggestion
          onClose={() => setShowSuggestModal(false)}
          onAdded={() => { setShowSuggestModal(false); }}
        />
      )}
      {openResource && (
        <ResourceModal
          resource={openResource}
          activeLesson={activeLesson}
          onClose={() => setOpenResource(null)}
          onAskAiCompanionAbout={onAskAiCompanionAbout}
          onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
          onOpenBiblePanel={onOpenBiblePanel}
          bibleModule={bibleModule}
        />
      )}
      {openDocumentId && (
        <DocumentModal
          documentId={openDocumentId}
          isLoggedIn
          onClose={() => setOpenDocumentId(null)}
          onDeleted={() => { setOpenDocumentId(null); onResourcesChanged(); }}
          onRenamed={onResourcesChanged}
        />
      )}
    </div>
  );
}

function AddLessonModal({ studyId, nextOrder, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [module, setModule] = useState('');
  const [reference, setReference] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createStudyLesson(studyId, { order: nextOrder, title, module: module || null, reference: reference || null, body: body || null });
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Add a Lesson</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Module</label>
              <input value={module} onChange={(e) => setModule(e.target.value)} placeholder="KJV" className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Reference</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="John 15:1-17" className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Your Notes (optional)</label>
            <RichEditor value={body} onChange={setBody} height={180} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50">
            {submitting ? 'adding…' : 'add lesson'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditLessonModal({ lesson, onClose, onSaved }) {
  const [title, setTitle] = useState(lesson.title);
  const [module, setModule] = useState(lesson.module || '');
  const [reference, setReference] = useState(lesson.reference || '');
  const [body, setBody] = useState(lesson.body || '');
  const [reflectionPrompt, setReflectionPrompt] = useState(lesson.reflectionPrompt || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.updateStudyLesson(lesson.id, {
        order: lesson.order,
        title,
        module: module || null,
        reference: reference || null,
        body: body || null,
        reflectionPrompt: reflectionPrompt || null,
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Edit Lesson</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Module</label>
              <input value={module} onChange={(e) => setModule(e.target.value)} placeholder="KJV" className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Reference</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="John 15:1-17" className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Your Notes (optional)</label>
            <RichEditor value={body} onChange={setBody} height={180} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Reflection Prompt <span className="normal-case text-muted/60">(optional)</span></label>
            <input
              value={reflectionPrompt}
              onChange={(e) => setReflectionPrompt(e.target.value)}
              placeholder="What stood out to you in this passage?"
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50">
            {submitting ? 'saving…' : 'save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function GenerateStudyModal({ studyId, nextOrder, onClose, onCreated }) {
  const [step, setStep] = useState('form'); // 'form' | 'reviewing'
  const [topic, setTopic] = useState('');
  const [weekCount, setWeekCount] = useState(6);
  const [module, setModule] = useState('');
  const [modules, setModules] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .listInstalledModules('BIBLE')
      .then((list) => {
        setModules(list);
        if (list[0]) setModule(list[0].name);
      })
      .catch(() => {});
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.generateStudyLessonDrafts(studyId, { topic, weekCount: Number(weekCount), module });
      // tempId is purely a local React key/removal handle — these
      // drafts have no real id yet, since nothing has been persisted.
      setDrafts(result.map((d, i) => ({ ...d, tempId: i })));
      setStep('reviewing');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateDraft(tempId, field, value) {
    setDrafts((prev) => prev.map((d) => (d.tempId === tempId ? { ...d, [field]: value } : d)));
  }

  function removeDraft(tempId) {
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
  }

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      const lessons = drafts.map((d, i) => ({
        order: nextOrder + i,
        title: d.title,
        module: d.module,
        reference: d.reference || null,
        body: d.body || null,
      }));
      await api.bulkCreateStudyLessons(studyId, lessons);
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Generate a Study Plan</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="The Gospel of John, chapters 14-17"
                autoFocus
                className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Weeks</label>
                <input
                  type="number"
                  min={1}
                  max={26}
                  value={weekCount}
                  onChange={(e) => setWeekCount(e.target.value)}
                  className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Bible Module</label>
                <select
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
                >
                  {modules.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.description || m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted">
              This drafts a starting point — you'll review and can edit every lesson before anything is actually created.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !topic.trim() || !module}
              className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
            >
              {submitting ? 'generating…' : 'generate'}
            </button>
          </form>
        )}

        {step === 'reviewing' && (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Review each lesson below — edit anything, or remove one you don't want. Nothing is created until you accept.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="space-y-3">
              {drafts.map((d, i) => (
                <div key={d.tempId} className="rounded-md border border-rule bg-ink p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted">Week {i + 1}</span>
                    <button onClick={() => removeDraft(d.tempId)} className="text-xs text-muted hover:text-red-400">
                      remove
                    </button>
                  </div>
                  <input
                    value={d.title}
                    onChange={(e) => updateDraft(d.tempId, 'title', e.target.value)}
                    className="mb-2 w-full rounded border border-pageBorder px-2 py-1 text-sm focus:border-pageAccent"
                  />
                  <div className="mb-2">
                    <input
                      value={d.reference || ''}
                      onChange={(e) => updateDraft(d.tempId, 'reference', e.target.value)}
                      placeholder="John 15:1-17"
                      className={`w-full rounded border bg-panel px-2 py-1 text-xs placeholder:text-muted focus:border-brass ${
                        d.reference ? 'border-rule text-parchment' : 'border-amber-600 text-amber-400'
                      }`}
                    />
                    {!d.reference && (
                      <p className="mt-1 text-xs text-amber-400">
                        ⚠ No reference — the assistant couldn't confirm this passage against {module}. Fill one in manually or leave it for now.
                      </p>
                    )}
                  </div>
                  <textarea
                    value={d.body || ''}
                    onChange={(e) => updateDraft(d.tempId, 'body', e.target.value)}
                    rows={2}
                    className="w-full rounded border border-pageBorder px-2 py-1 text-xs focus:border-pageAccent"
                  />
                </div>
              ))}
              {drafts.length === 0 && <p className="text-sm text-muted">All lessons removed — go back and generate again, or close this.</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('form')}
                className="flex-1 rounded border border-rule px-3 py-2 text-sm text-muted hover:border-brass hover:text-parchment"
              >
                ← regenerate
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting || drafts.length === 0}
                className="flex-1 rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
              >
                {submitting ? 'creating…' : `accept all (${drafts.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceModal({ resource, activeLesson, onClose, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel, bibleModule }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isNote = resource.type === 'note';
  const usesPagePalette = true;

  function renderContent() {
    if (resource.type === 'note') {
      return (
        <div className="p-5">
          <RichContent colorMode="light" onVerseClick={(ref) => { onOpenBiblePanel?.(ref); onClose(); }} bibleModule={bibleModule}>
            {resource.body}
          </RichContent>
        </div>
      );
    }
    // 'module' or legacy 'commentary'
    return (
      <div className="flex-1 overflow-hidden">
        <PassageQuickView
          initialModule={resource.moduleCode}
          initialReference={activeLesson?.reference}
          resetKey={activeLesson?.id}
          moduleType={resource.moduleType || 'COMMENTARY'}
          onAskAiCompanionAbout={onAskAiCompanionAbout}
          onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
        />
      </div>
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 sm:items-center sm:justify-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        className={`flex h-full w-full flex-col overflow-hidden shadow-2xl sm:h-[88vh] sm:max-w-2xl sm:rounded-xl sm:border ${usesPagePalette ? 'bg-page sm:border-pageBorder' : 'bg-panel sm:border-rule'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex shrink-0 items-center justify-between border-b px-5 py-3 ${usesPagePalette ? 'border-pageBorder bg-page' : 'border-rule bg-panel'}`}>
          <span className={`font-display text-base ${usesPagePalette ? 'text-pageText' : 'text-parchment'}`}>{resource.label}</span>
          <button onClick={onClose} className={`text-xs ${usesPagePalette ? 'text-pageMuted hover:text-pageText' : 'text-muted hover:text-parchment'}`}>close</button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>,
    document.body
  );
}

function AddResourceModal({ studyId, onClose, onAdded, isSuggestion = false }) {
  // 'module' | 'link' | 'note' | 'library-note' | 'document'
  const [source, setSource] = useState('module');
  const [label, setLabel] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [selectedModuleType, setSelectedModuleType] = useState('COMMENTARY');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [allModules, setAllModules] = useState({ BIBLE: [], COMMENTARY: [], DICT: [] });
  const [libraryNotes, setLibraryNotes] = useState(null);
  const [libraryDocs, setLibraryDocs] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listInstalledModules('BIBLE'),
      api.listInstalledModules('COMMENTARY'),
      api.listInstalledModules('DICT'),
    ]).then(([bibles, comms, dicts]) => {
      setAllModules({ BIBLE: bibles, COMMENTARY: comms, DICT: dicts });
      const first = comms[0] || bibles[0] || dicts[0];
      if (first) {
        setModuleCode(first.name);
        setSelectedModuleType(comms[0] ? 'COMMENTARY' : bibles[0] ? 'BIBLE' : 'DICT');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (source === 'library-note' && libraryNotes === null) {
      api.listNotes({}).then(setLibraryNotes).catch(() => setLibraryNotes([]));
    }
    if (source === 'document' && libraryDocs === null) {
      api.listDocuments().then(setLibraryDocs).catch(() => setLibraryDocs([]));
    }
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectModule(mod, mtype) {
    setModuleCode(mod.name);
    setSelectedModuleType(mtype);
    setLabel((prev) => prev || mod.description || mod.name);
  }

  function selectLibraryNote(note) {
    setBody(note.body);
    setLabel((prev) => prev || note.title || note.reference || 'Note');
  }

  function selectDocument(doc) {
    setUrl(api.documentFileUrl(doc.id));
    setLabel((prev) => prev || doc.title);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let payload;
      if (source === 'module') {
        payload = { type: 'module', label, moduleCode, moduleType: selectedModuleType };
      } else if (source === 'link' || source === 'document') {
        payload = { type: 'link', label, url };
      } else {
        payload = { type: 'note', label, body };
      }
      if (isSuggestion) {
        await api.suggestStudyResource(studyId, payload);
      } else {
        await api.addStudyResource(studyId, payload);
      }
      onAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const SOURCE_BTNS = [
    { key: 'module', label: 'Module' },
    { key: 'link', label: 'Link' },
    { key: 'note', label: 'Note' },
    { key: 'library-note', label: 'Library Note' },
    { key: 'document', label: 'Document' },
  ];

  const isDisabled = submitting || !label.trim() ||
    (source === 'module' && !moduleCode) ||
    ((source === 'link' || source === 'document') && !url.trim()) ||
    ((source === 'note' || source === 'library-note') && !body.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Add a Resource</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_BTNS.map(({ key, label: btnLabel }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSource(key)}
                  className={`rounded border px-3 py-1.5 text-xs transition-colors ${source === key ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted hover:border-parchment/30 hover:text-parchment'}`}
                >
                  {btnLabel}
                </button>
              ))}
            </div>
          </div>

          {source === 'module' && (
            <div className="max-h-52 space-y-3 overflow-y-auto">
              {(['BIBLE', 'COMMENTARY', 'DICT']).map((mtype) =>
                allModules[mtype]?.length > 0 && (
                  <div key={mtype}>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-muted/60">
                      {mtype === 'BIBLE' ? 'Bibles' : mtype === 'COMMENTARY' ? 'Commentaries' : 'Dictionaries & Lexicons'}
                    </p>
                    <div className="space-y-1">
                      {allModules[mtype].map((mod) => (
                        <button
                          key={mod.name}
                          type="button"
                          onClick={() => selectModule(mod, mtype)}
                          className={`w-full rounded border px-3 py-2 text-left text-xs transition-colors ${moduleCode === mod.name ? 'border-brass bg-brass/10 text-brass' : 'border-rule text-muted hover:border-parchment/30 hover:text-parchment'}`}
                        >
                          {mod.description || mod.name}
                          <span className="ml-1 opacity-50">({mod.name})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
              {Object.values(allModules).every((l) => l.length === 0) && (
                <p className="text-xs text-muted">No modules installed yet.</p>
              )}
            </div>
          )}

          {source === 'link' && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">URL</p>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://bibleproject.com/…"
                className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
              />
            </div>
          )}

          {source === 'note' && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Note</p>
              <RichEditor value={body} onChange={setBody} height={180} />
            </div>
          )}

          {source === 'library-note' && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Pick from your library</p>
              {libraryNotes === null ? (
                <p className="text-xs text-muted">Loading…</p>
              ) : libraryNotes.length === 0 ? (
                <p className="text-xs text-muted">No notes in your library yet.</p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {libraryNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => selectLibraryNote(n)}
                      className={`w-full rounded border px-3 py-2 text-left transition-colors ${body === n.body ? 'border-brass bg-brass/10 text-brass' : 'border-rule text-muted hover:border-parchment/30 hover:text-parchment'}`}
                    >
                      <p className="truncate text-xs font-medium">{n.title || n.reference || 'Untitled'}</p>
                      {n.reference && <p className="text-[10px] opacity-60">{n.reference}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {source === 'document' && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Pick from your library</p>
              {libraryDocs === null ? (
                <p className="text-xs text-muted">Loading…</p>
              ) : libraryDocs.length === 0 ? (
                <p className="text-xs text-muted">No documents in your library yet.</p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {libraryDocs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => selectDocument(d)}
                      className={`w-full rounded border px-3 py-2 text-left transition-colors ${url === api.documentFileUrl(d.id) ? 'border-brass bg-brass/10 text-brass' : 'border-rule text-muted hover:border-parchment/30 hover:text-parchment'}`}
                    >
                      <p className="truncate text-xs font-medium">{d.title}</p>
                      {d.author && <p className="text-[10px] opacity-60">{d.author}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted">Label</p>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                source === 'module' ? "Clarke's Commentary" :
                source === 'link' ? 'Bible Project: John' :
                source === 'document' ? 'Document title' :
                'On the Vine metaphor'
              }
              autoFocus
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {submitting ? 'adding…' : 'add resource'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditStudyModal({ study, bannerUrl, uploadingBanner, generatingBanner, bannerInputRef, onBannerChange, onGenerateBanner, onDelete, onClose, onSaved }) {
  const [title, setTitle] = useState(study.title);
  const [description, setDescription] = useState(study.description || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateStudy(study.id, { title, description });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 sm:items-center sm:justify-center sm:px-4">
      <div className="flex h-full w-full flex-col overflow-hidden bg-panel text-parchment shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg sm:border sm:border-rule">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="font-display text-lg">Edit Study</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Banner actions */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Banner Image</p>
            <div className="relative mb-3 h-24 overflow-hidden rounded-lg border border-rule bg-ink">
              {bannerUrl
                ? <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
                : <div className="h-full w-full bg-gradient-to-br from-brass/10 to-transparent" />
              }
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={onBannerChange} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner || generatingBanner}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-rule px-3 py-2 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-50"
              >
                <Camera size={13} />
                {uploadingBanner ? 'uploading…' : 'Upload image'}
              </button>
              <button
                type="button"
                onClick={onGenerateBanner}
                disabled={generatingBanner || uploadingBanner}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-rule px-3 py-2 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-50"
              >
                <Sparkles size={13} />
                {generatingBanner ? 'generating…' : 'AI banner'}
              </button>
            </div>
          </div>

          {/* Study fields */}
          <form id="edit-study-form" onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Description</label>
              <RichEditor value={description} onChange={setDescription} height={160} />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>

          {/* Danger zone */}
          <div className="mt-6 border-t border-rule pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Danger Zone</p>
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">Delete this study? This can't be undone.</span>
                <button onClick={onDelete} className="rounded border border-red-500 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10">
                  confirm delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-parchment">
                  cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded border border-red-900/50 px-3 py-1.5 text-xs text-red-400/80 hover:border-red-400 hover:text-red-400"
              >
                Delete study…
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-rule px-5 py-3">
          <button form="edit-study-form" type="submit" disabled={saving} className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50">
            {saving ? 'saving…' : 'save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { GenerateStudyModal, ContentTab, StudySidebar, ProgressRing, LessonContent, AddResourceModal };

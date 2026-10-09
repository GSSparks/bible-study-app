import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Video, Sparkles, FileText, BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import { getAvatarColor } from '../utils/avatar.js';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';
import AvatarRoll from './AvatarRoll.jsx';
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

const TABS = [
  { key: 'content', label: 'Content' },
  { key: 'discussion', label: 'Discussion' },
  { key: 'members', label: 'Members' },
];

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

export default function StudyDetail({ studyId, currentUserId, onBack, onOpenInPassages, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel, backLabel = 'Studies' }) {
  const [study, setStudy] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [participants, setParticipants] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
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
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditStudyModal, setShowEditStudyModal] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [generatingBanner, setGeneratingBanner] = useState(false);
  const bannerInputRef = useRef(null);

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
  useEffect(() => { if (study) setBannerUrl(study.bannerUrl || null); }, [study?.id]);

  async function handleBannerChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const { url } = await api.uploadStudyBanner(studyId, file);
      setBannerUrl(url);
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  }

  async function handleGenerateBanner() {
    setGeneratingBanner(true);
    try {
      const { url } = await api.generateStudyBanner(studyId);
      setBannerUrl(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingBanner(false);
    }
  }

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

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error && !study) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!study) return null;

  const isOwner = study.myRole === 'owner';
  const isParticipant = study.isParticipant;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || null;
  const activeLessonIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const nextLesson = activeLessonIndex >= 0 ? lessons[activeLessonIndex + 1] : lessons[0];
  const isNextComplete = nextLesson && progress?.completedLessonIds?.includes(nextLesson.id);
  const bannerColor = getAvatarColor(study.title);

  const sidebarContent = (
    <StudySidebar
      study={study}
      lessons={lessons}
      progress={progress}
      resources={resources}
      activeLesson={activeLesson}
      nextLesson={!isNextComplete ? nextLesson : null}
      onCompleteNext={async () => {
        if (!nextLesson) return;
        await api.markStudyLessonComplete(nextLesson.id);
        const p = await api.getStudyProgress(studyId);
        setProgress(p);
      }}
      onJumpToLesson={(id) => {
        jumpToLesson(id);
        changeTab('content');
      }}
      ProgressRing={ProgressRing}
      isOwner={isOwner}
      onResourcesChanged={refresh}
      onAskAiCompanionAbout={onAskAiCompanionAbout}
      onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
      onOpenBiblePanel={onOpenBiblePanel}
    />
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto lg:overflow-hidden">
      {/* Hero banner */}
      <div className="relative h-48 shrink-0 bg-ink">
        <div className="absolute inset-0 overflow-hidden">
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 25% 65%, ${bannerColor}55 0%, transparent 65%)` }} />
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 75% 30%, ${bannerColor}22 0%, transparent 55%)` }} />
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 55% 10%, ${bannerColor}18 0%, transparent 50%)` }} />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
        </div>

        <button onClick={onBack} className="absolute left-6 top-4 z-10 text-xs text-parchment/60 hover:text-parchment">
          ‹ {backLabel}
        </button>

        <div className="absolute right-6 top-3 z-10 flex flex-wrap gap-2">
          {!isParticipant && study.scriptoriumId && (
            <button onClick={handleJoin} className="rounded-md border border-parchment/20 bg-ink/50 px-3 py-1.5 text-xs text-parchment/80 backdrop-blur-sm hover:border-brass hover:text-parchment">
              join
            </button>
          )}
          {isOwner && (
            <button onClick={() => setShowEditStudyModal(true)} className="rounded-md border border-parchment/20 bg-ink/50 px-3 py-1.5 text-xs text-parchment/80 backdrop-blur-sm hover:border-brass hover:text-parchment">
              edit
            </button>
          )}
          {isParticipant && !isOwner && (
            <button onClick={handleLeave} className="rounded-md border border-parchment/20 bg-ink/50 px-3 py-1.5 text-xs text-parchment/60 backdrop-blur-sm hover:border-red-400 hover:text-red-400">
              leave
            </button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 z-10 px-6 pb-4">
          <h2 className="font-display text-3xl text-parchment">{study.title}</h2>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-parchment/40">
            {study.scriptoriumId ? 'group study' : 'solo study'}
          </p>
        </div>

        {participants.length > 0 && (
          <div className="absolute bottom-4 right-6 z-10">
            <AvatarRoll
              members={participants}
              total={participants.length}
              onMemberClick={null}
              onOverflowClick={() => changeTab('members')}
            />
          </div>
        )}
      </div>
      <div className="lg:flex lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="min-w-0 px-4 lg:flex lg:flex-1 lg:flex-col lg:overflow-hidden lg:px-6">
          {study.description && <p className="mb-3 mt-4 max-w-2xl text-sm text-muted">{study.description}</p>}
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="flex shrink-0 gap-6 border-b border-rule pt-4 text-sm">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => changeTab(t.key)}
                className={`pb-2 ${tab === t.key ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
              >
                {t.key === 'members' ? `Members (${participants.length})` : t.label}
              </button>
            ))}
            <button
              onClick={() => changeTab('resources')}
              className={`pb-2 ${tab === 'resources' ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              Resources
            </button>
            {isOwner && (
              <button
                onClick={() => changeTab('reflections')}
                className={`pb-2 ${tab === 'reflections' ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
              >
                Reflections
              </button>
            )}
          </div>
          <div className="pt-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
            {tab === 'content' && (
              <ContentTab
                study={study}
                lessons={lessons}
                activeLesson={activeLesson}
                onSelectLesson={jumpToLesson}
                isOwner={isOwner}
                onAddLesson={() => setShowAddLessonModal(true)}
                onGenerate={() => setShowGenerateModal(true)}
                onLessonsChanged={refresh}
                onOpenInPassages={onOpenInPassages}
                onAskAiCompanionAbout={onAskAiCompanionAbout}
                onOpenBiblePanel={onOpenBiblePanel}
              />
            )}
            {tab === 'discussion' && (
              <div className="lg:h-full lg:overflow-y-auto">
                <DiscussionTab lesson={activeLesson} isParticipant={study.isParticipant} currentUserId={currentUserId} />
              </div>
            )}
            {tab === 'members' && (
              <div className="lg:h-full lg:overflow-y-auto">
                <MembersTab studyId={studyId} isOwner={isOwner} />
              </div>
            )}
            {tab === 'reflections' && isOwner && (
              <div className="lg:h-full lg:overflow-y-auto">
                <ReflectionsTab studyId={studyId} />
              </div>
            )}
            {tab === 'resources' && (
              <div className="lg:h-full lg:overflow-y-auto">
                <ResourcesTabContent
                  study={study}
                  resources={resources}
                  activeLesson={activeLesson}
                  isOwner={isOwner}
                  onResourcesChanged={refresh}
                  onAskAiCompanionAbout={onAskAiCompanionAbout}
                  onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
                  onOpenBiblePanel={onOpenBiblePanel}
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-rule p-4 lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-t-0">{sidebarContent}</div>
      </div>

      {showAddLessonModal && (
        <AddLessonModal
          studyId={studyId}
          nextOrder={lessons.length + 1}
          onClose={() => setShowAddLessonModal(false)}
          onCreated={() => {
            setShowAddLessonModal(false);
            refresh();
          }}
        />
      )}

      {showGenerateModal && (
        <GenerateStudyModal
          studyId={studyId}
          nextOrder={lessons.length + 1}
          onClose={() => setShowGenerateModal(false)}
          onCreated={() => {
            setShowGenerateModal(false);
            refresh();
          }}
        />
      )}

      {showEditStudyModal && (
        <EditStudyModal
          study={study}
          bannerUrl={bannerUrl}
          uploadingBanner={uploadingBanner}
          generatingBanner={generatingBanner}
          bannerInputRef={bannerInputRef}
          onBannerChange={handleBannerChange}
          onGenerateBanner={handleGenerateBanner}
          onDelete={handleDelete}
          onClose={() => setShowEditStudyModal(false)}
          onSaved={() => {
            setShowEditStudyModal(false);
            refresh();
          }}
        />
      )}
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

function ContentTab({ study, lessons, activeLesson, onSelectLesson, isOwner, onAddLesson, onGenerate, onLessonsChanged, onOpenInPassages, onAskAiCompanionAbout, onOpenBiblePanel }) {
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
          />
        )}
      </div>

    </div>
  );
}

function DiscussionTab({ lesson, isParticipant, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  function refresh() {
    if (!lesson) return;
    setLoading(true);
    api
      .listStudyComments(lesson.id)
      .then(setComments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [lesson?.id]);

  async function handlePost(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await api.createStudyComment(lesson.id, commentText);
      setCommentText('');
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleLikeToggle(comment) {
    setError(null);
    try {
      if (comment.likedByMe) {
        await api.unlikeStudyComment(comment.id);
      } else {
        await api.likeStudyComment(comment.id);
      }
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(commentId) {
    setError(null);
    try {
      await api.deleteStudyComment(commentId);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!lesson) {
    return <p className="text-sm text-muted">Select a lesson to see its discussion.</p>;
  }

  return (
    <div>
      {isParticipant ? (
        <form onSubmit={handlePost} className="mb-4 rounded-md border border-rule bg-panel p-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Add to the discussion…"
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={posting || !commentText.trim()}
              className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
            >
              {posting ? 'posting…' : 'post'}
            </button>
          </div>
        </form>
      ) : (
        // Matches the backend's own rule: viewing discussion only
        // requires being able to view the lesson, but posting/liking
        // requires actually joining the study — this line makes that
        // distinction visible rather than just silently disabling
        // controls with no explanation.
        <p className="mb-4 text-xs text-muted">Join this study to take part in the discussion.</p>
      )}

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {loading && <p className="text-sm text-muted">Loading…</p>}

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-md border border-rule bg-panel p-3">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar username={c.author.username} size={24} />
                <span className="text-sm text-parchment">{c.author.username}</span>
              </div>
              {c.author.id === currentUserId && (
                <button onClick={() => handleDelete(c.id)} className="text-xs text-muted hover:text-red-400">
                  delete
                </button>
              )}
            </div>
            <p className="mb-2 whitespace-pre-wrap text-sm text-parchment/90">{c.body}</p>
            <button
              onClick={() => handleLikeToggle(c)}
              disabled={!isParticipant}
              className={`text-xs ${c.likedByMe ? 'text-brass' : 'text-muted'} hover:text-brass disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {c.likedByMe ? '♥' : '♡'} {c.likeCount > 0 ? c.likeCount : ''}
            </button>
          </div>
        ))}
        {!loading && comments.length === 0 && <p className="text-sm text-muted">No comments yet — be the first to share a thought.</p>}
      </div>
    </div>
  );
}

function LessonContent({ lesson, isOwner, onLessonsChanged, onOpenInPassages, onAskAiCompanionAbout, noteTextareaRef, onOpenBiblePanel }) {
  const [passage, setPassage] = useState(null);
  const [passageError, setPassageError] = useState(null);
  const [note, setNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [showEditLessonModal, setShowEditLessonModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [pendingBody, setPendingBody] = useState('');
  const [savingBody, setSavingBody] = useState(false);
  const [bodyError, setBodyError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoInputRef = useRef(null);
  const [reflectionText, setReflectionText] = useState(lesson.myReflection?.body || '');
  const [reflectionSubmitted, setReflectionSubmitted] = useState(Boolean(lesson.myReflection));
  const [editingReflection, setEditingReflection] = useState(false);
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState(null);

  useEffect(() => {
    setPassage(null);
    setPassageError(null);
    setEditingBody(false);
    setVideoUrl(lesson.videoUrl || null);
    setReflectionText(lesson.myReflection?.body || '');
    setReflectionSubmitted(Boolean(lesson.myReflection));
    setEditingReflection(false);
    setReflectionError(null);
    if (lesson.module && lesson.reference) {
      api
        .getPassage(lesson.module, lesson.reference)
        .then((res) => setPassage(res.verses || []))
        .catch((e) => setPassageError(e.message));
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
      await api.saveStudyLessonReflection(lesson.id, reflectionText);
      setReflectionSubmitted(true);
      setEditingReflection(false);
      if (andComplete) {
        await api.markStudyLessonComplete(lesson.id);
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

  async function handleDeleteLesson() {
    if (!confirm(`Delete "${lesson.title}"? This also removes its discussion and progress records — this can't be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteStudyLesson(lesson.id);
      onLessonsChanged();
    } catch (e) {
      alert(e.message);
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">

      {/* Passage */}
      <div className="rounded-xl border border-pageBorder bg-page p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg leading-snug text-pageText">
            {lesson.reference || 'No passage set'}
            {lesson.module && <span className="ml-2 text-sm font-normal text-pageMuted">{lesson.module}</span>}
          </h3>
          <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs">
            {lesson.reference && lesson.module && (
              <>
                <button
                  onClick={() => onOpenInPassages?.(lesson.module, lesson.reference)}
                  className="text-pageMuted hover:text-pageAccent"
                >
                  open in Passages →
                </button>
                <button
                  onClick={() => onAskAiCompanionAbout?.(lesson.module, lesson.reference)}
                  className="text-pageMuted hover:text-pageAccent"
                >
                  ask AI →
                </button>
              </>
            )}
            {isOwner && (
              <div className="flex gap-2 border-l border-pageBorder pl-3">
                <button onClick={() => setShowEditLessonModal(true)} className="text-pageMuted hover:text-pageText">
                  edit lesson
                </button>
                <button onClick={handleDeleteLesson} disabled={deleting} className="text-pageMuted hover:text-red-500 disabled:opacity-50">
                  {deleting ? 'deleting…' : 'delete'}
                </button>
              </div>
            )}
          </div>
        </div>
        {passageError && <p className="text-sm text-red-500">{passageError}</p>}
        {!lesson.reference && <p className="text-sm italic text-pageMuted">No passage set for this lesson yet.</p>}
        {lesson.reference && !passage && !passageError && <p className="text-sm text-pageMuted">Loading…</p>}
        {passage && (
          <p className="font-display leading-loose text-pageText">
            {passage.map((v) => (
              <span key={v.verseNr}>
                <sup className="mr-0.5 text-xs text-pageMuted">{v.verseNr}</sup>
                {stripHtml(v.content)}{' '}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* Lesson video — between passage and study notes */}
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
              className="flex w-full flex-col items-center justify-center gap-2 py-8 text-muted hover:text-parchment disabled:opacity-50"
            >
              <Video size={24} strokeWidth={1.5} />
              <span className="text-sm">{uploadingVideo ? 'uploading…' : 'add a lesson video'}</span>
              <span className="text-xs text-muted/60">mp4, webm, or mov · up to 500 MB</span>
            </button>
          )}
        </div>
      )}

      {/* Study notes — click-to-edit in place for the owner */}
      {(lesson.body || isOwner) && (
        <div className="rounded-xl border border-pageBorder bg-page p-5">
          <div className="mb-3 flex items-center justify-between">
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
              <RichEditor value={pendingBody} onChange={setPendingBody} height={260} colorMode="light" />
              {bodyError && <p className="mt-1 text-xs text-red-500">{bodyError}</p>}
              <div className="mt-2 flex justify-end gap-2">
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
                <RichContent colorMode="light" onVerseClick={onOpenBiblePanel}>{lesson.body}</RichContent>
              ) : (
                <p className="text-sm italic text-pageMuted">Double-click to add study notes for this lesson…</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Personal note */}
      <div className="rounded-xl border border-pageBorder bg-page p-5">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-pageMuted">Your Personal Note</h4>
        {noteLoading ? (
          <p className="text-sm text-pageMuted">Loading…</p>
        ) : (
          <>
            <div ref={noteTextareaRef}>
              <RichEditor value={noteText} onChange={setNoteText} height={220} colorMode="light" />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50"
              >
                {savingNote ? 'saving…' : 'save note'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Reflection prompt */}
      {lesson.reflectionPrompt && (
        <div className="rounded-xl border border-pageBorder bg-page p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-pageMuted">Reflection</h4>
          <p className="mb-3 font-display text-base text-pageText">{lesson.reflectionPrompt}</p>
          {reflectionSubmitted && !editingReflection ? (
            <div>
              <p className="mb-2 whitespace-pre-wrap text-sm text-pageText/90">{reflectionText}</p>
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
                rows={4}
                placeholder="Write your response here…"
                className="w-full rounded border border-pageBorder bg-reading px-3 py-2 text-sm text-pageText placeholder:text-pageMuted focus:border-pageAccent focus:outline-none"
              />
              {reflectionError && <p className="mt-1 text-xs text-red-500">{reflectionError}</p>}
              <div className="mt-2 flex flex-wrap justify-end gap-2">
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
            </>
          )}
        </div>
      )}

      {showEditLessonModal && (
        <EditLessonModal
          lesson={lesson}
          onClose={() => setShowEditLessonModal(false)}
          onSaved={() => {
            setShowEditLessonModal(false);
            onLessonsChanged();
          }}
        />
      )}
    </div>
  );
}

function MembersTab({ studyId, isOwner }) {
  // Mirrors ScriptoriumDetail's members tab pattern — parallel
  // structure (StudyParticipant vs. ScriptoriumMembership), same
  // owner/participant distinction.
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .listStudyParticipants(studyId)
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [studyId]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="overflow-hidden rounded-md border border-rule">
      {members.map((m) => (
        <div key={m.participantId} className="flex items-center justify-between border-b border-rule px-3 py-2 text-sm last:border-0">
          <div className="flex items-center gap-2">
            <Avatar username={m.username} size={24} />
            <span className="text-parchment">{m.username}</span>
            {m.role === 'owner' && <span className="text-xs text-brass">owner</span>}
          </div>
        </div>
      ))}
      {members.length === 0 && <p className="p-3 text-sm text-muted">No participants yet.</p>}
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

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (lessons.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No lessons with reflection prompts yet.</p>;
  }

  return (
    <div className="space-y-3 pb-6">
      {lessons.map((lesson) => {
        const isOpen = !!expanded[lesson.id];
        const count = lesson.reflections.length;
        return (
          <div key={lesson.id} className="rounded-xl border border-rule bg-panel">
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [lesson.id]: !prev[lesson.id] }))}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-base text-parchment">
                  {lesson.order}. {lesson.title || 'Untitled lesson'}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {count === 0 ? 'No responses yet' : `${count} response${count !== 1 ? 's' : ''}`}
                </p>
              </div>
              <span className="ml-4 shrink-0 text-muted">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="border-t border-rule px-4 pb-4 pt-3">
                <p className="mb-3 rounded-lg bg-ink/60 px-3 py-2 text-sm italic text-parchment/70">
                  "{lesson.reflectionPrompt}"
                </p>
                {count === 0 ? (
                  <p className="text-sm text-muted">No one has responded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {lesson.reflections.map((r) => (
                      <div key={r.id} className="rounded-lg border border-rule/50 bg-ink/40 px-4 py-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Avatar username={r.user.username} size={20} />
                          <span className="text-xs font-medium text-parchment">
                            {r.user.displayName || r.user.username}
                          </span>
                          <span className="text-xs text-muted">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-parchment/80">{r.body}</p>
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
    <div className="group relative overflow-hidden rounded-xl border border-rule bg-panel transition-colors hover:border-brass/50">
      <div className="flex h-20 items-center justify-center border-b border-rule/50 bg-ink/50">
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
        <p className="truncate font-display text-sm text-parchment">{resource.label}</p>
        {hostname && <p className="mt-0.5 font-mono text-[10px] text-muted">{hostname}</p>}
        {isNote && resource.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted/60">
            {resource.body.replace(/^#{1,6}\s+.+\n?/, '').replace(/[#*_`[\]]/g, '').slice(0, 80)}
          </p>
        )}
      </div>
      <button onClick={onClick} className="absolute inset-0" aria-label={resource.label} />
      {isOwner && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute right-1.5 top-1.5 z-10 rounded bg-ink/80 p-1 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

function ResourcesTabContent({ study, resources, activeLesson, isOwner, onResourcesChanged, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel }) {
  const [openResource, setOpenResource] = useState(null);
  const [openDocumentId, setOpenDocumentId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

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

  return (
    <div className="pb-6">
      {isOwner && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setShowAddModal(true)} className="text-xs text-brass hover:underline">+ add resource</button>
        </div>
      )}
      {resources.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted">No resources added yet.</p>
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
      {openResource && (
        <ResourceModal
          resource={openResource}
          activeLesson={activeLesson}
          onClose={() => setOpenResource(null)}
          onAskAiCompanionAbout={onAskAiCompanionAbout}
          onAskAiCompanionPhraseStudy={onAskAiCompanionPhraseStudy}
          onOpenBiblePanel={onOpenBiblePanel}
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
                    className="mb-2 w-full rounded border border-rule bg-panel px-2 py-1 text-sm text-parchment focus:border-brass"
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
                    className="w-full rounded border border-rule bg-panel px-2 py-1 text-xs text-parchment focus:border-brass"
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

function ResourceModal({ resource, activeLesson, onClose, onAskAiCompanionAbout, onAskAiCompanionPhraseStudy, onOpenBiblePanel }) {
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
          <RichContent colorMode="light" onVerseClick={(ref) => { onOpenBiblePanel?.(ref); onClose(); }}>
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

function AddResourceModal({ studyId, onClose, onAdded }) {
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
      await api.addStudyResource(studyId, payload);
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

export { DiscussionTab, GenerateStudyModal, ContentTab, StudySidebar, ProgressRing, LessonContent, AddResourceModal };
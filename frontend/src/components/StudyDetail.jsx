import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';
import ResourceFooter from './ResourceFooter.jsx';

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

export default function StudyDetail({ studyId, currentUserId, onBack }) {
  const [study, setStudy] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeLessonId, setActiveLessonId] = useState(null);
  const [tab, setTab] = useState('content');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditStudyModal, setShowEditStudyModal] = useState(false);

  function refresh() {
    setLoading(true);
    setError(null);
    Promise.all([api.getStudy(studyId), api.listStudyLessons(studyId), api.listStudyResources(studyId)])
      .then(([s, l, r]) => {
        setStudy(s);
        setLessons(l);
        setResources(r);
        setActiveLessonId((prev) => (prev && l.some((lesson) => lesson.id === prev) ? prev : l[0]?.id || null));
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

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error && !study) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!study) return null;

  const isOwner = study.myRole === 'owner';
  const isParticipant = study.isParticipant;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || null;
  const activeLessonIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const nextLesson = activeLessonIndex >= 0 ? lessons[activeLessonIndex + 1] : lessons[0];
  const isNextComplete = nextLesson && progress?.completedLessonIds?.includes(nextLesson.id);

  const sidebarContent = (
    <StudySidebar
      study={study}
      lessons={lessons}
      progress={progress}
      resources={resources}
      nextLesson={!isNextComplete ? nextLesson : null}
      onCompleteNext={async () => {
        if (!nextLesson) return;
        await api.markStudyLessonComplete(nextLesson.id);
        const p = await api.getStudyProgress(studyId);
        setProgress(p);
      }}
      onJumpToLesson={(id) => {
        setActiveLessonId(id);
        setTab('content');
        setShowMobileSidebar(false);
      }}
      ProgressRing={ProgressRing}
      isOwner={isOwner}
      onResourcesChanged={refresh}
    />
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-rule p-4 lg:p-6">
        <button onClick={onBack} className="mb-2 text-xs text-muted hover:text-parchment">
          ‹ Studies {study.title ? `› ${study.title}` : ''}
        </button>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl text-parchment lg:text-2xl">{study.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            {!isParticipant && study.scriptoriumId && (
              <button onClick={handleJoin} className="rounded bg-verdigris/80 px-3 py-1.5 text-xs text-parchment hover:bg-verdigris">
                join
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setShowEditStudyModal(true)}
                className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass hover:text-parchment"
              >
                edit
              </button>
            )}
            {isParticipant && !isOwner && (
              <button onClick={handleLeave} className="rounded border border-rule px-3 py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-400">
                leave
              </button>
            )}
            {isOwner && (
              <button onClick={handleDelete} className="rounded border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-400">
                delete
              </button>
            )}
            {/* Mobile-only: opens the same sidebar content as a drawer */}
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="rounded border border-rule px-2 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment lg:hidden"
              aria-label="Show progress and resources"
            >
              ☰
            </button>
          </div>
        </div>
        {study.description && <p className="mb-2 max-w-2xl text-sm text-muted">{study.description}</p>}
        <p className="mb-3 text-xs uppercase tracking-wide text-muted">
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} · {study.scriptoriumId ? 'group study' : 'solo study'}
        </p>

        <div className="flex gap-4 border-b border-rule text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2 ${tab === t.key ? 'border-b-2 border-brass text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-6 pt-3 text-sm text-red-400">{error}</p>}

      <div className="min-h-0 flex-1 overflow-hidden lg:flex">
        <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {tab === 'content' && (
            <ContentTab
              study={study}
              lessons={lessons}
              activeLesson={activeLesson}
              onSelectLesson={setActiveLessonId}
              isOwner={isOwner}
              onAddLesson={() => setShowAddLessonModal(true)}
              onGenerate={() => setShowGenerateModal(true)}
              onLessonsChanged={refresh}
              resources={resources}
            />
          )}
          {tab === 'discussion' && (
            <DiscussionTab lesson={activeLesson} isParticipant={study.isParticipant} currentUserId={currentUserId} />
          )}
          {tab === 'members' && <MembersTab studyId={studyId} isOwner={isOwner} />}
        </div>

        {/* Desktop: persistent right sidebar */}
        <div className="hidden w-72 shrink-0 overflow-y-auto border-l border-rule p-4 lg:block">{sidebarContent}</div>
      </div>

      {/* Mobile: drawer overlay */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileSidebar(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto border-l border-rule bg-panel p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-parchment">Study Info</h3>
              <button onClick={() => setShowMobileSidebar(false)} className="text-xs text-muted hover:text-parchment">
                close
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

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

function StudySidebar({ study, lessons, progress, resources, nextLesson, onCompleteNext, onJumpToLesson, ProgressRing, isOwner, onResourcesChanged }) {
  const percent = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);

  async function handleRemoveResource(id) {
    try {
      await api.removeStudyResource(id);
      onResourcesChanged();
    } catch (e) {
      // Sidebar has no dedicated error slot — this is a rare,
      // low-stakes action, so a plain alert is acceptable here rather
      // than adding a whole error-state plumbing just for this.
      alert(e.message);
    }
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
            <button onClick={onCompleteNext} className="w-full rounded border border-rule py-1.5 text-xs text-muted hover:border-brass hover:text-parchment">
              Mark as complete
            </button>
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
            <div key={r.id} className="flex items-center justify-between text-sm text-muted">
              <span>{r.label}</span>
              {isOwner && (
                <button onClick={() => handleRemoveResource(r.id)} className="text-xs text-muted hover:text-red-400">
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
    </div>
  );
}

function ContentTab({ study, lessons, activeLesson, onSelectLesson, isOwner, onAddLesson, onGenerate, onLessonsChanged, resources }) {
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

  // Footer tabs: the leader's curated resources, plus an always-present
  // "Text" tab (a different-translation quick-glance) that isn't a
  // stored resource at all — it's built into the footer itself.
  const footerTabs = activeLesson
    ? [
        { id: 'text', label: 'Text', content: <TextTabContent lesson={activeLesson} /> },
        ...resources.map((r) => ({
          id: r.id,
          label: r.label,
          content: <ResourceTabContent lesson={activeLesson} resource={r} />,
        })),
      ]
    : [];

  return (
    <div className="flex h-full flex-col">
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeLesson && <LessonContent lesson={activeLesson} currentUserId={study.creatorId} isOwner={isOwner} onLessonsChanged={onLessonsChanged} />}
      </div>

      <ResourceFooter tabs={footerTabs} />
    </div>
  );
}

function TextTabContent({ lesson }) {
  const [modules, setModules] = useState([]);
  const [module, setModule] = useState(''); // deliberately empty until the modules list resolves — see below
  const [passage, setPassage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listInstalledModules('BIBLE')
      .then((list) => {
        setModules(list);
        // Default to a DIFFERENT translation than the lesson's own —
        // that's the whole point of this tab (a quick glance at
        // another rendering), not just repeating what's already shown
        // in the main content area above. Starting `module` empty
        // (rather than lesson.module) matters here: if it started as
        // the lesson's own translation, the passage-fetch effect below
        // would fire with that value immediately, and the user would
        // briefly see the SAME translation flash before this resolves
        // and switches it — a real, visible glitch, not just a timing
        // technicality.
        const other = list.find((m) => m.name !== lesson.module);
        setModule(other?.name || lesson.module || list[0]?.name || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!module || !lesson.reference) return;
    setPassage(null);
    setError(null);
    api
      .getPassage(module, lesson.reference)
      .then((res) => setPassage(res.verses || []))
      .catch((e) => setError(e.message));
  }, [module, lesson.reference]);

  if (!lesson.reference) return <p className="text-sm text-muted">This lesson has no reference set yet.</p>;
  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <select
        value={module}
        onChange={(e) => setModule(e.target.value)}
        className="mb-2 rounded border border-rule bg-ink px-2 py-1 text-xs text-parchment focus:border-brass"
      >
        {modules.map((m) => (
          <option key={m.name} value={m.name}>
            {m.description || m.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!passage && !error && <p className="text-sm text-muted">Loading passage…</p>}
      {passage && (
        <p className="text-sm text-parchment/90">
          {passage.map((v) => (
            <span key={v.verseNr}>
              <sup className="mr-1 text-xs text-muted">{v.verseNr}</sup>
              {stripHtml(v.content)}{' '}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function ResourceTabContent({ lesson, resource }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setContent(null);
    setError(null);
    api
      .getStudyResourceContent(lesson.id, resource.id)
      .then(setContent)
      .catch((e) => setError(e.message));
  }, [lesson.id, resource.id]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!content) return <p className="text-sm text-muted">Loading…</p>;

  if (content.type === 'link') {
    return (
      <a href={content.url} target="_blank" rel="noreferrer" className="text-sm text-brass hover:underline">
        Open {content.label} ↗
      </a>
    );
  }

  // Commentary type: either real text, or a graceful note (no
  // reference set yet, or this module has no entry for it) — the
  // backend already distinguishes these from an actual error, so this
  // renders as ordinary, expected content either way, not a failure.
  if (content.text) {
    return <p className="whitespace-pre-wrap text-sm text-parchment/90">{content.text}</p>;
  }
  return <p className="text-sm text-muted">{content.note}</p>;
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

function LessonContent({ lesson, isOwner, onLessonsChanged }) {
  const [passage, setPassage] = useState(null);
  const [passageError, setPassageError] = useState(null);
  const [note, setNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [showEditLessonModal, setShowEditLessonModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPassage(null);
    setPassageError(null);
    if (lesson.module && lesson.reference) {
      // Real response shape: { module, reference, verses: [{ verseNr,
      // content, titles, ... }] } — content is processed HTML (Strong's
      // links, cross-reference markup), stripped to plain text below
      // since this is a quick-reference display, not the full
      // interactive reader.
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
    // No finally-reset of `deleting` on success — this component is
    // about to unmount once the lesson list refreshes and activeLesson
    // moves on, so there's nothing left to reset.
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-rule bg-panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-base text-parchment">
            {lesson.reference || 'No reference set'} {lesson.module && <span className="text-xs text-muted">| {lesson.module}</span>}
          </h3>
          {isOwner && (
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setShowEditLessonModal(true)} className="text-xs text-muted hover:text-parchment">
                edit
              </button>
              <button onClick={handleDeleteLesson} disabled={deleting} className="text-xs text-muted hover:text-red-400 disabled:opacity-50">
                {deleting ? 'deleting…' : 'delete'}
              </button>
            </div>
          )}
        </div>
        {passageError && <p className="text-sm text-red-400">{passageError}</p>}
        {!lesson.reference && <p className="text-sm text-muted">The leader hasn't set a passage for this lesson yet.</p>}
        {lesson.reference && !passage && !passageError && <p className="text-sm text-muted">Loading passage…</p>}
        {passage && (
          <p className="whitespace-pre-wrap text-sm text-parchment/90">
            {passage.map((v) => (
              <span key={v.verseNr}>
                <sup className="mr-1 text-xs text-muted">{v.verseNr}</sup>
                {stripHtml(v.content)}{' '}
              </span>
            ))}
          </p>
        )}
      </div>

      {lesson.body && (
        <div className="rounded-md border border-rule bg-panel p-4">
          <h4 className="mb-2 text-xs uppercase tracking-wide text-muted">Study Notes (from the leader)</h4>
          <p className="whitespace-pre-wrap text-sm text-parchment/90">{lesson.body}</p>
        </div>
      )}

      <div className="rounded-md border border-rule bg-panel p-4">
        <h4 className="mb-2 text-xs uppercase tracking-wide text-muted">Your Personal Note</h4>
        {noteLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Write your own thoughts on this passage…"
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
              >
                {savingNote ? 'saving…' : 'save note'}
              </button>
            </div>
          </>
        )}
      </div>

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
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
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
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass" />
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
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
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
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass" />
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

function AddResourceModal({ studyId, onClose, onAdded }) {
  const [type, setType] = useState('commentary');
  const [label, setLabel] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [url, setUrl] = useState('');
  const [commentaryModules, setCommentaryModules] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .listInstalledModules('COMMENTARY')
      .then((list) => {
        setCommentaryModules(list);
        if (list[0]) setModuleCode(list[0].name);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.addStudyResource(studyId, {
        type,
        label,
        moduleCode: type === 'commentary' ? moduleCode : null,
        url: type === 'link' ? url : null,
      });
      onAdded();
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
          <h2 className="font-display text-lg">Add a Resource</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('commentary')}
                className={`flex-1 rounded border px-3 py-2 text-xs ${type === 'commentary' ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted'}`}
              >
                Commentary
              </button>
              <button
                type="button"
                onClick={() => setType('link')}
                className={`flex-1 rounded border px-3 py-2 text-xs ${type === 'link' ? 'border-brass bg-brass/20 text-brass' : 'border-rule text-muted'}`}
              >
                External Link
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={type === 'commentary' ? 'Commentary: Clarke' : 'Bible Project: John'}
              autoFocus
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
            />
          </div>
          {type === 'commentary' ? (
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Commentary Module</label>
              <select
                value={moduleCode}
                onChange={(e) => setModuleCode(e.target.value)}
                className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass"
              >
                {commentaryModules.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.description || m.name}
                  </option>
                ))}
              </select>
              {commentaryModules.length === 0 && <p className="mt-1 text-xs text-muted">No commentary modules installed yet.</p>}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://bibleproject.com/..."
                className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !label.trim() || (type === 'commentary' ? !moduleCode : !url.trim())}
            className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {submitting ? 'adding…' : 'add resource'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditStudyModal({ study, onClose, onSaved }) {
  const [title, setTitle] = useState(study.title);
  const [description, setDescription] = useState(study.description || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Edit Study</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">
            close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass" />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50">
            {saving ? 'saving…' : 'save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export { DiscussionTab, GenerateStudyModal, ContentTab, StudySidebar, ProgressRing, LessonContent };
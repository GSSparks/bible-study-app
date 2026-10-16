import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Sparkles, Trash2, Video } from 'lucide-react';
import { api } from '../api/client.js';
import RichEditor from './RichEditor.jsx';

export default function StudyBuilder({ studyId, scriptoriumId, onDone, onDeleted }) {
  const [study, setStudy] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [generatingBanner, setGeneratingBanner] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const bannerInputRef = useRef(null);
  // Used by LessonEditor to signal pending unsaved body so we can auto-save
  // before switching lessons without requiring the user to click a button.
  const pendingBodyRef = useRef(null);
  const pendingBodyDirtyRef = useRef(false);

  async function refresh() {
    const [s, l] = await Promise.all([api.getStudy(studyId), api.listStudyLessons(studyId)]);
    setStudy(s);
    setTitle(s.title);
    setDescription(s.description || '');
    setBannerUrl(s.bannerUrl || null);
    setLessons(l);
    setSelectedId((prev) => {
      if (prev && l.some((les) => les.id === prev)) return prev;
      return l[0]?.id || null;
    });
  }

  useEffect(() => {
    setLoading(true);
    refresh().catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [studyId]);

  async function saveStudy() {
    try { await api.updateStudy(studyId, { title, description }); } catch {}
  }

  async function addLesson() {
    setAdding(true);
    try {
      const created = await api.createStudyLesson(studyId, {
        order: lessons.length + 1,
        title: 'New Lesson',
        module: null,
        reference: null,
        body: null,
      });
      await refresh();
      setSelectedId(created.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function moveLesson(lessonId, direction) {
    const idx = lessons.findIndex((l) => l.id === lessonId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= lessons.length) return;
    const a = lessons[idx];
    const b = lessons[swapIdx];
    const next = lessons.map((l) => {
      if (l.id === a.id) return { ...l, order: b.order };
      if (l.id === b.id) return { ...l, order: a.order };
      return l;
    }).sort((x, y) => x.order - y.order);
    setLessons(next);
    try {
      await Promise.all([
        api.updateStudyLesson(a.id, { order: b.order, title: a.title, module: a.module, reference: a.reference, body: a.body }),
        api.updateStudyLesson(b.id, { order: a.order, title: b.title, module: b.module, reference: b.reference, body: b.body }),
      ]);
    } catch {
      refresh().catch(() => {});
    }
  }

  async function deleteLesson(lessonId) {
    if (!confirm('Delete this lesson? This removes its discussion and progress — this cannot be undone.')) return;
    try {
      await api.deleteStudyLesson(lessonId);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function switchLesson(newId) {
    if (pendingBodyDirtyRef.current && pendingBodyRef.current !== null) {
      const cur = lessons.find((l) => l.id === selectedId);
      if (cur) {
        try {
          await api.updateStudyLesson(selectedId, {
            order: cur.order, title: cur.title, module: cur.module, reference: cur.reference,
            body: pendingBodyRef.current,
          });
          pendingBodyDirtyRef.current = false;
        } catch {}
      }
    }
    setSelectedId(newId);
  }

  async function handleBannerChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const { url } = await api.uploadStudyBanner(studyId, file);
      setBannerUrl(url);
    } finally { setUploadingBanner(false); e.target.value = ''; }
  }

  async function handleGenerateBanner() {
    setGeneratingBanner(true);
    try {
      const { url } = await api.generateStudyBanner(studyId);
      setBannerUrl(url);
    } catch (e) { setError(e.message); }
    finally { setGeneratingBanner(false); }
  }

  async function handleDeleteStudy() {
    setDeleting(true);
    try {
      await api.deleteStudy(studyId);
      onDeleted();
    } catch (e) { setError(e.message); setDeleting(false); }
  }

  const selectedLesson = lessons.find((l) => l.id === selectedId) || null;

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error && !study) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!study) return null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-rule bg-panel">
        {/* Study identity */}
        <div className="shrink-0 border-b border-rule px-4 py-3">
          <button onClick={onDone} className="mb-2 flex items-center text-xs text-muted hover:text-parchment">
            ‹ back to study
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveStudy}
            placeholder="Study title"
            className="w-full bg-transparent font-display text-base font-semibold text-parchment placeholder:text-muted/40 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveStudy}
            placeholder="Brief description…"
            rows={2}
            className="mt-1 w-full resize-none bg-transparent text-xs leading-relaxed text-muted placeholder:text-muted/40 focus:outline-none"
          />
        </div>

        {/* Lesson list header */}
        <div className="flex shrink-0 items-center justify-between border-b border-rule px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Lessons</p>
          <button onClick={addLesson} disabled={adding} className="text-xs text-muted hover:text-parchment disabled:opacity-50">
            {adding ? '…' : '+ add'}
          </button>
        </div>

        {/* Lesson list */}
        <nav className="min-h-0 flex-1 overflow-y-auto py-1">
          {lessons.map((l, idx) => {
            const isActive = l.id === selectedId;
            return (
              <div
                key={l.id}
                className={`group flex items-center gap-1 border-l-2 px-3 py-1.5 transition-colors ${
                  isActive ? 'border-brass bg-ink/50' : 'border-transparent hover:bg-ink/30'
                }`}
              >
                <button
                  onClick={() => switchLesson(l.id)}
                  className={`min-w-0 flex-1 truncate text-left text-sm leading-snug ${isActive ? 'text-brass' : 'text-muted hover:text-parchment'}`}
                >
                  <span className="mr-1.5 text-[10px] opacity-40">{l.order}.</span>
                  {l.title || 'Untitled'}
                </button>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => moveLesson(l.id, 'up')} disabled={idx === 0} className="rounded p-0.5 text-muted hover:text-parchment disabled:opacity-20">
                    <ChevronUp size={12} />
                  </button>
                  <button onClick={() => moveLesson(l.id, 'down')} disabled={idx === lessons.length - 1} className="rounded p-0.5 text-muted hover:text-parchment disabled:opacity-20">
                    <ChevronDown size={12} />
                  </button>
                  <button onClick={() => deleteLesson(l.id)} className="rounded p-0.5 text-muted hover:text-red-400">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
          {lessons.length === 0 && <p className="px-4 py-3 text-xs text-muted">No lessons yet.</p>}
        </nav>

        {/* Settings */}
        <div className="shrink-0 space-y-3 border-t border-rule px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Settings</p>

          {/* Banner */}
          <div>
            {bannerUrl && <img src={bannerUrl} alt="" className="mb-2 h-16 w-full rounded-lg object-cover" />}
            <div className="flex gap-2">
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
              <button onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner || generatingBanner}
                className="flex items-center gap-1 rounded border border-rule px-2 py-1 text-[11px] text-muted hover:border-brass hover:text-parchment disabled:opacity-50">
                <Camera size={11} />
                {uploadingBanner ? 'uploading…' : 'banner'}
              </button>
              <button onClick={handleGenerateBanner} disabled={generatingBanner || uploadingBanner}
                className="flex items-center gap-1 rounded border border-rule px-2 py-1 text-[11px] text-muted hover:border-brass hover:text-parchment disabled:opacity-50">
                <Sparkles size={11} />
                {generatingBanner ? 'generating…' : 'AI banner'}
              </button>
            </div>
          </div>

          {/* Generate lessons */}
          <button onClick={() => setShowGenerateModal(true)}
            className="flex w-full items-center gap-1.5 text-xs text-muted hover:text-parchment">
            <Sparkles size={13} />
            Generate lessons with AI
          </button>

          {/* Danger zone */}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {confirmDelete ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted">Delete this study? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleDeleteStudy} disabled={deleting}
                  className="rounded border border-red-900/60 px-2.5 py-1 text-xs text-red-400 hover:border-red-400 disabled:opacity-50">
                  {deleting ? 'deleting…' : 'confirm delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-parchment">cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-muted/50 hover:text-red-400">
              delete study…
            </button>
          )}
        </div>
      </aside>

      {/* Right pane */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-page">
        {selectedLesson ? (
          <LessonEditor
            key={selectedLesson.id}
            lesson={selectedLesson}
            studyId={studyId}
            onSaved={() => refresh().catch(() => {})}
            pendingBodyRef={pendingBodyRef}
            pendingBodyDirtyRef={pendingBodyDirtyRef}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="mb-3 text-sm text-pageMuted">
                {lessons.length === 0 ? 'Add your first lesson to get started.' : 'Select a lesson to edit.'}
              </p>
              {lessons.length === 0 && (
                <button onClick={addLesson} disabled={adding}
                  className="rounded bg-pageAccent/90 px-4 py-2 text-sm font-medium text-page hover:bg-pageAccent disabled:opacity-50">
                  {adding ? 'adding…' : '+ add lesson'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showGenerateModal && (
        <GenerateModal
          studyId={studyId}
          nextOrder={lessons.length + 1}
          onClose={() => setShowGenerateModal(false)}
          onCreated={async () => {
            setShowGenerateModal(false);
            await refresh().catch(() => {});
          }}
        />
      )}
    </div>
  );
}

function LessonEditor({ lesson, studyId, onSaved, pendingBodyRef, pendingBodyDirtyRef }) {
  const [title, setTitle] = useState(lesson.title);
  const [reference, setReference] = useState(lesson.reference || '');
  const [module, setModule] = useState(lesson.module || '');
  const [body, setBody] = useState(lesson.body || '');
  const [reflectionPrompt, setReflectionPrompt] = useState(lesson.reflectionPrompt || '');
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [savingBody, setSavingBody] = useState(false);
  const [error, setError] = useState(null);
  const [showOutlinePrompt, setShowOutlinePrompt] = useState(false);
  const [outlineTopic, setOutlineTopic] = useState('');
  const [generatingOutline, setGeneratingOutline] = useState(false);

  // Webcam recorder state
  const [cameraMode, setCameraMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingRecording, setUploadingRecording] = useState(false);

  const videoInputRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const cameraPreviewRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    pendingBodyRef.current = body;
  }, [body]);

  const attachCameraPreview = useCallback((el) => {
    cameraPreviewRef.current = el;
    if (el && mediaStreamRef.current) el.srcObject = mediaStreamRef.current;
  }, []);

  // Clean up camera and object URLs on unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopCameraTracks() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }

  function fmtTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  async function startCamera() {
    setError(null);
    setRecordedBlob(null);
    if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl(null); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      setCameraMode(true);
    } catch (err) {
      setError('Camera access denied — check your browser permissions.');
    }
  }

  function exitCamera() {
    stopCameraTracks();
    if (mediaRecorderRef.current && recording) mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl(null); }
    setRecordedBlob(null);
    setRecording(false);
    setRecordingTime(0);
    setCameraMode(false);
  }

  function startRecording() {
    chunksRef.current = [];
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      .find((t) => MediaRecorder.isTypeSupported(t)) || '';
    const recorder = new MediaRecorder(mediaStreamRef.current, mimeType ? { mimeType } : {});
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      stopCameraTracks();
    };
    mediaRecorderRef.current = recorder;
    recorder.start(250);
    setRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
  }

  function stopRecording() {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleUseRecording() {
    if (!recordedBlob) return;
    setUploadingRecording(true);
    setError(null);
    try {
      const mimeBase = recordedBlob.type.split(';')[0];
      const ext = mimeBase.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([recordedBlob], `recording.${ext}`, { type: mimeBase });
      const { url } = await api.uploadLessonVideo(lesson.id, file);
      setVideoUrl(url);
      onSaved();
      exitCamera();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingRecording(false);
    }
  }

  function buildPayload(overrides = {}) {
    return {
      order: lesson.order,
      title: overrides.title ?? title,
      module: (overrides.module ?? module) || null,
      reference: (overrides.reference ?? reference) || null,
      body: (overrides.body ?? body) || null,
      reflectionPrompt: (overrides.reflectionPrompt ?? reflectionPrompt) || null,
    };
  }

  async function saveField(field, value) {
    try {
      await api.updateStudyLesson(lesson.id, buildPayload({ [field]: value }));
      pendingBodyDirtyRef.current = false;
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveBody() {
    setSavingBody(true);
    setError(null);
    try {
      await api.updateStudyLesson(lesson.id, buildPayload());
      pendingBodyDirtyRef.current = false;
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingBody(false);
    }
  }

  async function handleVideoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { url } = await api.uploadLessonVideo(lesson.id, file);
      setVideoUrl(url);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally { setUploadingVideo(false); e.target.value = ''; }
  }

  async function handleRemoveVideo() {
    if (!confirm('Remove the video from this lesson?')) return;
    try {
      await api.removeLessonVideo(lesson.id);
      setVideoUrl(null);
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateOutline(e) {
    e.preventDefault();
    const topic = outlineTopic.trim() || reference || title;
    if (!topic) return;
    setGeneratingOutline(true);
    setError(null);
    try {
      const drafts = await api.generateStudyLessonDrafts(studyId, { topic, module: module || undefined, outline: true });
      if (drafts[0]?.body) {
        setBody(drafts[0].body);
        pendingBodyDirtyRef.current = true;
      }
      setShowOutlinePrompt(false);
      setOutlineTopic('');
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingOutline(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => saveField('title', e.target.value)}
          placeholder="Lesson title"
          className="w-full bg-transparent font-display text-2xl text-pageText placeholder:text-pageMuted/50 focus:outline-none"
        />

        {/* Reference + Module */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-pageMuted">Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onBlur={(e) => saveField('reference', e.target.value)}
              placeholder="John 15:1–17"
              className="w-full rounded border border-pageBorder bg-white/50 px-3 py-2 text-sm text-pageText placeholder:text-pageMuted/70 focus:border-pageAccent focus:outline-none"
            />
          </div>
          <div className="w-32">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-pageMuted">Module</label>
            <input
              value={module}
              onChange={(e) => setModule(e.target.value)}
              onBlur={(e) => saveField('module', e.target.value)}
              placeholder="KJV"
              className="w-full rounded border border-pageBorder bg-white/50 px-3 py-2 text-sm text-pageText placeholder:text-pageMuted/70 focus:border-pageAccent focus:outline-none"
            />
          </div>
        </div>

        {/* Study Notes body */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-pageMuted">Study Notes</label>
              <button
                type="button"
                onClick={() => setShowOutlinePrompt((v) => !v)}
                title="Generate outline with AI"
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-pageMuted hover:bg-pageAccent/10 hover:text-pageAccent"
              >
                <Sparkles size={10} />
                AI outline
              </button>
            </div>
            <button onClick={saveBody} disabled={savingBody}
              className="text-xs text-pageMuted hover:text-pageText disabled:opacity-50">
              {savingBody ? 'saving…' : 'save'}
            </button>
          </div>

          {showOutlinePrompt && (
            <form onSubmit={handleGenerateOutline} className="mb-3 flex gap-2">
              <input
                value={outlineTopic}
                onChange={(e) => setOutlineTopic(e.target.value)}
                placeholder={reference || title || 'Topic or passage…'}
                autoFocus
                className="min-w-0 flex-1 rounded border border-pageBorder bg-white/50 px-2.5 py-1.5 text-sm text-pageText placeholder:text-pageMuted/70 focus:border-pageAccent focus:outline-none"
              />
              <button type="submit" disabled={generatingOutline}
                className="flex items-center gap-1 rounded bg-pageAccent/90 px-3 py-1.5 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50">
                <Sparkles size={11} />
                {generatingOutline ? 'generating…' : 'generate'}
              </button>
              <button type="button" onClick={() => { setShowOutlinePrompt(false); setOutlineTopic(''); }}
                className="px-2 text-xs text-pageMuted hover:text-pageText">
                cancel
              </button>
            </form>
          )}

          <RichEditor
            value={body}
            onChange={(val) => { setBody(val); pendingBodyDirtyRef.current = true; }}
            height={340}
            colorMode="light"
          />
        </div>

        {/* Reflection prompt */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-pageMuted">
            Reflection Prompt{' '}
            <span className="font-normal normal-case text-pageMuted/50">(optional)</span>
          </label>
          <input
            value={reflectionPrompt}
            onChange={(e) => setReflectionPrompt(e.target.value)}
            onBlur={(e) => saveField('reflectionPrompt', e.target.value)}
            placeholder="What stood out to you in this passage?"
            className="w-full rounded border border-pageBorder bg-white/50 px-3 py-2 text-sm text-pageText placeholder:text-pageMuted/70 focus:border-pageAccent focus:outline-none"
          />
        </div>

        {/* Video */}
        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-pageMuted">Video</label>
          <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoChange} />
          {videoUrl && !cameraMode ? (
            <div className="overflow-hidden rounded-xl border border-pageBorder bg-white/30">
              <video key="lesson-video" src={videoUrl} controls className="w-full" style={{ maxHeight: '360px' }} />
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs text-pageMuted">Lesson Video</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} className="flex items-center gap-1 text-xs text-pageMuted hover:text-pageText disabled:opacity-50">
                    <Video size={11} strokeWidth={1.5} />
                    {uploadingVideo ? 'uploading…' : 'replace file'}
                  </button>
                  <button onClick={startCamera} className="flex items-center gap-1 text-xs text-pageMuted hover:text-pageText">
                    <Camera size={11} strokeWidth={1.5} />
                    record new
                  </button>
                  <button onClick={handleRemoveVideo} className="text-xs text-pageMuted hover:text-red-500">remove</button>
                </div>
              </div>
            </div>
          ) : cameraMode ? (
            <div className="overflow-hidden rounded-xl border border-pageBorder bg-white/30">
              {recordedBlob ? (
                <video key="recorded-preview" src={recordedUrl} controls preload="auto" className="w-full" style={{ maxHeight: '360px' }} />
              ) : (
                <video key="live-preview" ref={attachCameraPreview} autoPlay muted playsInline className="w-full bg-black" style={{ maxHeight: '360px' }} />
              )}
              <div className="flex items-center justify-between px-4 py-2.5">
                {recordedBlob ? (
                  <>
                    <span className="text-xs text-pageMuted">Recording preview</span>
                    <div className="flex items-center gap-3">
                      <button onClick={startCamera} className="text-xs text-pageMuted hover:text-pageText">retake</button>
                      <button onClick={exitCamera} className="text-xs text-pageMuted hover:text-pageText">cancel</button>
                      <button onClick={handleUseRecording} disabled={uploadingRecording}
                        className="rounded bg-pageAccent/90 px-3 py-1 text-xs font-medium text-page hover:bg-pageAccent disabled:opacity-50">
                        {uploadingRecording ? 'uploading…' : 'use this'}
                      </button>
                    </div>
                  </>
                ) : recording ? (
                  <>
                    <span className="flex items-center gap-2 text-xs text-red-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                      {fmtTime(recordingTime)}
                    </span>
                    <button onClick={stopRecording}
                      className="rounded bg-red-500/20 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-500/30">
                      stop
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-pageMuted">Camera ready</span>
                    <div className="flex items-center gap-3">
                      <button onClick={exitCamera} className="text-xs text-pageMuted hover:text-pageText">cancel</button>
                      <button onClick={startRecording}
                        className="flex items-center gap-1.5 rounded bg-red-500/90 px-3 py-1 text-xs font-medium text-white hover:bg-red-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        record
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-pageBorder py-8 text-pageMuted hover:border-pageAccent hover:text-pageText disabled:opacity-50">
                <Video size={20} strokeWidth={1.5} />
                <span className="text-xs">{uploadingVideo ? 'uploading…' : 'upload file'}</span>
                <span className="text-[10px] text-pageMuted/50">mp4, webm, or mov</span>
              </button>
              <button onClick={startCamera}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-pageBorder py-8 text-pageMuted hover:border-pageAccent hover:text-pageText">
                <Camera size={20} strokeWidth={1.5} />
                <span className="text-xs">use camera</span>
                <span className="text-[10px] text-pageMuted/50">record with webcam</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GenerateModal({ studyId, nextOrder, onClose, onCreated }) {
  const [step, setStep] = useState('form');
  const [topic, setTopic] = useState('');
  const [weekCount, setWeekCount] = useState(6);
  const [module, setModule] = useState('');
  const [modules, setModules] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listInstalledModules('BIBLE').then((list) => {
      setModules(list);
      if (list[0]) setModule(list[0].name);
    }).catch(() => {});
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.generateStudyLessonDrafts(studyId, { topic, weekCount: Number(weekCount), module });
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
          <h2 className="font-display text-lg">Generate Lessons with AI</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)}
                placeholder="The Gospel of John, chapters 14–17"
                autoFocus
                className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Weeks</label>
                <input type="number" min={1} max={26} value={weekCount} onChange={(e) => setWeekCount(e.target.value)}
                  className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Bible Module</label>
                <select value={module} onChange={(e) => setModule(e.target.value)}
                  className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment focus:border-brass">
                  {modules.map((m) => <option key={m.name} value={m.name}>{m.description || m.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted">
              This drafts a starting point — you'll review and can edit every lesson before anything is created.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={submitting || !topic.trim() || !module}
              className="w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50">
              {submitting ? 'generating…' : 'generate'}
            </button>
          </form>
        )}

        {step === 'reviewing' && (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Review each lesson — edit anything or remove what you don't want. Nothing is created until you accept.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="space-y-3">
              {drafts.map((d, i) => (
                <div key={d.tempId} className="rounded-md border border-rule bg-ink p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted">Week {i + 1}</span>
                    <button onClick={() => setDrafts((prev) => prev.filter((x) => x.tempId !== d.tempId))}
                      className="text-xs text-muted hover:text-red-400">remove</button>
                  </div>
                  <input value={d.title} onChange={(e) => updateDraft(d.tempId, 'title', e.target.value)}
                    className="mb-2 w-full rounded border border-rule bg-panel px-2 py-1 text-sm text-parchment focus:border-brass" />
                  <input value={d.reference || ''} onChange={(e) => updateDraft(d.tempId, 'reference', e.target.value)}
                    placeholder="Reference"
                    className={`mb-2 w-full rounded border bg-panel px-2 py-1 text-xs placeholder:text-muted focus:border-brass ${d.reference ? 'border-rule text-parchment' : 'border-amber-600 text-amber-400'}`} />
                  {!d.reference && (
                    <p className="mb-2 text-xs text-amber-400">⚠ No reference confirmed — fill in manually or leave blank.</p>
                  )}
                  <textarea value={d.body || ''} onChange={(e) => updateDraft(d.tempId, 'body', e.target.value)}
                    rows={2}
                    className="w-full rounded border border-rule bg-panel px-2 py-1 text-xs text-parchment focus:border-brass" />
                </div>
              ))}
              {drafts.length === 0 && <p className="text-sm text-muted">All removed — go back and generate again.</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('form')}
                className="flex-1 rounded border border-rule px-3 py-2 text-sm text-muted hover:border-brass hover:text-parchment">
                ← regenerate
              </button>
              <button onClick={handleAccept} disabled={submitting || drafts.length === 0}
                className="flex-1 rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50">
                {submitting ? 'creating…' : `accept all (${drafts.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

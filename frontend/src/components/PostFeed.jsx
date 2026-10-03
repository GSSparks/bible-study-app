import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Shared across three contexts that differ only in WHERE posts come
 * from and WHERE a new post is targeted — the display and the actual
 * post/comment/delete mutations are identical either way. The parent
 * owns fetching and passes posts/loading/error down (plus onRefresh to
 * call after a mutation) rather than this component owning an opaque
 * fetcher — keeps each of the three call sites' own fetch logic
 * visible and ordinary instead of hidden behind an abstraction. */
export default function PostFeed({ posts, loading, error, canPost, scriptoriumId, currentUserId, onRefresh, onViewProfile }) {
  const [composerText, setComposerText] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [posting, setPosting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const mediaInputRef = useRef(null);

  function handleMediaSelect(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const combined = [...mediaFiles, ...selected].slice(0, 4);
    setMediaFiles(combined);
    setMediaPreviews(combined.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video') ? 'video' : 'image',
    })));
    e.target.value = '';
  }

  function removeMedia(index) {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!composerText.trim() && mediaFiles.length === 0) return;
    setPosting(true);
    setLocalError(null);
    try {
      await api.createPost({ body: composerText, scriptoriumId, mediaFiles });
      setComposerText('');
      mediaPreviews.forEach((p) => URL.revokeObjectURL(p.url));
      setMediaFiles([]);
      setMediaPreviews([]);
      onRefresh();
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDeletePost(postId) {
    try {
      await api.deletePost(postId);
      onRefresh();
    } catch (e) {
      setLocalError(e.message);
    }
  }

  return (
    <div>
      {canPost && (
        <form onSubmit={handlePost} className="mb-5 rounded-lg border border-rule bg-panel p-4">
          <textarea
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Share a thought…"
            className="w-full rounded-md border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
          />

          {mediaPreviews.length > 0 && (
            <div className={`mt-2 grid gap-1.5 ${mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {mediaPreviews.map((p, i) => (
                <div key={i} className="relative overflow-hidden rounded-md bg-ink">
                  {p.type === 'image' ? (
                    <img src={p.url} alt="" className="max-h-48 w-full object-cover" />
                  ) : (
                    <video src={p.url} className="max-h-48 w-full" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-parchment hover:bg-ink"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm"
                multiple
                className="hidden"
                onChange={handleMediaSelect}
              />
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                disabled={mediaFiles.length >= 4}
                className="flex items-center gap-1.5 rounded-md border border-rule px-2.5 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-40"
                title="Add photo or video (max 4)"
              >
                <ImagePlus size={14} />
                Photo / Video
              </button>
              {mediaFiles.length > 0 && (
                <span className="text-xs text-muted">{mediaFiles.length}/4</span>
              )}
            </div>
            <button
              type="submit"
              disabled={posting || (!composerText.trim() && mediaFiles.length === 0)}
              className="rounded-md bg-brass/90 px-4 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
            >
              {posting ? 'posting…' : 'post'}
            </button>
          </div>
        </form>
      )}

      {(error || localError) && <p className="mb-3 text-sm text-red-400">{error || localError}</p>}
      {loading && <p className="text-sm text-muted">Loading…</p>}

      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onDeleted={() => handleDeletePost(post.id)}
            onCommentAdded={onRefresh}
            onViewProfile={onViewProfile}
          />
        ))}
        {!loading && posts.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId, onDeleted, onCommentAdded, onViewProfile }) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isAuthor = post.author.id === currentUserId;

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createComment(post.id, commentText);
      setCommentText('');
      onCommentAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-rule bg-panel p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar username={post.author.username} avatarUrl={post.author.avatarUrl} size={32} />
          <div>
            <button
              onClick={() => onViewProfile?.(post.author.username)}
              className={`font-medium text-parchment ${onViewProfile ? 'hover:text-brass' : ''}`}
            >
              {post.author.displayName || post.author.username}
            </button>
            {post.scriptorium && <div className="text-xs text-muted">in {post.scriptorium.name}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {post.createdAt && <span className="text-xs text-muted">{relativeTime(post.createdAt)}</span>}
          {isAuthor && (
            <button onClick={onDeleted} className="text-xs text-muted hover:text-red-400">
              delete
            </button>
          )}
        </div>
      </div>

      {post.body && (
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-parchment/90">{post.body}</p>
      )}

      {post.mediaUrls?.length > 0 && (
        <div className={`mb-4 grid gap-1 overflow-hidden rounded-lg ${post.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.mediaUrls.map((m, i) => (
            m.type === 'image' ? (
              <img key={i} src={m.url} alt="" className="w-full object-cover" style={{ maxHeight: post.mediaUrls.length === 1 ? '480px' : '240px' }} />
            ) : (
              <video key={i} src={m.url} controls className="w-full" style={{ maxHeight: '360px' }} />
            )
          ))}
        </div>
      )}

      {post.comments.length > 0 && (
        <div className="mb-3 space-y-2 border-t border-rule pt-3">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-xs">
              <Avatar username={c.author.username} avatarUrl={c.author.avatarUrl} size={22} />
              <div className="min-w-0">
                <span className="font-medium text-parchment">{c.author.username}</span>{' '}
                <span className="text-parchment/70">{c.body}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleComment} className="flex gap-2">
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment…"
          maxLength={1000}
          className="flex-1 rounded-md border border-rule bg-ink px-3 py-1.5 text-xs text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !commentText.trim()}
          className="rounded-md border border-rule px-3 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-50"
        >
          reply
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
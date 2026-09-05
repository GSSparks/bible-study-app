import { useState } from 'react';
import { api } from '../api/client.js';
import Avatar from './Avatar.jsx';

/** Shared across three contexts that differ only in WHERE posts come
 * from and WHERE a new post is targeted — the display and the actual
 * post/comment/delete mutations are identical either way. The parent
 * owns fetching and passes posts/loading/error down (plus onRefresh to
 * call after a mutation) rather than this component owning an opaque
 * fetcher — keeps each of the three call sites' own fetch logic
 * visible and ordinary instead of hidden behind an abstraction. */
export default function PostFeed({ posts, loading, error, canPost, scriptoriumId, currentUserId, onRefresh }) {
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);
  const [localError, setLocalError] = useState(null);

  async function handlePost(e) {
    e.preventDefault();
    if (!composerText.trim()) return;
    setPosting(true);
    setLocalError(null);
    try {
      await api.createPost({ body: composerText, scriptoriumId });
      setComposerText('');
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
        <form onSubmit={handlePost} className="mb-4 rounded-md border border-rule bg-panel p-3">
          <textarea
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Share a thought…"
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={posting || !composerText.trim()}
              className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass disabled:opacity-50"
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
          />
        ))}
        {!loading && posts.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId, onDeleted, onCommentAdded }) {
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
    <div className="rounded-md border border-rule bg-panel p-4">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Avatar username={post.author.username} size={28} />
          <div>
            <div className="text-sm text-parchment">{post.author.username}</div>
            {post.scriptorium && <div className="text-xs text-muted">in {post.scriptorium.name}</div>}
          </div>
        </div>
        {isAuthor && (
          <button onClick={onDeleted} className="text-xs text-muted hover:text-red-400">
            delete
          </button>
        )}
      </div>

      <p className="mb-3 whitespace-pre-wrap text-sm text-parchment/90">{post.body}</p>

      {post.comments.length > 0 && (
        <div className="mb-2 space-y-2 border-t border-rule pt-2">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-xs">
              <Avatar username={c.author.username} size={20} />
              <div>
                <span className="text-parchment">{c.author.username}</span> <span className="text-muted">{c.body}</span>
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
          className="flex-1 rounded border border-rule bg-ink px-2 py-1 text-xs text-parchment placeholder:text-muted focus:border-brass"
        />
        <button
          type="submit"
          disabled={submitting || !commentText.trim()}
          className="rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-50"
        >
          reply
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
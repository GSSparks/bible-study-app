import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PostFeed from './PostFeed.jsx';

/** No username = my own wall (with a composer). A username = someone
 * else's wall, view-only here — posting always creates a post on the
 * CALLER's own wall regardless of whose wall is being viewed (that's
 * how the backend works), so showing a composer while looking at
 * someone else's wall would be actively misleading about where the
 * post is about to go. */
export default function ProfileWallView({ username, currentUserId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function refresh() {
    setLoading(true);
    setError(null);
    const fetcher = username ? api.getUserWall(username) : api.getMyWall();
    fetcher
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [username]);

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!data) return null;

  return (
    <div className="h-full overflow-y-auto p-6">
      {onBack && (
        <button onClick={onBack} className="mb-4 text-xs text-muted hover:text-parchment">
          ‹ back
        </button>
      )}
      <h2 className="mb-4 font-display text-2xl text-parchment">
        {username ? `${data.owner.username}'s Wall` : 'My Wall'}
      </h2>
      <PostFeed posts={data.posts} loading={false} error={null} canPost={!username} currentUserId={currentUserId} onRefresh={refresh} />
    </div>
  );
}
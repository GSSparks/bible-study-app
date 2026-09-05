import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PostFeed from './PostFeed.jsx';

export default function HomeView({ currentUserId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function refresh() {
    setLoading(true);
    api
      .getHomeFeed()
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="mb-4 font-display text-2xl text-parchment">Home</h2>
      {/* canPost with no scriptoriumId posts to the person's own wall —
       * the natural "what's on your mind" composer at the top of a feed. */}
      <PostFeed posts={posts} loading={loading} error={error} canPost currentUserId={currentUserId} onRefresh={refresh} />
    </div>
  );
}
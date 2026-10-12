import { Router } from 'express';

export const wikipediaRouter = Router();

const UA = 'Scriptorium/1.0 (self-hosted Bible study app; contact via GitHub)';

// GET /api/wikipedia?q=Solomon
// Finds the best-matching Wikipedia article and returns a cleaned summary.
wikipediaRouter.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'q is required' });

    // Step 1: find the best matching article title via OpenSearch
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', q);
    searchUrl.searchParams.set('srlimit', '1');
    searchUrl.searchParams.set('format', 'json');

    const searchRes = await fetch(searchUrl.toString(), { headers: { 'User-Agent': UA } });
    if (!searchRes.ok) return res.json(null);
    const searchData = await searchRes.json();
    const topTitle = searchData?.query?.search?.[0]?.title;
    if (!topTitle) return res.json(null);

    // Step 2: fetch the REST summary (intro paragraph + thumbnail)
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
    const summaryRes = await fetch(summaryUrl, { headers: { 'User-Agent': UA } });
    if (!summaryRes.ok) return res.json(null);
    const summary = await summaryRes.json();

    res.json({
      title: summary.title,
      html: summary.extract_html || (summary.extract ? `<p>${summary.extract}</p>` : null),
      thumbnail: summary.thumbnail?.source || null,
      url: summary.content_urls?.desktop?.page || null,
    });
  } catch (err) {
    next(err);
  }
});

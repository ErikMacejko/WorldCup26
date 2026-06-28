import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const GIPHY_KEY = process.env.GIPHY_API_KEY;

router.get('/search', async (req, res) => {
  if (!GIPHY_KEY) return res.json({ data: [], missing: true });
  const q = (req.query.q || '').trim();
  const url = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=30&rating=g`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=30&rating=g`;
  try {
    const r = await fetch(url);
    const json = await r.json();
    res.json({
      data: (json.data || []).map((g) => ({
        id: g.id,
        title: g.title,
        preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url || '',
        url: `https://media.giphy.com/media/${g.id}/giphy.gif`,
      })),
    });
  } catch (err) {
    console.error('[gif] search error', err);
    res.status(502).json({ error: 'giphy_error' });
  }
});

export default router;

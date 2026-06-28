import { Router } from 'express';
import { Chat } from '../models/Chat.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const clients = new Set();

function broadcast(msg) {
  const line = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of clients) {
    try { res.write(line); } catch { /* ignore already-closed */ }
  }
}

// SSE stream — EventSource can't send headers so token comes via query param,
// which requireAuth already supports.
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(ping); }
  }, 25000);

  clients.add(res);
  req.on('close', () => {
    clients.delete(res);
    clearInterval(ping);
  });
});

router.get('/messages', async (req, res) => {
  const msgs = await Chat.find().sort({ createdAt: -1 }).limit(100);
  res.json(msgs.reverse().map((m) => ({
    _id: m._id.toString(),
    nickname: m.nickname,
    text: m.text,
    imageData: m.imageData,
    createdAt: m.createdAt,
  })));
});

router.post('/messages', async (req, res) => {
  const text = req.body?.text?.trim();
  const imageData = req.body?.imageData;

  if (!text && !imageData) return res.status(400).json({ error: 'invalid' });
  if (text && text.length > 500) return res.status(400).json({ error: 'invalid' });
  if (imageData && (
    typeof imageData !== 'string' ||
    imageData.length > 250000 ||
    !imageData.startsWith('data:image/')
  )) return res.status(400).json({ error: 'invalid' });

  const msg = await Chat.create({
    user: req.user._id,
    nickname: req.user.nickname || req.user.name,
    text: text || undefined,
    imageData: imageData || undefined,
  });

  const out = {
    _id: msg._id.toString(),
    nickname: msg.nickname,
    text: msg.text,
    imageData: msg.imageData,
    createdAt: msg.createdAt,
  };
  broadcast(out);
  res.json(out);
});

export default router;

import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import {
  sendRequest,
  respondToRequest,
  removeConnection,
  listConnections,
  listPendingReceived,
  listPendingSent,
  searchUsers,
  searchFellows,
} from '../services/connectionService.js';

export const connectionsRouter = Router();



// Fellows are inherently tied to having an account — gated behind
// login for the entire router, same reasoning as notes/context/etc.
connectionsRouter.use(requireLogin);



// GET /api/connections — accepted connections
connectionsRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listConnections(req.user.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/connections/requests — incoming pending
connectionsRouter.get('/requests', async (req, res, next) => {
  try {
    res.json(await listPendingReceived(req.user.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/connections/sent — outgoing pending
connectionsRouter.get('/sent', async (req, res, next) => {
  try {
    res.json(await listPendingSent(req.user.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/connections  { username }
connectionsRouter.post('/', async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });
    res.status(201).json(await sendRequest(req.user.id, username));
  } catch (err) {
    next(err);
  }
});

connectionsRouter.post('/:id/accept', async (req, res, next) => {
  try {
    res.json(await respondToRequest(req.user.id, req.params.id, true));
  } catch (err) {
    next(err);
  }
});

connectionsRouter.post('/:id/decline', async (req, res, next) => {
  try {
    res.json(await respondToRequest(req.user.id, req.params.id, false));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/connections/:id — remove an accepted connection, cancel
// a sent request, or dismiss a received one, depending on who's
// calling and the row's current state (see removeConnection).
connectionsRouter.delete('/:id', async (req, res, next) => {
  try {
    await removeConnection(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/connections/fellows/search?q=...
connectionsRouter.get('/fellows/search', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    res.json(await searchFellows(req.query.q, req.user.id, { isAdmin }));
  } catch (err) {
    next(err);
  }
});

connectionsRouter.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    res.json(await searchUsers(req.user.id, q));
  } catch (err) {
    next(err);
  }
});

import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import {
  createScriptorium,
  listPublicScriptoriums,
  listMyScriptoriums,
  getScriptorium,
  listMembers,
  joinPublicScriptorium,
  leaveScriptorium,
  deleteScriptorium,
  updateScriptorium,
  removeMember,
  inviteToScriptorium,
  listMyInvites,
  respondToInvite,
} from '../services/scriptoriumService.js';

export const scriptoriumsRouter = Router();

// Scriptoriums are inherently tied to having an account — gated behind
// login for the entire router, same reasoning as notes/connections/etc.
scriptoriumsRouter.use(requireLogin);

// Static GET paths registered before the parameterized GET /:id below
// — Express matches in registration order, so /:id first would swallow
// requests to /public, /mine, and /invites (matching them as id="public"
// etc.) rather than ever reaching these handlers.
scriptoriumsRouter.get('/public', async (req, res, next) => {
  try {
    res.json(await listPublicScriptoriums(req.user.id));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.get('/mine', async (req, res, next) => {
  try {
    res.json(await listMyScriptoriums(req.user.id));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.get('/invites', async (req, res, next) => {
  try {
    res.json(await listMyInvites(req.user.id));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.post('/invites/:inviteId/accept', async (req, res, next) => {
  try {
    res.json(await respondToInvite(req.user.id, req.params.inviteId, true));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.post('/invites/:inviteId/decline', async (req, res, next) => {
  try {
    res.json(await respondToInvite(req.user.id, req.params.inviteId, false));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.post('/', async (req, res, next) => {
  try {
    const { name, description, visibility } = req.body;
    res.status(201).json(await createScriptorium(req.user.id, { name, description, visibility }));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await getScriptorium(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.get('/:id/members', async (req, res, next) => {
  try {
    res.json(await listMembers(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.post('/:id/join', async (req, res, next) => {
  try {
    res.status(201).json(await joinPublicScriptorium(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.post('/:id/leave', async (req, res, next) => {
  try {
    await leaveScriptorium(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.put('/:id', async (req, res, next) => {
  try {
    const { name, description, visibility } = req.body;
    res.json(await updateScriptorium(req.params.id, req.user.id, { name, description, visibility }));
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteScriptorium(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.delete('/:id/members/:membershipId', async (req, res, next) => {
  try {
    await removeMember(req.params.id, req.user.id, req.params.membershipId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

scriptoriumsRouter.post('/:id/invite', async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });
    res.status(201).json(await inviteToScriptorium(req.params.id, req.user.id, username));
  } catch (err) {
    next(err);
  }
});
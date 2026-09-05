import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import { createPost, getWall, getScriptoriumWall, getHomeFeed, deletePost, createComment, deleteComment } from '../services/wallService.js';

export const wallRouter = Router();

// Wall content is inherently tied to having an account — gated behind
// login for the entire router, same reasoning as notes/connections/
// scriptoriums.
wallRouter.use(requireLogin);

wallRouter.get('/feed', async (req, res, next) => {
  try {
    res.json(await getHomeFeed(req.user.id));
  } catch (err) {
    next(err);
  }
});

wallRouter.get('/me', async (req, res, next) => {
  try {
    res.json(await getWall(req.user.id, req.user.id, { byUsername: false }));
  } catch (err) {
    next(err);
  }
});

wallRouter.get('/user/:username', async (req, res, next) => {
  try {
    res.json(await getWall(req.params.username, req.user.id, { byUsername: true }));
  } catch (err) {
    next(err);
  }
});

wallRouter.get('/scriptorium/:id', async (req, res, next) => {
  try {
    res.json(await getScriptoriumWall(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

wallRouter.post('/posts', async (req, res, next) => {
  try {
    const { body, scriptoriumId } = req.body;
    res.status(201).json(await createPost({ authorId: req.user.id, scriptoriumId: scriptoriumId || null, body }));
  } catch (err) {
    next(err);
  }
});

wallRouter.delete('/posts/:id', async (req, res, next) => {
  try {
    await deletePost(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

wallRouter.post('/posts/:id/comments', async (req, res, next) => {
  try {
    const { body } = req.body;
    res.status(201).json(await createComment({ postId: req.params.id, authorId: req.user.id, body }));
  } catch (err) {
    next(err);
  }
});

wallRouter.delete('/comments/:id', async (req, res, next) => {
  try {
    await deleteComment(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { isBootstrapNeeded, bootstrapAdmin, verifyLogin, createUser } from '../services/authService.js';
import { requireAdmin } from '../middleware/auth.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// Bootstrap creates the account that owns the whole instance — an even
// more sensitive action than a regular login, so a tighter limit.
const bootstrapLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many setup attempts. Please try again later.' },
});

authRouter.get('/bootstrap-status', async (req, res, next) => {
  try {
    res.json({ setupRequired: await isBootstrapNeeded() });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/bootstrap', bootstrapLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await bootstrapAdmin({ username, password });
    req.session.userId = user.id;
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await verifyLogin({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    // Regenerate the session on login — a narrow but real mitigation
    // against session fixation: an attacker who got a victim to load
    // the site with a known/attacker-chosen session id beforehand can't
    // reuse that id to inherit the now-authenticated session, since a
    // fresh session id is issued at the moment of successful login.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      res.json({ user });
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ status: 'logged out' });
  });
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

// Admin-only: creates a regular (or additional admin) account. No
// public self-signup anywhere in this router — every account past the
// first is provisioned by an admin.
authRouter.post('/users', requireAdmin, async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    const user = await createUser({ username, password, role });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
import { prisma } from '../db/prisma.js';
import { isBootstrapNeeded } from '../services/authService.js';

/** Attaches req.user (or null) based on the session, on every request,
 *  so every later middleware/route can just check req.user without
 *  re-querying. Anonymous visitors still get a session (see index.js's
 *  saveUninitialized: true) — they just never get a userId set on it,
 *  so req.user stays null while the session itself still exists for
 *  generic usage tracking. */
export async function attachUser(req, res, next) {
  if (req.session?.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { id: true, username: true, role: true },
      });
      req.user = user || null;
      if (!user) {
        // Session references a user that no longer exists (deleted account) — clear it.
        req.session.userId = undefined;
      }
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

export function requireLogin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Login required.' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Login required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

/** Blocks all routes except the bootstrap ones until the first admin
 *  account exists — the app has no real owner before that, and letting
 *  any other route function in that state (even read-only ones) is a
 *  confusing, arguably insecure thing to leave exposed on a public
 *  server. "Bootstrap completed" is a one-way transition — once it's
 *  true it can never become false again for the life of the process —
 *  so once observed true, this stops re-querying the database on every
 *  single request and just short-circuits from then on. */
let bootstrapCompletedCache = false;

export async function blockUntilBootstrapped(req, res, next) {
  // req.originalUrl (not req.path) deliberately — req.path is relative
  // to wherever a middleware happens to be mounted (app.use('/api', ...)
  // strips the '/api' prefix before this ever runs, confirmed the hard
  // way when that stripping made this middleware block every request
  // including the bootstrap endpoints themselves). originalUrl always
  // reflects the real, full URL regardless of mounting depth, so this
  // check stays correct no matter how this middleware ends up wired in.
  if (req.originalUrl === '/api/auth/bootstrap' || req.originalUrl === '/api/auth/bootstrap-status') {
    return next();
  }
  if (bootstrapCompletedCache) return next();
  if (await isBootstrapNeeded()) {
    return res.status(503).json({ error: 'This instance has not been set up yet.', setupRequired: true });
  }
  bootstrapCompletedCache = true;
  next();
}
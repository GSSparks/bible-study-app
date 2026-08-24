import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { modulesRouter } from './routes/modules.js';
import { bibleRouter } from './routes/bible.js';
import { searchRouter } from './routes/search.js';
import { pdfRouter } from './routes/pdf.js';
import { notesRouter } from './routes/notes.js';
import { contextRouter } from './routes/context.js';
import { strongsRouter } from './routes/strongs.js';
import { dictionaryRouter } from './routes/dictionary.js';
import { errorHandler } from './middleware/errorHandler.js';
import { wordStudyRouter } from './routes/wordStudy.js';
import { personalModulesRouter } from './routes/personalModulesRouter.js';
import { phraseStudyRouter } from './routes/phraseStudy.js';
import { authRouter } from './routes/auth.js';
import { attachUser, blockUntilBootstrapped } from './middleware/auth.js';
import { adminRouter } from './routes/admin.js';
import { brandingRouter } from './routes/branding.js';
import { connectionsRouter } from './routes/connections.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '..', 'public');

const app = express();

// Public server, presumably behind a reverse proxy terminating TLS —
// needed so express-session's cookie.secure check (which reads
// X-Forwarded-Proto) works correctly instead of seeing every request as
// plain HTTP and refusing to set the cookie.
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false })); // CSP tuned separately if you add one
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({ conString: config.databaseUrl, tableName: 'session' }),
    secret: config.sessionSecret,
    resave: false,
    // true so anonymous visitors get a session id too, not just people
    // who log in — that's what generic (non-account) usage tracking
    // hangs off of.
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      // 'auto' rather than NODE_ENV === 'production' — express-session
      // resolves this from req.secure (which itself respects
      // X-Forwarded-Proto since trust proxy is set above), so the same
      // setting is correct both testing locally over plain HTTP with
      // no proxy and running behind nginx terminating real TLS in
      // production, without needing NODE_ENV to be flipped back and
      // forth between environments. Confirmed directly: no Secure
      // attribute on the cookie over plain HTTP, Secure attribute
      // correctly present the moment X-Forwarded-Proto: https shows up.
      secure: 'auto',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

app.use(attachUser);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// authRouter mounted BEFORE blockUntilBootstrapped, deliberately — see
// blockUntilBootstrapped's own comment for why this (mount order, not a
// hardcoded path allowlist) is what keeps login/bootstrap reachable
// during initial setup, without reintroducing the path-matching
// fragility an earlier version of this hit.
app.use('/api/auth', authRouter);

// Everything else under /api is blocked until the first admin account
// exists — the app has no real owner before that, and letting any
// other route function in that state (even read-only ones) is a
// confusing, arguably insecure thing to leave exposed on a public
// server.
app.use('/api', blockUntilBootstrapped);

app.use('/api/modules', modulesRouter);
app.use('/api/bible', bibleRouter);
app.use('/api/search', searchRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/notes', notesRouter);
app.use('/api/context', contextRouter);
app.use('/api/strongs', strongsRouter);
app.use('/api/dictionary', dictionaryRouter);
app.use('/api/word-study', wordStudyRouter);
app.use('/api/personal-modules', personalModulesRouter);
app.use('/api/phrase-study', phraseStudyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/branding', brandingRouter);
app.use('/api/connections', connectionsRouter);

// Serve the built React app for everything else (SPA fallback)
app.use(express.static(FRONTEND_DIST));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Bible study backend listening on port ${config.port}`);
});
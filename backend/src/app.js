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
import { scriptoriumsRouter } from './routes/scriptoriums.js';
import { wallRouter } from './routes/wall.js';
import { studiesRouter } from './routes/studies.js';
import { usersRouter } from './routes/users.js';
import { uploadsRouter } from './routes/uploads.js';
import { devotionalsRouter } from './routes/devotionals.js';
import { readingPlansRouter } from './routes/readingPlans.js';
import { topicsRouter } from './routes/topics.js';
import { wikipediaRouter } from './routes/wikipedia.js';
import { merriamRouter } from './routes/merriam.js';
import { booksRouter } from './routes/books.js';
import { codexRouter } from './routes/factbook.js';
import { bibleMapsRouter } from './routes/bibleMaps.js';
import { UPLOADS_PATH } from './middleware/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '..', 'public');

export function createApp() {
  const app = express();

  // Public server, presumably behind a reverse proxy terminating TLS —
  // needed so express-session's cookie.secure check (which reads
  // X-Forwarded-Proto) works correctly instead of seeing every request as
  // plain HTTP and refusing to set the cookie.
  app.set('trust proxy', 1);

  app.use(helmet({
    // Disable HSTS — this app runs over plain HTTP on local/LAN installs.
    // Sending Strict-Transport-Security over HTTP causes browsers to cache
    // an HTTPS-only policy for the host and upgrade all subsequent requests,
    // which breaks everything when there is no TLS terminator.
    strictTransportSecurity: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  }));

  // Dynamic CORS — reads allowed origin from the site_url AppSetting so
  // the admin can configure it from the UI without restarting the server.
  // Falls back to permissive in development.
  app.use(cors({
    origin: async (origin, callback) => {
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin) return callback(null, false);
      try {
        const { getSiteUrl } = await import('./services/brandingService.js');
        const siteUrl = await getSiteUrl();
        callback(null, siteUrl ? origin === siteUrl : false);
      } catch {
        callback(null, false);
      }
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '2mb' }));

  const sessionOptions = {
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: 'auto',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  // In test mode skip the PgSession store — the MemoryStore default is
  // fine for isolated unit/integration tests and avoids needing the
  // session table to exist at test startup.
  if (process.env.NODE_ENV !== 'test') {
    const PgSession = connectPgSimple(session);
    sessionOptions.store = new PgSession({
      conString: config.databaseUrl,
      tableName: 'session',
      createTableIfMissing: true,
    });
  }

  app.use(session(sessionOptions));

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
  app.use('/api/scriptoriums', scriptoriumsRouter);
  app.use('/api/wall', wallRouter);
  app.use('/api/studies', studiesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/devotionals', devotionalsRouter);
  app.use('/api/reading-plans', readingPlansRouter);
  app.use('/api/topics', topicsRouter);
  app.use('/api/wikipedia', wikipediaRouter);
  app.use('/api/merriam', merriamRouter);
  app.use('/api/books', booksRouter);
  app.use('/api/codex', codexRouter);
  app.use('/api/bible-maps', bibleMapsRouter);
  // SWORD module images — served directly from the modules data directory.
  // Entries in dict/maps modules contain relative <img> paths; swordService
  // rewrites them to /api/sword-data/{dataPath}/{img} so this handler resolves them.
  app.use('/api/sword-data', express.static(path.join(config.swordModulesPath, '.sword')));

  // User-uploaded files — served before the SPA static files so the
  // /uploads path doesn't get swallowed by the catch-all.
  app.use('/uploads', express.static(UPLOADS_PATH));

  // Serve the built React app for everything else (SPA fallback)
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}

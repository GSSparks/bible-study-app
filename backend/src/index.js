import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '..', 'public');

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // CSP tuned separately if you add one
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

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

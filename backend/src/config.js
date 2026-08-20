import 'dotenv/config';

// Public-facing app — a weak or missing session secret would let
// anyone forge a valid session cookie (including one claiming to be an
// admin), so this refuses to start rather than silently falling back
// to an insecure default. Generate one with `openssl rand -hex 32` and
// set it as SESSION_SECRET in your environment/.env file.
if (!process.env.SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET environment variable is required and not set. Generate one with `openssl rand -hex 32` and set it before starting the server.'
  );
}

export const config = {
  port: parseInt(process.env.PORT || '8088', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  swordModulesPath: process.env.SWORD_MODULES_PATH || '/data/sword-modules',
  pdfStoragePath: process.env.PDF_STORAGE_PATH || '/data/pdfs',
  databaseUrl: process.env.DATABASE_URL,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  sessionSecret: process.env.SESSION_SECRET,
};
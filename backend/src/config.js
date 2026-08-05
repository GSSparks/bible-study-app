import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '8088', 10),
  swordModulesPath: process.env.SWORD_MODULES_PATH || '/data/sword-modules',
  pdfStoragePath: process.env.PDF_STORAGE_PATH || '/data/pdfs',
  databaseUrl: process.env.DATABASE_URL,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
};

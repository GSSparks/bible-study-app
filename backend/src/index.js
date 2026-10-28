import { createApp } from './app.js';
import { config } from './config.js';
import { ensureBuiltInPlans } from './services/readingPlanService.js';
import { migrateCommentaryToNotes } from '../scripts/migrate-commentary-to-notes.js';

const app = createApp();
app.listen(config.port, () => {
  console.log(`Bible study backend listening on port ${config.port}`);
  ensureBuiltInPlans().catch((e) => console.error('Failed to seed reading plans:', e));
  migrateCommentaryToNotes().catch((e) => console.error('Commentary migration failed:', e));
});

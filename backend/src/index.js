import { createApp } from './app.js';
import { config } from './config.js';
import { ensureBuiltInPlans } from './services/readingPlanService.js';

const app = createApp();
app.listen(config.port, () => {
  console.log(`Bible study backend listening on port ${config.port}`);
  ensureBuiltInPlans().catch((e) => console.error('Failed to seed reading plans:', e));
});

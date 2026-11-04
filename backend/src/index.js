import { createApp } from './app.js';
import { config } from './config.js';
import { ensureBuiltInPlans } from './services/readingPlanService.js';
import { ensureBuiltInLayers } from './services/calendarService.js';

const app = createApp();

ensureBuiltInLayers()
.then(() => {
  app.listen(config.port, () => {
    console.log(`Bible study backend listening on port ${config.port}`);
    ensureBuiltInPlans().catch((e) => console.error('Failed to seed reading plans:', e));
  });
})
.catch((e) => {
  console.error('Failed to seed calendar layers:', e);
  process.exit(1);
});

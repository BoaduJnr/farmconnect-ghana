import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { ensureSeeded as ensureCropsSeeded } from './modules/crops/crops.service.js';
import { ensureSeeded as ensurePricesSeeded, runPriceTick } from './modules/prices/prices.service.js';

const PRICE_TICK_INTERVAL_MS = 5 * 60 * 1000;

const app = createApp();

app.listen(env.PORT, async () => {
  logger.info(`FarmConnect API listening on http://localhost:${env.PORT}`);

  await ensureCropsSeeded();
  await ensurePricesSeeded();
  setInterval(() => {
    runPriceTick().catch((err) => logger.error({ err }, '[prices] tick failed'));
  }, PRICE_TICK_INTERVAL_MS);
});

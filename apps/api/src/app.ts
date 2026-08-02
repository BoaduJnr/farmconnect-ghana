import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { advisoryRouter } from './modules/advisory/advisory.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { coopsRouter } from './modules/coops/coops.routes.js';
import { listingsRouter } from './modules/listings/listings.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { pricesRouter } from './modules/prices/prices.routes.js';
import { ratingsRouter } from './modules/ratings/ratings.routes.js';
import { smsGatewayRouter } from './modules/sms-gateway/sms-gateway.routes.js';
import { uploadsRouter } from './modules/uploads/uploads.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { UPLOADS_DIR } from './lib/uploadsDir.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  // Africa's Talking posts inbound SMS as form-encoded fields (see sms-gateway.routes.ts).
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));

  app.get('/health', async (_req, res) => {
    let db = false;
    let redisOk = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch (err) {
      logger.error({ err }, 'Postgres health check failed');
    }

    try {
      redisOk = (await redis.ping()) === 'PONG';
    } catch (err) {
      logger.error({ err }, 'Redis health check failed');
    }

    const ok = db && redisOk;
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', db, redis: redisOk });
  });

  app.use('/uploads', express.static(UPLOADS_DIR));

  app.use('/api/admin', adminRouter);
  app.use('/api/advisory', advisoryRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/coops', coopsRouter);
  app.use('/api/listings', listingsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/prices', pricesRouter);
  app.use('/api/ratings', ratingsRouter);
  app.use('/api/sms', smsGatewayRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/users', usersRouter);

  // Protected smoke-test route proving the auth middleware works end-to-end (Phase 1 verification).
  app.get('/api/protected/ping', requireAuth, (req, res) => {
    res.status(200).json({ message: 'pong', userId: req.user!.id, role: req.user!.role });
  });

  app.use(errorMiddleware);

  return app;
}

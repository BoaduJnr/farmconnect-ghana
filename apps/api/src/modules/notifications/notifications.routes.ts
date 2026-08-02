import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as notificationsController from './notifications.controller.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', asyncHandler(notificationsController.list));
notificationsRouter.post('/:id/read', asyncHandler(notificationsController.markRead));

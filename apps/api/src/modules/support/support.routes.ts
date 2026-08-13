import { Router } from 'express';
import { sendSupportMessageSchema } from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import * as supportController from './support.controller.js';

export const supportRouter = Router();

supportRouter.use(requireAuth);

supportRouter.get('/messages', asyncHandler(supportController.getMyThread));
supportRouter.post(
  '/messages',
  validateBody(sendSupportMessageSchema),
  asyncHandler(supportController.sendMessage),
);

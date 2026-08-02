import { Router } from 'express';
import { Role, updateMomoSchema } from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import * as usersController from './users.controller.js';

export const usersRouter = Router();

usersRouter.patch(
  '/me/momo',
  requireAuth,
  requireRole(Role.FARMER),
  validateBody(updateMomoSchema),
  asyncHandler(usersController.updateMomo),
);

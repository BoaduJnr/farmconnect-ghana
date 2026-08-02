import { Router } from 'express';
import { createCoopSchema, joinCoopSchema, Role } from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import * as coopsController from './coops.controller.js';

export const coopsRouter = Router();

coopsRouter.use(requireAuth, requireRole(Role.FARMER));

coopsRouter.post('/', validateBody(createCoopSchema), asyncHandler(coopsController.create));
coopsRouter.post('/join', validateBody(joinCoopSchema), asyncHandler(coopsController.join));
coopsRouter.post('/leave', asyncHandler(coopsController.leave));
coopsRouter.get('/mine', asyncHandler(coopsController.mine));

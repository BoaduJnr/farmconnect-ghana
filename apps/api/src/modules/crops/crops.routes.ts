import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as cropsController from './crops.controller.js';

export const cropsRouter = Router();

cropsRouter.get('/', requireAuth, asyncHandler(cropsController.listActive));

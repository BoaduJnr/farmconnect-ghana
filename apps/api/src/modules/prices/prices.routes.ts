import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as pricesController from './prices.controller.js';

export const pricesRouter = Router();

pricesRouter.get('/', requireAuth, asyncHandler(pricesController.list));

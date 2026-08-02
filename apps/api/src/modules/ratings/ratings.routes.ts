import { Router } from 'express';
import { rateOrderSchema } from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import * as ratingsController from './ratings.controller.js';

export const ratingsRouter = Router();

ratingsRouter.use(requireAuth);

ratingsRouter.post(
  '/order/:orderId',
  validateBody(rateOrderSchema),
  asyncHandler(ratingsController.rateOrder),
);

ratingsRouter.get('/order/:orderId', asyncHandler(ratingsController.getForOrder));

ratingsRouter.get('/users/:userId', asyncHandler(ratingsController.getForUser));

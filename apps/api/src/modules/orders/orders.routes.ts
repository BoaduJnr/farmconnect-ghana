import { Router } from 'express';
import { createOrderSchema, raiseDisputeSchema, rejectPaymentSchema, Role, submitPaymentSchema } from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import * as ordersController from './orders.controller.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.post(
  '/',
  requireRole(Role.BUYER),
  validateBody(createOrderSchema),
  asyncHandler(ordersController.create),
);

ordersRouter.get('/mine', asyncHandler(ordersController.listMine));

ordersRouter.get('/:id', asyncHandler(ordersController.getById));

ordersRouter.post(
  '/:id/submit-payment',
  requireRole(Role.BUYER),
  validateBody(submitPaymentSchema),
  asyncHandler(ordersController.submitPayment),
);

ordersRouter.post(
  '/:id/confirm-payment',
  requireRole(Role.FARMER),
  asyncHandler(ordersController.confirmPayment),
);

ordersRouter.post(
  '/:id/reject-payment',
  requireRole(Role.FARMER),
  validateBody(rejectPaymentSchema),
  asyncHandler(ordersController.rejectPayment),
);

ordersRouter.post(
  '/:id/dispute',
  requireRole(Role.BUYER),
  validateBody(raiseDisputeSchema),
  asyncHandler(ordersController.raiseDispute),
);

ordersRouter.post(
  '/:id/confirm-delivery',
  requireRole(Role.BUYER),
  asyncHandler(ordersController.confirmDelivery),
);

ordersRouter.post('/:id/cancel', requireRole(Role.BUYER), asyncHandler(ordersController.cancel));

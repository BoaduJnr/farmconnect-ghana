import { Router } from 'express';
import { createListingSchema, listingSearchSchema, Role, updateListingSchema } from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js';
import * as listingsController from './listings.controller.js';

export const listingsRouter = Router();

listingsRouter.use(requireAuth);

listingsRouter.post(
  '/',
  requireRole(Role.FARMER),
  validateBody(createListingSchema),
  asyncHandler(listingsController.create),
);

listingsRouter.get('/mine', requireRole(Role.FARMER), asyncHandler(listingsController.listMine));

listingsRouter.get('/', validateQuery(listingSearchSchema), asyncHandler(listingsController.search));

listingsRouter.get('/:id', asyncHandler(listingsController.getById));

listingsRouter.patch(
  '/:id',
  requireRole(Role.FARMER),
  validateBody(updateListingSchema),
  asyncHandler(listingsController.update),
);

listingsRouter.delete('/:id', requireRole(Role.FARMER), asyncHandler(listingsController.remove));

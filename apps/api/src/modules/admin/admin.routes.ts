import { Router } from 'express';
import {
  adminListListingsQuerySchema,
  adminListUsersQuerySchema,
  adminSetListingStatusSchema,
  createCropSchema,
  resolveDisputeSchema,
  Role,
  setCropActiveSchema,
  setSuspendedSchema,
  setVerifiedSchema,
} from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js';
import * as adminController from './admin.controller.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(Role.ADMIN));

adminRouter.get('/users', validateQuery(adminListUsersQuerySchema), asyncHandler(adminController.listUsers));
adminRouter.post(
  '/users/:id/verify',
  validateBody(setVerifiedSchema),
  asyncHandler(adminController.setVerified),
);
adminRouter.post(
  '/users/:id/suspend',
  validateBody(setSuspendedSchema),
  asyncHandler(adminController.setSuspended),
);

adminRouter.get(
  '/listings',
  validateQuery(adminListListingsQuerySchema),
  asyncHandler(adminController.listListings),
);
adminRouter.post(
  '/listings/:id/status',
  validateBody(adminSetListingStatusSchema),
  asyncHandler(adminController.setListingStatus),
);

adminRouter.get('/orders/disputed', asyncHandler(adminController.listDisputedOrders));
adminRouter.post(
  '/orders/:id/resolve-dispute',
  validateBody(resolveDisputeSchema),
  asyncHandler(adminController.resolveDispute),
);

adminRouter.get('/crops', asyncHandler(adminController.listCrops));
adminRouter.post('/crops', validateBody(createCropSchema), asyncHandler(adminController.createCrop));
adminRouter.post(
  '/crops/:key/status',
  validateBody(setCropActiveSchema),
  asyncHandler(adminController.setCropActive),
);

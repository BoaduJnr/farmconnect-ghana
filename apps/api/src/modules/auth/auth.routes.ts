import { Router } from 'express';
import { otpRequestSchema, otpVerifySchema } from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import * as authController from './auth.controller.js';

export const authRouter = Router();

authRouter.post(
  '/otp/request',
  validateBody(otpRequestSchema),
  asyncHandler(authController.requestOtp),
);

authRouter.post(
  '/otp/verify',
  validateBody(otpVerifySchema),
  asyncHandler(authController.verifyOtp),
);

authRouter.post(
  '/role',
  validateBody(authController.schemas.roleRequestSchema),
  asyncHandler(authController.selectRole),
);

authRouter.post(
  '/refresh',
  validateBody(authController.schemas.refreshSchema),
  asyncHandler(authController.refresh),
);

authRouter.post(
  '/logout',
  validateBody(authController.schemas.refreshSchema),
  asyncHandler(authController.logout),
);

authRouter.get('/me', requireAuth, asyncHandler(authController.me));

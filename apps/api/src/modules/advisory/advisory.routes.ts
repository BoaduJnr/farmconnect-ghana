import { Router } from 'express';
import multer from 'multer';
import { sendAdvisoryMessageSchema } from '@farmconnect/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import * as advisoryController from './advisory.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

export const advisoryRouter = Router();

advisoryRouter.use(requireAuth);

advisoryRouter.get('/messages', asyncHandler(advisoryController.getHistory));

advisoryRouter.post(
  '/messages',
  validateBody(sendAdvisoryMessageSchema),
  asyncHandler(advisoryController.sendMessage),
);

advisoryRouter.post('/photo', upload.single('photo'), asyncHandler(advisoryController.sendPhoto));

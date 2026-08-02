import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { UPLOADS_DIR } from '../../lib/uploadsDir.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

export const uploadsRouter = Router();

// Resized to a max 1600px long edge and re-encoded as JPEG — keeps listing/pest-ID photos
// small on 3G connections regardless of what the camera/phone originally produced.
uploadsRouter.post(
  '/photo',
  requireAuth,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No photo uploaded (expected multipart field "photo")' });
      return;
    }

    const filename = `${randomUUID()}.jpg`;
    await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(path.join(UPLOADS_DIR, filename));

    res.status(201).json({ url: `/uploads/${filename}` });
  }),
);

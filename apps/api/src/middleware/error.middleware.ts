import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';

 
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, 'Unhandled request error');
  res.status(500).json({ error: 'InternalServerError' });
}

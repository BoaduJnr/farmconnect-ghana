import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'ValidationError', details: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Parses/validates req.query (can't reassign req.query directly on newer Express/Node typings —
 * stash the parsed result on req.validatedQuery instead). */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: 'ValidationError', details: result.error.flatten() });
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}

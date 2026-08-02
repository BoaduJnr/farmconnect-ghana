import type { Request, Response } from 'express';
import type { RateOrderInput } from '@farmconnect/shared';
import * as ratingsService from './ratings.service.js';
import {
  AlreadyRatedError,
  ForbiddenRatingError,
  OrderNotFoundError,
  OrderNotRatableError,
} from './ratings.service.js';

function handleKnownErrors(err: unknown, res: Response): boolean {
  if (err instanceof OrderNotFoundError) {
    res.status(404).json({ error: err.message });
    return true;
  }
  if (err instanceof ForbiddenRatingError) {
    res.status(403).json({ error: err.message });
    return true;
  }
  if (err instanceof OrderNotRatableError || err instanceof AlreadyRatedError) {
    res.status(409).json({ error: err.message });
    return true;
  }
  return false;
}

export async function rateOrder(req: Request, res: Response) {
  const input = req.body as RateOrderInput;
  try {
    const rating = await ratingsService.rateOrder(req.params.orderId, req.user!.id, input);
    res.status(201).json({ rating });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function getForOrder(req: Request, res: Response) {
  try {
    const result = await ratingsService.getForOrder(req.params.orderId, req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function getForUser(req: Request, res: Response) {
  const ratings = await ratingsService.getForUser(req.params.userId);
  res.status(200).json({ ratings });
}

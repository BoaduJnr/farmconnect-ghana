import type { Request, Response } from 'express';
import type { CreateCoopInput, JoinCoopInput } from '@farmconnect/shared';
import * as coopsService from './coops.service.js';
import { AlreadyInCoopError, CoopNotFoundError, NotInCoopError } from './coops.service.js';

function handleKnownErrors(err: unknown, res: Response): boolean {
  if (err instanceof AlreadyInCoopError) {
    res.status(409).json({ error: err.message });
    return true;
  }
  if (err instanceof CoopNotFoundError) {
    res.status(404).json({ error: err.message });
    return true;
  }
  if (err instanceof NotInCoopError) {
    res.status(400).json({ error: err.message });
    return true;
  }
  return false;
}

export async function create(req: Request, res: Response) {
  const input = req.body as CreateCoopInput;
  try {
    const coop = await coopsService.createCoop(req.user!.id, input);
    res.status(201).json({ coop });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function join(req: Request, res: Response) {
  const input = req.body as JoinCoopInput;
  try {
    const coop = await coopsService.joinCoop(req.user!.id, input);
    res.status(200).json({ coop });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function leave(req: Request, res: Response) {
  try {
    await coopsService.leaveCoop(req.user!.id);
    res.status(204).send();
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function mine(req: Request, res: Response) {
  const coop = await coopsService.getMine(req.user!.id);
  res.status(200).json({ coop });
}

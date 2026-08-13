import type { Request, Response } from 'express';
import type {
  AdminListListingsQuery,
  AdminListUsersQuery,
  AdminSetListingStatusInput,
  CreateCropInput,
  ResolveDisputeInput,
  SetCropActiveInput,
  SetSuspendedInput,
  SetVerifiedInput,
} from '@farmconnect/shared';
import { CropAlreadyExistsError, CropNotFoundError } from '../crops/crops.service.js';
import { InvalidOrderStateError, OrderNotFoundError } from '../orders/orders.service.js';
import * as adminService from './admin.service.js';

function handleKnownErrors(err: unknown, res: Response): boolean {
  if (err instanceof OrderNotFoundError || err instanceof CropNotFoundError) {
    res.status(404).json({ error: err.message });
    return true;
  }
  if (err instanceof InvalidOrderStateError) {
    res.status(409).json({ error: err.message });
    return true;
  }
  if (err instanceof CropAlreadyExistsError) {
    res.status(409).json({ error: err.message });
    return true;
  }
  return false;
}

export async function listUsers(req: Request, res: Response) {
  const { role } = req.validatedQuery as AdminListUsersQuery;
  const users = await adminService.listUsers(role);
  res.status(200).json({ users });
}

export async function setVerified(req: Request, res: Response) {
  const { isVerified } = req.body as SetVerifiedInput;
  const user = await adminService.setVerified(req.params.id, isVerified);
  res.status(200).json({ user });
}

export async function setSuspended(req: Request, res: Response) {
  const { isSuspended } = req.body as SetSuspendedInput;
  const user = await adminService.setSuspended(req.params.id, isSuspended);
  res.status(200).json({ user });
}

export async function listListings(req: Request, res: Response) {
  const { status } = req.validatedQuery as AdminListListingsQuery;
  const listings = await adminService.listListings(status);
  res.status(200).json({ listings });
}

export async function setListingStatus(req: Request, res: Response) {
  const { status } = req.body as AdminSetListingStatusInput;
  const listing = await adminService.setListingStatus(req.params.id, status);
  res.status(200).json({ listing });
}

export async function listDisputedOrders(_req: Request, res: Response) {
  const orders = await adminService.listDisputedOrders();
  res.status(200).json({ orders });
}

export async function resolveDispute(req: Request, res: Response) {
  const { resolution, note } = req.body as ResolveDisputeInput;
  try {
    const order = await adminService.resolveDispute(req.params.id, resolution, note);
    res.status(200).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function listCrops(_req: Request, res: Response) {
  const crops = await adminService.listCrops();
  res.status(200).json({ crops });
}

export async function createCrop(req: Request, res: Response) {
  const input = req.body as CreateCropInput;
  try {
    const crop = await adminService.createCrop(input);
    res.status(201).json({ crop });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function setCropActive(req: Request, res: Response) {
  const { isActive } = req.body as SetCropActiveInput;
  try {
    const crop = await adminService.setCropActive(req.params.key, isActive);
    res.status(200).json({ crop });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

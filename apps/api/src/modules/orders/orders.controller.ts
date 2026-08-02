import type { Request, Response } from 'express';
import type { CreateOrderInput, RaiseDisputeInput, RejectPaymentInput, SubmitPaymentInput } from '@farmconnect/shared';
import { Role } from '@farmconnect/shared';
import { FarmerMomoNotSetupError } from '../listings/listings.service.js';
import * as ordersService from './orders.service.js';
import {
  ForbiddenOrderAccessError,
  InvalidOrderStateError,
  ListingNotAvailableError,
  OrderNotFoundError,
  QuantityExceedsListingError,
} from './orders.service.js';

function handleKnownErrors(err: unknown, res: Response): boolean {
  if (
    err instanceof ListingNotAvailableError ||
    err instanceof QuantityExceedsListingError ||
    err instanceof FarmerMomoNotSetupError
  ) {
    res.status(400).json({ error: err.message });
    return true;
  }
  if (err instanceof ForbiddenOrderAccessError) {
    res.status(403).json({ error: err.message });
    return true;
  }
  if (err instanceof OrderNotFoundError) {
    res.status(404).json({ error: err.message });
    return true;
  }
  if (err instanceof InvalidOrderStateError) {
    res.status(409).json({ error: err.message });
    return true;
  }
  return false;
}

export async function create(req: Request, res: Response) {
  const input = req.body as CreateOrderInput;
  try {
    const order = await ordersService.createOrder(req.user!.id, input);
    res.status(201).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function listMine(req: Request, res: Response) {
  const role = req.user!.role === Role.FARMER ? 'FARMER' : 'BUYER';
  const orders = await ordersService.listMine(req.user!.id, role);
  res.status(200).json({ orders });
}

export async function getById(req: Request, res: Response) {
  try {
    const order = await ordersService.getById(req.params.id, req.user!.id);
    res.status(200).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function submitPayment(req: Request, res: Response) {
  const input = req.body as SubmitPaymentInput;
  try {
    const order = await ordersService.submitPayment(req.params.id, req.user!.id, input);
    res.status(200).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function confirmPayment(req: Request, res: Response) {
  try {
    const order = await ordersService.confirmPayment(req.params.id, req.user!.id);
    res.status(200).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function rejectPayment(req: Request, res: Response) {
  const input = req.body as RejectPaymentInput;
  try {
    const order = await ordersService.rejectPayment(req.params.id, req.user!.id, input);
    res.status(200).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function raiseDispute(req: Request, res: Response) {
  const input = req.body as RaiseDisputeInput;
  try {
    const order = await ordersService.raiseDispute(req.params.id, req.user!.id, input);
    res.status(200).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function confirmDelivery(req: Request, res: Response) {
  try {
    const order = await ordersService.confirmDelivery(req.params.id, req.user!.id);
    res.status(200).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function cancel(req: Request, res: Response) {
  try {
    const order = await ordersService.cancelOrder(req.params.id, req.user!.id);
    res.status(200).json({ order });
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

import type { Request, Response } from 'express';
import type { CreateListingInput, ListingSearchInput, UpdateListingInput } from '@farmconnect/shared';
import * as listingsService from './listings.service.js';
import {
  FarmerMomoNotSetupError,
  InvalidCropTypeError,
  ListingNotFoundError,
  NotListingOwnerError,
} from './listings.service.js';

export async function create(req: Request, res: Response) {
  const input = req.body as CreateListingInput;
  try {
    const listing = await listingsService.create(req.user!.id, input);
    res.status(201).json({ listing });
  } catch (err) {
    if (err instanceof FarmerMomoNotSetupError || err instanceof InvalidCropTypeError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function listMine(req: Request, res: Response) {
  const listings = await listingsService.listMine(req.user!.id);
  res.status(200).json({ listings });
}

export async function getById(req: Request, res: Response) {
  try {
    const listing = await listingsService.getById(req.params.id);
    res.status(200).json({ listing });
  } catch (err) {
    if (err instanceof ListingNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function update(req: Request, res: Response) {
  const input = req.body as UpdateListingInput;
  try {
    const listing = await listingsService.update(req.params.id, req.user!.id, input);
    res.status(200).json({ listing });
  } catch (err) {
    if (err instanceof ListingNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof NotListingOwnerError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const listing = await listingsService.remove(req.params.id, req.user!.id);
    res.status(200).json({ listing });
  } catch (err) {
    if (err instanceof ListingNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof NotListingOwnerError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function search(req: Request, res: Response) {
  const params = req.validatedQuery as ListingSearchInput;
  const result = await listingsService.search(params);
  res.status(200).json(result);
}

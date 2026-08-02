import type { Request, Response } from 'express';
import * as pricesService from './prices.service.js';

export async function list(_req: Request, res: Response) {
  const prices = await pricesService.getLatestPrices();
  res.status(200).json({ prices });
}

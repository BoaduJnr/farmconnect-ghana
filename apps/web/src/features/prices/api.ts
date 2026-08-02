import { apiClient } from '../../lib/apiClient';
import type { PriceRow } from './types';

export async function getPrices(): Promise<PriceRow[]> {
  const { data } = await apiClient.get('/prices');
  return data.prices;
}

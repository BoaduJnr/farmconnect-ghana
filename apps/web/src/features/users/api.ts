import type { MomoProvider } from '@farmconnect/shared';
import { apiClient } from '../../lib/apiClient';

export interface MomoDetails {
  momoProvider: MomoProvider;
  momoPhone: string;
  momoAccountName: string;
}

export async function updateMomoDetails(details: MomoDetails): Promise<MomoDetails> {
  const { data } = await apiClient.patch('/users/me/momo', details);
  return data;
}

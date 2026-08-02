import { apiClient } from '../../lib/apiClient';
import type { Coop } from './types';

export async function getMyCoop(): Promise<Coop | null> {
  const { data } = await apiClient.get('/coops/mine');
  return data.coop;
}

export async function createCoop(name: string): Promise<Coop> {
  const { data } = await apiClient.post('/coops', { name });
  return data.coop;
}

export async function joinCoop(joinCode: string): Promise<Coop> {
  const { data } = await apiClient.post('/coops/join', { joinCode });
  return data.coop;
}

export async function leaveCoop(): Promise<void> {
  await apiClient.post('/coops/leave');
}

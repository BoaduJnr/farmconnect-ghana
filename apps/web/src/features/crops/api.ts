import type { CreateCropInput, CropMeta } from '@farmconnect/shared';
import { apiClient } from '../../lib/apiClient';

export async function listCrops(): Promise<CropMeta[]> {
  const { data } = await apiClient.get('/crops');
  return data.crops;
}

export async function listAllCropsAdmin(): Promise<CropMeta[]> {
  const { data } = await apiClient.get('/admin/crops');
  return data.crops;
}

export async function createCrop(input: CreateCropInput): Promise<CropMeta> {
  const { data } = await apiClient.post('/admin/crops', input);
  return data.crop;
}

export async function setCropActive(key: string, isActive: boolean): Promise<CropMeta> {
  const { data } = await apiClient.post(`/admin/crops/${key}/status`, { isActive });
  return data.crop;
}

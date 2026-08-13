import { useQuery } from '@tanstack/react-query';
import { listCrops } from './api';

/** The active crop catalog, shared via React Query's cache — one network call no matter how
 * many components on a page call this. Crops rarely change, so a longer staleTime is fine;
 * admin activate/deactivate/create still invalidate ['crops'] immediately (see admin/Crops.tsx). */
export function useCrops() {
  return useQuery({
    queryKey: ['crops'],
    queryFn: listCrops,
    staleTime: 5 * 60 * 1000,
  });
}

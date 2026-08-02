import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListingStatus } from '@farmconnect/shared';
import { AdminLayout } from '../../components/AdminLayout';
import { cropEmoji, cropName } from '../../lib/cropDisplay';
import { listListings, setListingStatus } from '../../features/admin/api';

const STATUS_FILTERS: { label: string; value: ListingStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Active', value: ListingStatus.ACTIVE },
  { label: 'Pending', value: ListingStatus.PENDING },
  { label: 'Sold', value: ListingStatus.SOLD },
  { label: 'Removed', value: ListingStatus.REMOVED },
];

export default function AdminListings() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ListingStatus | undefined>(undefined);

  const { data: listings, isLoading } = useQuery({
    queryKey: ['admin', 'listings', statusFilter],
    queryFn: () => listListings(statusFilter),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'REMOVED' }) => setListingStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] }),
  });

  return (
    <AdminLayout>
      <div className="fc-scroll mb-4 flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className="flex-none rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold"
              style={{
                background: active ? '#1B7A3D' : '#fff',
                color: active ? '#fff' : '#5C6B61',
                borderColor: active ? '#1B7A3D' : '#E1E8DE',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5">
        {isLoading && <div className="text-sm text-muted">…</div>}
        {listings?.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-[#ECF0E9] bg-white p-3.5">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-bg text-xl">
              {cropEmoji(l.cropType)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-ink">{cropName(l.cropType, 'en')}</div>
              <div className="mt-0.5 text-[12px] text-muted">
                {l.farmer.name ?? l.farmer.phone} · {l.regionLabel} · {l.status}
              </div>
            </div>
            {l.status === 'REMOVED' ? (
              <button
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: l.id, status: 'ACTIVE' })}
                className="h-9 flex-none rounded-xl bg-brand-surface px-3 text-[12px] font-bold text-brand disabled:opacity-50"
              >
                Reactivate
              </button>
            ) : (
              <button
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: l.id, status: 'REMOVED' })}
                className="h-9 flex-none rounded-xl bg-[#F7E5E5] px-3 text-[12px] font-bold text-[#C0413A] disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

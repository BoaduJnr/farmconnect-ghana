import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { cropEmoji, cropName } from '../../lib/cropDisplay';
import { listDisputedOrders, resolveDispute } from '../../features/admin/api';

export default function AdminDisputes() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: listDisputedOrders,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: 'uphold_payment' | 'uphold_rejection' }) =>
      resolveDispute(id, resolution, notes[id] || undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] }),
  });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-3">
        {isLoading && <div className="text-sm text-muted">…</div>}
        {!isLoading && orders?.length === 0 && (
          <div className="text-sm text-muted">No disputes waiting for review.</div>
        )}
        {orders?.map((o) => (
          <div key={o.id} className="rounded-2xl border border-[#ECF0E9] bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-bg text-xl">
                {cropEmoji(o.cropType)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-bold text-ink">
                  {cropName(o.cropType, 'en')} · ₵{o.total.toFixed(2)}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">Order {o.id.slice(-6)}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-bg p-3 text-[12.5px] text-ink">
              <div>
                <span className="font-bold">Transaction ID:</span> {o.transactionId ?? '—'}
              </div>
              {o.paymentRejectedNote && (
                <div className="mt-1">
                  <span className="font-bold">Farmer's rejection note:</span> {o.paymentRejectedNote}
                </div>
              )}
              <div className="mt-1">
                <span className="font-bold">Buyer's dispute reason:</span> {o.disputeReason}
              </div>
            </div>

            <textarea
              value={notes[o.id] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))}
              placeholder="Resolution note (optional)"
              rows={2}
              className="mt-2.5 w-full resize-none rounded-xl border-[1.5px] border-[#E1E8DE] bg-white p-2.5 text-[13px] text-ink outline-none focus:border-brand placeholder:text-[#9aa69d]"
            />

            <div className="mt-2.5 flex gap-2">
              <button
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate({ id: o.id, resolution: 'uphold_payment' })}
                className="h-10 flex-1 rounded-xl bg-brand text-[12.5px] font-bold text-white disabled:opacity-50"
              >
                Confirm buyer's payment
              </button>
              <button
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate({ id: o.id, resolution: 'uphold_rejection' })}
                className="h-10 flex-1 rounded-xl bg-[#F7E5E5] text-[12.5px] font-bold text-[#C0413A] disabled:opacity-50"
              >
                Uphold farmer's rejection
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role } from '@farmconnect/shared';
import { AdminLayout } from '../../components/AdminLayout';
import { listUsers, setUserSuspended, setUserVerified } from '../../features/admin/api';

const ROLE_FILTERS: { label: string; value: Role | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Farmers', value: Role.FARMER },
  { label: 'Buyers', value: Role.BUYER },
];

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<Role | undefined>(undefined);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users', roleFilter],
    queryFn: () => listUsers(roleFilter),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  }

  const verifyMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) => setUserVerified(id, isVerified),
    onSuccess: invalidate,
  });
  const suspendMutation = useMutation({
    mutationFn: ({ id, isSuspended }: { id: string; isSuspended: boolean }) => setUserSuspended(id, isSuspended),
    onSuccess: invalidate,
  });

  return (
    <AdminLayout>
      <div className="mb-4 flex gap-2">
        {ROLE_FILTERS.map((f) => {
          const active = roleFilter === f.value;
          return (
            <button
              key={f.label}
              onClick={() => setRoleFilter(f.value)}
              className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold"
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
        {users?.map((u) => (
          <div key={u.id} className="rounded-2xl border border-[#ECF0E9] bg-white p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14.5px] font-bold text-ink">
                  {u.name ?? u.phone} <span className="text-[11px] font-semibold text-muted">({u.role})</span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {u.phone} · ⭐ {u.trustScore.toFixed(1)} ({u.ratingCount})
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-[11px] font-bold">
                {u.isVerified && <span style={{ color: '#1B7A3D' }}>✔️ Verified</span>}
                {u.isSuspended && <span style={{ color: '#C0413A' }}>⛔ Suspended</span>}
              </div>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate({ id: u.id, isVerified: !u.isVerified })}
                className="h-9 flex-1 rounded-xl bg-brand-surface text-[12.5px] font-bold text-brand disabled:opacity-50"
              >
                {u.isVerified ? 'Unverify' : 'Verify'}
              </button>
              <button
                disabled={suspendMutation.isPending}
                onClick={() => suspendMutation.mutate({ id: u.id, isSuspended: !u.isSuspended })}
                className="h-9 flex-1 rounded-xl text-[12.5px] font-bold disabled:opacity-50"
                style={{
                  background: u.isSuspended ? '#EAF4EC' : '#F7E5E5',
                  color: u.isSuspended ? '#1B7A3D' : '#C0413A',
                }}
              >
                {u.isSuspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

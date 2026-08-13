import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { listInboxAdmin } from '../../features/support/api';

export default function AdminSupport() {
  const navigate = useNavigate();

  const { data: inbox, isLoading } = useQuery({
    queryKey: ['admin', 'support'],
    queryFn: listInboxAdmin,
    refetchInterval: 30_000,
  });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-2.5">
        {isLoading && <div className="text-sm text-muted">…</div>}
        {!isLoading && inbox?.length === 0 && (
          <div className="text-sm text-muted">No support messages yet.</div>
        )}
        {inbox?.map((entry) => (
          <button
            key={entry.userId}
            type="button"
            onClick={() => navigate(`/admin/support/${entry.userId}`)}
            className="flex items-start gap-3 rounded-2xl border border-[#ECF0E9] bg-white p-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
                {entry.userName ?? entry.userPhone}
                <span className="text-[11px] font-semibold text-muted">({entry.userRole})</span>
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-muted">{entry.lastMessage}</div>
              <div className="font-num mt-1 text-[11px] text-[#b3bdb4]">
                {new Date(entry.lastMessageAt).toLocaleString()}
              </div>
            </div>
            {entry.unreadCount > 0 && (
              <span className="flex h-6 min-w-6 flex-none items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                {entry.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </AdminLayout>
  );
}

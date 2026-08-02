import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead } from '../features/notifications/api';

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  async function handleOpen(id: string, read: boolean) {
    if (!read) {
      await markNotificationRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex items-center gap-3 border-b border-[#EEF1EB] bg-white px-[18px] pb-3.5 pt-[50px]">
        <button onClick={() => navigate(-1)} aria-label={t('backAria')} className="text-2xl leading-none text-ink">
          ‹
        </button>
        <div className="text-base font-extrabold text-ink">{t('notificationsTitle')}</div>
      </div>

      <div className="flex flex-col gap-2.5 p-[18px]">
        {isLoading && <div className="text-sm text-muted">…</div>}
        {!isLoading && data?.notifications.length === 0 && (
          <div className="text-sm text-muted">{t('notificationsEmpty')}</div>
        )}
        {data?.notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleOpen(n.id, n.read)}
            className="flex items-start gap-3 rounded-2xl border border-[#ECF0E9] bg-white p-3.5 text-left shadow-sm"
            style={{ opacity: n.read ? 0.6 : 1 }}
          >
            <span
              className="mt-1.5 h-2 w-2 flex-none rounded-full"
              style={{ background: n.read ? 'transparent' : '#1B7A3D' }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-bold text-ink">{n.title}</div>
              <div className="mt-0.5 text-[13px] text-[#7c887f]">{n.body}</div>
              <div className="font-num mt-1 text-[11px] text-[#b3bdb4]">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

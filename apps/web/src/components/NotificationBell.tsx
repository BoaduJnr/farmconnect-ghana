import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '../features/notifications/api';

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30_000,
  });

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="fixed right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-md"
      aria-label={t('notificationsAria')}
    >
      🔔
      {unreadCount > 0 && (
        <span className="font-num absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C63A3A] px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

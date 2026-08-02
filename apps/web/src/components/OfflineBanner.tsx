import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../lib/useOnlineStatus';

export function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="flex-none bg-[#9A6B12] px-4 py-2 text-center text-[12.5px] font-semibold text-white"
    >
      {t('offlineBanner')}
    </div>
  );
}

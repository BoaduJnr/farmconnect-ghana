import { useTranslation } from 'react-i18next';
import type { ListingStatus } from '@farmconnect/shared';

const STYLES: Record<ListingStatus, { bg: string; color: string; labelKey: string }> = {
  ACTIVE: { bg: '#E4F3E8', color: '#1B7A3D', labelKey: 'active' },
  PENDING: { bg: '#FBF1DC', color: '#9A6B12', labelKey: 'pending' },
  SOLD: { bg: '#EEF1EB', color: '#7c887f', labelKey: 'sold' },
  REMOVED: { bg: '#F7E5E5', color: '#C0413A', labelKey: 'removed' },
};

export function StatusBadge({ status }: Readonly<{ status: ListingStatus }>) {
  const { t } = useTranslation();
  const style = STYLES[status];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ background: style.bg, color: style.color }}
    >
      {t(style.labelKey)}
    </span>
  );
}

import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '@farmconnect/shared';

const STYLES: Record<OrderStatus, { bg: string; color: string; labelKey: string }> = {
  pending: { bg: '#FBF1DC', color: '#9A6B12', labelKey: 'orderPending' },
  payment_submitted: { bg: '#E7EEF8', color: '#2B5C9A', labelKey: 'orderPayment_submitted' },
  payment_rejected: { bg: '#F7E5E5', color: '#C0413A', labelKey: 'orderPayment_rejected' },
  disputed: { bg: '#FBF1DC', color: '#9A6B12', labelKey: 'orderDisputed' },
  paid: { bg: '#E4F3E8', color: '#1B7A3D', labelKey: 'orderPaid' },
  delivered: { bg: '#E4F3E8', color: '#1B7A3D', labelKey: 'orderDelivered' },
  cancelled: { bg: '#EEF1EB', color: '#7c887f', labelKey: 'orderCancelled' },
};

export function OrderStatusBadge({ status }: Readonly<{ status: OrderStatus }>) {
  const { t } = useTranslation();
  const style = STYLES[status];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: style.bg, color: style.color }}
    >
      {t(style.labelKey)}
    </span>
  );
}

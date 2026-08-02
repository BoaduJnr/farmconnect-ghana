import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@farmconnect/shared';
import { AppShell } from '../components/AppShell';
import { OrderCard } from '../components/OrderCard';
import { getMyOrders } from '../features/orders/api';
import { useAuthStore } from '../store/authStore';

export default function Orders() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role) ?? Role.BUYER;

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: getMyOrders,
  });

  return (
    <AppShell>
      <div className="px-[18px] pb-6 pt-[54px]">
        <h1 className="mb-1 text-2xl font-extrabold text-ink">{t('yourOrders')}</h1>
        <div className="mb-5 text-xs font-semibold text-muted">
          {role === Role.FARMER ? t('asFarmer') : t('asBuyer')}
        </div>

        <div className="flex flex-col gap-3">
          {isLoading && <div className="text-sm text-muted">…</div>}
          {!isLoading && orders?.length === 0 && (
            <div className="text-sm text-muted">{t('ordersEmpty')}</div>
          )}
          {orders?.map((order) => <OrderCard key={order.id} order={order} role={role} />)}
        </div>
      </div>
    </AppShell>
  );
}

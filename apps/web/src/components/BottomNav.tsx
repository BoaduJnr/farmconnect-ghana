import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Role } from '@farmconnect/shared';
import { useAuthStore } from '../store/authStore';

interface NavItem {
  icon: string;
  labelKey: string;
  path: string;
}

const FARMER_ITEMS: NavItem[] = [
  { icon: '🏠', labelKey: 'navHome', path: '/farmer/home' },
  { icon: '🌾', labelKey: 'navListings', path: '/farmer/listings' },
  { icon: '📦', labelKey: 'navOrders', path: '/orders' },
  { icon: '📈', labelKey: 'navPrices', path: '/prices' },
  { icon: '👤', labelKey: 'navProfile', path: '/profile' },
];

const BUYER_ITEMS: NavItem[] = [
  { icon: '🛒', labelKey: 'navMarket', path: '/buyer/market' },
  { icon: '📦', labelKey: 'navOrders', path: '/orders' },
  { icon: '🤖', labelKey: 'navAdvisory', path: '/advisory' },
  { icon: '📈', labelKey: 'navPrices', path: '/prices' },
  { icon: '👤', labelKey: 'navProfile', path: '/profile' },
];

export function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.user?.role);

  const items = role === Role.FARMER ? FARMER_ITEMS : BUYER_ITEMS;

  return (
    <div className="flex flex-none border-t border-[#EEF1EB] bg-white px-1 pb-2 pt-2">
      {items.map((item) => {
        const active = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-1 flex-col items-center gap-1 py-1"
            style={{ color: active ? '#1B7A3D' : '#aab4ab' }}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10.5px] font-bold tracking-tight">{t(item.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

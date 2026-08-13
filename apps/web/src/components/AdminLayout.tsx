import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { logout as logoutRequest } from '../features/auth/api';
import { useAuthStore } from '../store/authStore';

const TABS = [
  { label: 'Users', path: '/admin/users' },
  { label: 'Listings', path: '/admin/listings' },
  { label: 'Disputes', path: '/admin/disputes' },
  { label: 'Crops', path: '/admin/crops' },
  { label: 'Support', path: '/admin/support' },
  { label: 'Profile', path: '/profile' },
];

export function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshToken, clearSession } = useAuthStore();

  async function handleLogout() {
    if (refreshToken) {
      await logoutRequest(refreshToken).catch(() => {});
    }
    clearSession();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-[#EEF1EB] bg-white px-[18px] pt-[50px]">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-[19px] font-extrabold text-ink">FarmConnect Admin</h1>
          <button onClick={handleLogout} className="text-[12.5px] font-bold text-[#C0413A]">
            Log out
          </button>
        </div>
        <div className="fc-scroll flex gap-1.5 overflow-x-auto pb-3">
          {TABS.map((tab) => {
            // startsWith, not exact match -- Support has a nested thread route
            // (/admin/support/:userId) that should still highlight the Support tab.
            const active = location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex-none rounded-full px-3.5 py-2 text-[13px] font-bold"
                style={{
                  background: active ? '#1B7A3D' : '#F4F7F2',
                  color: active ? '#fff' : '#5C6B61',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-[18px] py-5">{children}</div>
    </div>
  );
}

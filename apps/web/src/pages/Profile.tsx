import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Locale, Role } from '@farmconnect/shared';
import { AdminLayout } from '../components/AdminLayout';
import { AppShell } from '../components/AppShell';
import { CoopManager } from '../components/CoopManager';
import { MomoSetup } from '../components/MomoSetup';
import { PrimaryButton } from '../components/PrimaryButton';
import { logout as logoutRequest } from '../features/auth/api';
import { fetchHealth, type HealthResponse } from '../lib/health';
import { useAuthStore } from '../store/authStore';

type HealthState = { kind: 'loading' } | { kind: 'ok'; data: HealthResponse } | { kind: 'error' };

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshToken, clearSession } = useAuthStore();
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    // System status is admin-only (see below) -- skip the network call entirely for
    // farmer/buyer, who can never see its result.
    if (user?.role !== Role.ADMIN) {
      return;
    }
    fetchHealth()
      .then((data) => setHealth({ kind: 'ok', data }))
      .catch(() => setHealth({ kind: 'error' }));
  }, [user?.role]);

  async function handleLogout() {
    if (refreshToken) {
      await logoutRequest(refreshToken).catch(() => {});
    }
    clearSession();
    navigate('/', { replace: true });
  }

  const Shell = user?.role === Role.ADMIN ? AdminLayout : AppShell;
  const roleEmoji = user?.role === Role.FARMER ? '🧑🏾‍🌾' : user?.role === Role.ADMIN ? '🛡️' : '🛒';
  const roleLabel = user?.role === Role.FARMER ? t('farmer') : user?.role === Role.ADMIN ? t('admin') : t('buyer');

  return (
    <Shell>
      <div className="rounded-b-[26px] bg-gradient-to-br from-brand to-brand-dark px-[22px] pb-[30px] pt-[54px] text-center text-white">
        <div className="mx-auto mb-3.5 flex h-20 w-20 items-center justify-center rounded-full bg-white/18 text-4xl">
          {roleEmoji}
        </div>
        <div className="text-xl font-extrabold">{user?.name ?? `+233 ${user?.phone.replace('+233', '')}`}</div>
        <div className="mt-3 inline-block rounded-full bg-white/16 px-3.5 py-1.5 text-xs font-bold">
          {roleLabel}
        </div>
      </div>

      <div className="px-[18px] py-[22px]">
        <div className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-[#9aa69d]">
          {t('language')}
        </div>
        <div className="mb-6 flex gap-2.5">
          <button
            onClick={() => i18n.changeLanguage(Locale.EN)}
            className="flex-1 rounded-2xl border-[1.5px] py-3 text-[14.5px] font-bold"
            style={{
              borderColor: i18n.language === 'en' ? '#1B7A3D' : '#E1E8DE',
              color: i18n.language === 'en' ? '#1B7A3D' : '#5C6B61',
              background: i18n.language === 'en' ? '#EAF4EC' : '#fff',
            }}
          >
            🇬🇧 {t('english')}
          </button>
          <button
            onClick={() => i18n.changeLanguage(Locale.TW)}
            className="flex-1 rounded-2xl border-[1.5px] py-3 text-[14.5px] font-bold"
            style={{
              borderColor: i18n.language === 'tw' ? '#1B7A3D' : '#E1E8DE',
              color: i18n.language === 'tw' ? '#1B7A3D' : '#5C6B61',
              background: i18n.language === 'tw' ? '#EAF4EC' : '#fff',
            }}
          >
            🇬🇭 {t('twi')}
          </button>
        </div>

        {user?.role === Role.FARMER && (
          <div className="mb-6 rounded-2xl border border-brand-surface bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm font-bold text-ink">{t('momoSetupTitle')}</div>
            <div className="mb-3.5 text-xs text-muted">{t('momoSetupSub')}</div>
            <MomoSetup />
          </div>
        )}

        {user?.role === Role.FARMER && (
          <div className="mb-6 rounded-2xl border border-brand-surface bg-white p-4 shadow-sm">
            <div className="mb-3.5 text-sm font-bold text-ink">{t('myCoopTitle')}</div>
            <CoopManager />
          </div>
        )}

        {user?.role === Role.ADMIN && (
          <div className="mb-6 rounded-2xl border border-brand-surface bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-bold text-ink">{t('healthCheckTitle')}</div>
            {health.kind === 'loading' && <div className="text-sm text-muted">…</div>}
            {health.kind === 'error' && (
              <div className="text-sm font-semibold text-red-600">{t('healthCheckFail')}</div>
            )}
            {health.kind === 'ok' && (
              <div className="flex flex-col gap-1 text-sm">
                <div
                  className={
                    health.data.status === 'ok' ? 'font-semibold text-brand' : 'font-semibold text-amber-600'
                  }
                >
                  {health.data.status === 'ok' ? t('healthCheckOk') : t('healthCheckFail')}
                </div>
                <div className="text-muted">
                  {t('postgresLabel')}: {health.data.db ? '✔' : '✘'}
                </div>
                <div className="text-muted">
                  {t('redisLabel')}: {health.data.redis ? '✔' : '✘'}
                </div>
              </div>
            )}
          </div>
        )}

        <PrimaryButton variant="ghost" onClick={handleLogout}>
          {t('logout')}
        </PrimaryButton>
      </div>
    </Shell>
  );
}

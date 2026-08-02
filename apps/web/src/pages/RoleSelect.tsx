import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Role } from '@farmconnect/shared';
import { selectRole } from '../features/auth/api';
import { roleHomePath } from '../lib/roleHome';
import { useAuthStore } from '../store/authStore';

interface RoleSelectLocationState {
  preAuthToken: string;
}

export default function RoleSelect() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const state = location.state as RoleSelectLocationState | null;

  useEffect(() => {
    if (!state?.preAuthToken) {
      navigate('/login', { replace: true });
    }
  }, [state?.preAuthToken, navigate]);

  const mutation = useMutation({
    mutationFn: (role: Role) =>
      selectRole(state!.preAuthToken, role, i18n.language === 'tw' ? 'tw' : 'en'),
    onSuccess: (result) => {
      setSession(result);
      navigate(roleHomePath(result.user), { replace: true });
    },
  });

  if (!state?.preAuthToken) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand to-brand-dark px-7 py-20 text-white">
      <h1 className="mb-2 text-[27px] font-extrabold leading-tight tracking-tight">
        {t('roleTitle')}
      </h1>
      <p className="mb-8 text-[15px] text-white/80">{t('roleSub')}</p>

      <div className="flex flex-col gap-4">
        <button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(Role.FARMER)}
          className="flex items-center gap-[18px] rounded-[20px] bg-white p-6 text-left shadow-lg disabled:opacity-60"
        >
          <div className="flex h-[58px] w-[58px] flex-none items-center justify-center rounded-2xl bg-brand-surface text-3xl">
            🧑🏾‍🌾
          </div>
          <div>
            <div className="text-lg font-extrabold text-ink">{t('farmer')}</div>
            <div className="mt-0.5 text-[13.5px] leading-snug text-muted">{t('farmerDesc')}</div>
          </div>
        </button>

        <button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(Role.BUYER)}
          className="flex items-center gap-[18px] rounded-[20px] bg-white p-6 text-left shadow-lg disabled:opacity-60"
        >
          <div className="flex h-[58px] w-[58px] flex-none items-center justify-center rounded-2xl bg-[#FBF1DC] text-3xl">
            🛒
          </div>
          <div>
            <div className="text-lg font-extrabold text-ink">{t('buyer')}</div>
            <div className="mt-0.5 text-[13.5px] leading-snug text-muted">{t('buyerDesc')}</div>
          </div>
        </button>
      </div>
    </div>
  );
}

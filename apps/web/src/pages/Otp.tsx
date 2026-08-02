import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { OtpDigitInput } from '../components/OtpDigitInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { requestOtp, verifyOtp } from '../features/auth/api';
import { roleHomePath } from '../lib/roleHome';
import { useAuthStore } from '../store/authStore';

interface OtpLocationState {
  phone: string;
  devCode?: string;
}

export default function Otp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const state = location.state as OtpLocationState | null;
  const phone = state?.phone ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState(state?.devCode);

  useEffect(() => {
    if (!state?.phone) {
      navigate('/login', { replace: true });
    }
  }, [state?.phone, navigate]);

  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp(phone, code),
    onSuccess: (result) => {
      if (result.status === 'authenticated') {
        setSession(result);
        navigate(roleHomePath(result.user), { replace: true });
      } else {
        navigate('/role', { state: { preAuthToken: result.preAuthToken }, replace: true });
      }
    },
    onError: () => setError(t('otpErrorText')),
  });

  const resendMutation = useMutation({
    mutationFn: () => requestOtp(phone),
    onSuccess: (result) => {
      setCode('');
      setError(null);
      setDevCode(result.devCode);
    },
  });

  if (!state?.phone) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg px-7 pb-9 pt-[72px]">
      <button
        onClick={() => navigate('/login')}
        className="mb-[34px] flex w-fit items-center gap-1.5 text-sm font-semibold text-muted"
      >
        ‹ {t('back')}
      </button>
      <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-ink">{t('otpTitle')}</h1>
      <p className="mb-[30px] text-[15px] leading-normal text-muted">
        {t('otpSub')} <b className="text-ink">+233 {phone}</b>
      </p>

      <OtpDigitInput value={code} onChange={setCode} />
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      {devCode && (
        <button
          type="button"
          onClick={() => setCode(devCode)}
          className="mt-3 w-fit rounded-lg bg-brand-surface px-3 py-1.5 text-sm font-semibold text-brand"
        >
          {t('devCodeLabel')}: {devCode}
        </button>
      )}

      <div className="mt-5 text-sm text-muted">
        {t('didntGet')}{' '}
        <button onClick={() => resendMutation.mutate()} className="font-bold text-brand">
          {t('resend')}
        </button>
      </div>

      <div className="flex-1" />
      <PrimaryButton
        disabled={code.length !== 6 || verifyMutation.isPending}
        onClick={() => {
          setError(null);
          verifyMutation.mutate();
        }}
      >
        {verifyMutation.isPending ? '…' : t('verify')}
      </PrimaryButton>
    </div>
  );
}

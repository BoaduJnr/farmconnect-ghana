import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { PhoneInput } from '../components/PhoneInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { requestOtp } from '../features/auth/api';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const digitCount = phone.replace(/\D/g, '').length;
  const phoneValid = digitCount >= 9;

  const mutation = useMutation({
    mutationFn: () => requestOtp(phone),
    onSuccess: (result) => {
      navigate('/otp', { state: { phone, devCode: result.devCode } });
    },
    onError: () => setError(t('loginErrorText')),
  });

  return (
    <div className="flex min-h-screen flex-col bg-bg px-7 pb-9 pt-[72px]">
      <button
        onClick={() => navigate(-1)}
        className="mb-[34px] flex w-fit items-center gap-1.5 text-sm font-semibold text-muted"
      >
        ‹ {t('back')}
      </button>
      <div className="mb-[22px] flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-brand-surface text-2xl">
        📱
      </div>
      <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-ink">{t('loginTitle')}</h1>
      <p className="mb-[30px] text-[15px] leading-normal text-muted">{t('loginSub')}</p>

      <label htmlFor="login-phone" className="mb-2 text-[13px] font-semibold text-muted">
        {t('phoneLabel')}
      </label>
      <PhoneInput id="login-phone" value={phone} onChange={setPhone} />
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

      <div className="flex-1" />
      <PrimaryButton
        disabled={!phoneValid || mutation.isPending}
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
      >
        {mutation.isPending ? '…' : t('sendCode')}
      </PrimaryButton>
    </div>
  );
}

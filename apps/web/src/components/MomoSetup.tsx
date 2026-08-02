import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { MomoProvider } from '@farmconnect/shared';
import { updateMomoDetails } from '../features/users/api';
import { useAuthStore } from '../store/authStore';
import { PhoneInput } from './PhoneInput';
import { PrimaryButton } from './PrimaryButton';

const MOMO_OPTIONS: { key: MomoProvider; label: string }[] = [
  { key: MomoProvider.MTN, label: 'MTN MoMo' },
  { key: MomoProvider.TELECEL, label: 'Telecel Cash' },
  { key: MomoProvider.AIRTELTIGO, label: 'AirtelTigo Money' },
];

interface MomoSetupProps {
  /** Swaps the "Save" button for "Continue" and fires after a successful save — used by the
   * forced first-time setup screen (see pages/farmer/MomoSetup.tsx). */
  onSaved?: () => void;
}

/** Lets a farmer link the Mobile Money number/network/account-name buyers pay directly —
 * required before they can publish a listing (no payment gateway, see plan). */
export function MomoSetup({ onSaved }: Readonly<MomoSetupProps>) {
  const { t } = useTranslation();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [provider, setProvider] = useState<MomoProvider>(MomoProvider.MTN);
  const [phone, setPhone] = useState('');
  const [accountName, setAccountName] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      updateMomoDetails({ momoProvider: provider, momoPhone: phone, momoAccountName: accountName }),
    onSuccess: (data) => {
      updateUser(data);
      onSaved?.();
    },
  });

  const canSave = phone.replace(/\D/g, '').length >= 9 && accountName.trim().length > 0;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex gap-2">
        {MOMO_OPTIONS.map((opt) => {
          const active = provider === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setProvider(opt.key)}
              className="flex-1 rounded-xl border-[1.5px] px-2 py-2 text-[11px] font-bold"
              style={{
                borderColor: active ? '#1B7A3D' : '#E1E8DE',
                background: active ? '#EAF4EC' : '#fff',
                color: active ? '#1B7A3D' : '#5C6B61',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <PhoneInput id="momo-phone" ariaLabel={t('momoPhoneLabel')} value={phone} onChange={setPhone} />

      <div>
        <label htmlFor="momo-account-name" className="mb-1.5 block text-[13px] font-bold text-muted">
          {t('momoAccountNameLabel')}
        </label>
        <input
          id="momo-account-name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder={t('momoAccountNamePlaceholder')}
          className="h-14 w-full rounded-2xl border-[1.5px] border-[#E1E8DE] bg-white px-3.5 text-[15px] font-semibold text-ink outline-none focus:border-brand placeholder:font-normal placeholder:text-[#9aa69d]"
        />
      </div>

      <PrimaryButton disabled={!canSave || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? '…' : onSaved ? t('continueButton') : t('saveMomo')}
      </PrimaryButton>
      {mutation.isSuccess && !onSaved && (
        <div className="text-center text-xs font-semibold text-brand">{t('momoSaved')}</div>
      )}
    </div>
  );
}

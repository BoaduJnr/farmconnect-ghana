import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PrimaryButton } from '../../components/PrimaryButton';
import { cropEmoji, cropName } from '../../lib/cropDisplay';
import { MOMO_PROVIDER_LABELS } from '../../lib/momoDisplay';
import { getListingById } from '../../features/listings/api';
import { createOrder } from '../../features/orders/api';

const DELIVERY_FEE = 15;

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { listingId } = useParams<{ listingId: string }>();

  const [quantityKg, setQuantityKg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listings', 'detail', listingId],
    queryFn: () => getListingById(listingId!),
    enabled: Boolean(listingId),
  });

  const qtyNum = Number(quantityKg) || 0;
  const subtotal = listing ? qtyNum * listing.pricePerKg : 0;
  const total = subtotal + DELIVERY_FEE;
  const canOrder = qtyNum > 0 && (listing ? qtyNum <= listing.quantityKg : false);

  const mutation = useMutation({
    mutationFn: () => createOrder({ listingId: listingId!, quantityKg: qtyNum }),
    onSuccess: (order) => {
      navigate(`/orders/${order.id}/pay`, { replace: true });
    },
    onError: () => setError(t('checkoutErrorText')),
  });

  if (isLoading || !listing) {
    return <div className="min-h-screen bg-bg p-6 text-sm text-muted">…</div>;
  }

  return (
    <div className="min-h-screen bg-bg px-[22px] pb-8 pt-[58px]">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label={t('backAria')} className="text-2xl leading-none text-ink">
          ‹
        </button>
        <h1 className="text-[22px] font-extrabold text-ink">{t('checkoutTitle')}</h1>
      </div>

      <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-[#ECF0E9] bg-white p-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-bg text-2xl">
          {cropEmoji(listing.cropType)}
        </div>
        <div className="flex-1">
          <div className="font-bold text-ink">{cropName(listing.cropType, i18n.language)}</div>
          <div className="text-xs text-muted">
            {listing.quantityKg} kg {t('availableQty')} · ₵{listing.pricePerKg}/kg
          </div>
        </div>
      </div>

      <label htmlFor="checkout-quantity" className="mb-1.5 block text-[13px] font-bold text-muted">
        {t('orderQuantity')}
      </label>
      <div className="mb-5 flex h-14 items-center rounded-2xl border-[1.5px] border-[#E1E8DE] bg-white px-3.5 focus-within:border-brand">
        <input
          id="checkout-quantity"
          value={quantityKg}
          onChange={(e) => setQuantityKg(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="0"
          className="w-full flex-1 border-none text-[15px] font-semibold text-ink outline-none"
        />
        <span className="text-[13px] font-semibold text-[#9aa69d]">
          / {listing.quantityKg} kg max
        </span>
      </div>

      <div className="mb-5 rounded-2xl border border-[#ECF0E9] bg-white p-4">
        <div className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#9aa69d]">
          {t('orderSummary')}
        </div>
        <div className="mb-2.5 flex justify-between text-[14.5px] text-muted">
          <span>{t('subtotal')}</span>
          <span className="font-num font-bold text-ink">₵{subtotal.toFixed(2)}</span>
        </div>
        <div className="mb-3.5 flex justify-between text-[14.5px] text-muted">
          <span>{t('delivery')}</span>
          <span className="font-num font-bold text-ink">₵{DELIVERY_FEE.toFixed(2)}</span>
        </div>
        <div className="h-px bg-[#EEF1EB]" />
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-base font-extrabold text-ink">{t('total')}</span>
          <span className="font-num text-xl font-bold text-brand">₵{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#ECF0E9] bg-white p-4">
        <div className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#9aa69d]">
          {t('sendMoneyTitle')}
        </div>
        <div className="text-[15px] font-bold text-ink">{listing.farmer.momoAccountName}</div>
        <div className="font-num mt-0.5 text-[14px] text-muted">
          {listing.farmer.momoProvider && MOMO_PROVIDER_LABELS[listing.farmer.momoProvider]} ·{' '}
          {listing.farmer.momoPhone}
        </div>
      </div>

      <div className="mb-6 flex gap-2.5 rounded-2xl bg-brand-surface p-3.5">
        <span className="text-base">🔒</span>
        <p className="m-0 text-xs leading-relaxed text-[#3F6B4D]">{t('momoTrustNote')}</p>
      </div>

      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

      <PrimaryButton disabled={!canOrder || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? '…' : t('placeOrder')}
      </PrimaryButton>
    </div>
  );
}

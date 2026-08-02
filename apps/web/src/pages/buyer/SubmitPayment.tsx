import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '@farmconnect/shared';
import { PhoneInput } from '../../components/PhoneInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { MOMO_PROVIDER_LABELS } from '../../lib/momoDisplay';
import { cancelOrder, getOrderById, submitPayment } from '../../features/orders/api';

export default function SubmitPayment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const [buyerMomoPhone, setBuyerMomoPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => getOrderById(id!),
    enabled: Boolean(id),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitPayment(id!, { buyerMomoPhone, transactionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
      navigate('/orders', { replace: true });
    },
    onError: () => setError(t('submitPaymentErrorText')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
      navigate('/orders', { replace: true });
    },
  });

  if (isLoading || !order) {
    return <div className="min-h-screen bg-bg p-6 text-sm text-muted">…</div>;
  }

  const canResubmit = order.status === OrderStatus.PENDING || order.status === OrderStatus.PAYMENT_REJECTED;
  const canSubmit = buyerMomoPhone.replace(/\D/g, '').length >= 9 && transactionId.trim().length >= 3;

  return (
    <div className="min-h-screen bg-bg px-[22px] pb-8 pt-[58px]">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label={t('backAria')} className="text-2xl leading-none text-ink">
          ‹
        </button>
        <h1 className="text-[22px] font-extrabold text-ink">{t('sendMoneyTitle')}</h1>
      </div>

      <div className="mb-5 rounded-2xl border border-[#ECF0E9] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-bold uppercase tracking-wide text-[#9aa69d]">{t('total')}</span>
          <span className="font-num text-xl font-bold text-brand">₵{order.total.toFixed(2)}</span>
        </div>
        <div className="h-px bg-[#EEF1EB]" />
        <div className="mt-3 text-[15px] font-bold text-ink">{order.sellerMomoAccountName}</div>
        <div className="font-num mt-0.5 text-[14px] text-muted">
          {MOMO_PROVIDER_LABELS[order.sellerMomoProvider]} · {order.sellerMomoPhone}
        </div>
      </div>

      {order.status === OrderStatus.PAYMENT_REJECTED && order.paymentRejectedNote && (
        <div className="mb-5 rounded-2xl bg-[#F7E5E5] p-4 text-sm text-[#C0413A]">
          <div className="mb-1 font-bold">{t('rejectedNoteLabel')}</div>
          {order.paymentRejectedNote}
        </div>
      )}

      {!canResubmit ? (
        <div className="rounded-2xl bg-brand-surface p-4 text-center text-sm font-semibold text-brand">
          {t(`order${order.status.charAt(0).toUpperCase()}${order.status.slice(1)}`)}
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm text-muted">{t('sendMoneyInstructions')}</p>

          <label htmlFor="submit-payment-phone" className="mb-1.5 block text-[13px] font-bold text-muted">
            {t('yourMomoPhoneLabel')}
          </label>
          <div className="mb-5">
            <PhoneInput id="submit-payment-phone" value={buyerMomoPhone} onChange={setBuyerMomoPhone} />
          </div>

          <label htmlFor="submit-payment-txn" className="mb-1.5 block text-[13px] font-bold text-muted">
            {t('transactionIdLabel')}
          </label>
          <div className="mb-6 flex h-14 items-center rounded-2xl border-[1.5px] border-[#E1E8DE] bg-white px-3.5 focus-within:border-brand">
            <input
              id="submit-payment-txn"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder={t('transactionIdPlaceholder')}
              className="w-full flex-1 border-none text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-[#9aa69d]"
            />
          </div>

          {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

          <PrimaryButton
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? '…' : t('submitPaymentButton')}
          </PrimaryButton>

          {order.status === OrderStatus.PENDING && (
            <button
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="mt-4 w-full text-center text-[13px] font-bold text-red-500 disabled:opacity-50"
            >
              {t('cancelOrderButton')}
            </button>
          )}
        </>
      )}
    </div>
  );
}

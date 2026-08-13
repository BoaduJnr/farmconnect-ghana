import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderStatus, Role } from '@farmconnect/shared';
import { useCrops } from '../features/crops/useCrops';
import { cropEmoji, cropName } from '../lib/cropDisplay';
import { confirmDelivery, confirmPayment, raiseDispute, rejectPayment } from '../features/orders/api';
import type { Order } from '../features/orders/types';
import { getOrderRatings, rateOrder } from '../features/ratings/api';
import { OrderStatusBadge } from './OrderStatusBadge';
import { StarRatingInput } from './StarRatingInput';

interface OrderCardProps {
  order: Order;
  role: (typeof Role)[keyof typeof Role];
}

export function OrderCard({ order, role }: Readonly<OrderCardProps>) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: crops } = useCrops();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
  }

  const confirmDeliveryMutation = useMutation({
    mutationFn: () => confirmDelivery(order.id),
    onSuccess: invalidate,
  });
  const confirmPaymentMutation = useMutation({
    mutationFn: () => confirmPayment(order.id),
    onSuccess: invalidate,
  });
  const rejectPaymentMutation = useMutation({
    mutationFn: () => rejectPayment(order.id, rejectNote || undefined),
    onSuccess: () => {
      setShowRejectForm(false);
      invalidate();
    },
  });
  const disputeMutation = useMutation({
    mutationFn: () => raiseDispute(order.id, disputeReason),
    onSuccess: () => {
      setShowDisputeForm(false);
      invalidate();
    },
  });

  const { data: ratings } = useQuery({
    queryKey: ['ratings', 'order', order.id],
    queryFn: () => getOrderRatings(order.id),
    enabled: order.status === OrderStatus.DELIVERED,
  });
  const rateMutation = useMutation({
    mutationFn: () => rateOrder(order.id, ratingStars, ratingComment || undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ratings', 'order', order.id] }),
  });

  const isBuyer = role === Role.BUYER;
  const isFarmer = role === Role.FARMER;
  const busy =
    confirmDeliveryMutation.isPending ||
    confirmPaymentMutation.isPending ||
    rejectPaymentMutation.isPending ||
    disputeMutation.isPending;

  return (
    <div className="rounded-2xl border border-[#ECF0E9] bg-white p-4">
      <div className="flex items-center gap-3.5">
        <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-2xl bg-bg text-2xl">
          {cropEmoji(crops, order.cropType)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15.5px] font-bold text-ink">{cropName(crops, order.cropType, i18n.language)}</div>
          <div className="font-num mt-0.5 text-[12.5px] text-[#7c887f]">
            {order.quantityKg} kg · ₵{order.total.toFixed(2)}
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {isFarmer && order.status === OrderStatus.PAYMENT_SUBMITTED && (
        <div className="mt-3.5 border-t border-[#F1F4EF] pt-3.5">
          <div className="font-num text-[13px] text-muted">
            {t('transactionIdLabel')}: <span className="font-bold text-ink">{order.transactionId}</span>
          </div>
          <div className="font-num mt-0.5 text-[13px] text-muted">
            {t('yourMomoPhoneLabel')}: <span className="font-bold text-ink">{order.buyerMomoPhone}</span>
          </div>

          {!showRejectForm ? (
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy}
                onClick={() => confirmPaymentMutation.mutate()}
                className="h-11 flex-1 rounded-xl bg-brand text-[13px] font-bold text-white disabled:opacity-50"
              >
                {t('confirmPaymentButton')}
              </button>
              <button
                disabled={busy}
                onClick={() => setShowRejectForm(true)}
                className="h-11 flex-1 rounded-xl bg-[#F7E5E5] text-[13px] font-bold text-[#C0413A] disabled:opacity-50"
              >
                {t('rejectPaymentButton')}
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t('rejectionNotePlaceholder')}
                rows={2}
                className="w-full resize-none rounded-xl border-[1.5px] border-[#E1E8DE] bg-white p-2.5 text-[13px] text-ink outline-none focus:border-brand placeholder:text-[#9aa69d]"
              />
              <div className="mt-2 flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => rejectPaymentMutation.mutate()}
                  className="h-10 flex-1 rounded-xl bg-[#C0413A] text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {t('rejectPaymentButton')}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="h-10 flex-1 rounded-xl bg-bg text-[13px] font-bold text-muted"
                >
                  {t('back')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isBuyer && (order.status === OrderStatus.PENDING || order.status === OrderStatus.PAYMENT_REJECTED) && (
        <button
          onClick={() => navigate(`/orders/${order.id}/pay`)}
          className="mt-3.5 h-11 w-full rounded-xl bg-brand text-[13.5px] font-bold text-white"
        >
          {t('completePaymentButton')}
        </button>
      )}

      {isBuyer && order.status === OrderStatus.PAYMENT_REJECTED && (
        <div className="mt-2.5">
          {!showDisputeForm ? (
            <button
              onClick={() => setShowDisputeForm(true)}
              className="text-[12.5px] font-bold text-[#9A6B12] underline"
            >
              {t('disputeButton')}
            </button>
          ) : (
            <div className="mt-2">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={t('disputeReasonPlaceholder')}
                rows={2}
                className="w-full resize-none rounded-xl border-[1.5px] border-[#E1E8DE] bg-white p-2.5 text-[13px] text-ink outline-none focus:border-brand placeholder:text-[#9aa69d]"
              />
              <div className="mt-2 flex gap-2">
                <button
                  disabled={busy || disputeReason.trim().length < 3}
                  onClick={() => disputeMutation.mutate()}
                  className="h-10 flex-1 rounded-xl bg-[#9A6B12] text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {t('disputeSubmitButton')}
                </button>
                <button
                  onClick={() => setShowDisputeForm(false)}
                  className="h-10 flex-1 rounded-xl bg-bg text-[13px] font-bold text-muted"
                >
                  {t('back')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {order.status === OrderStatus.DISPUTED && (
        <div className="mt-3 text-[12.5px] text-muted">{t('disputeSubmittedNote')}</div>
      )}

      {isBuyer && order.status === OrderStatus.PAID && (
        <button
          disabled={busy}
          onClick={() => confirmDeliveryMutation.mutate()}
          className="mt-3.5 h-11 w-full rounded-xl bg-brand-surface text-[13.5px] font-bold text-brand disabled:opacity-50"
        >
          {t('confirmReceipt')}
        </button>
      )}

      {order.status === OrderStatus.DELIVERED && (
        <div className="mt-3.5 border-t border-[#F1F4EF] pt-3.5">
          {ratings?.myRating ? (
            <div className="text-[12.5px] text-muted">
              {t('youRated')}:{' '}
              <span style={{ color: '#F0A63C' }}>{'★'.repeat(ratings.myRating.stars)}</span>
              <span style={{ color: '#DDE3D9' }}>{'★'.repeat(5 - ratings.myRating.stars)}</span>
            </div>
          ) : (
            <div>
              <div className="mb-2 text-[13px] font-bold text-ink">{t('rateTransaction')}</div>
              <StarRatingInput value={ratingStars} onChange={setRatingStars} />
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder={t('ratingCommentPlaceholder')}
                rows={2}
                className="mt-2 w-full resize-none rounded-xl border-[1.5px] border-[#E1E8DE] bg-white p-2.5 text-[13px] text-ink outline-none focus:border-brand placeholder:text-[#9aa69d]"
              />
              <button
                disabled={ratingStars === 0 || rateMutation.isPending}
                onClick={() => rateMutation.mutate()}
                className="mt-2 h-10 w-full rounded-xl bg-brand text-[13px] font-bold text-white disabled:opacity-50"
              >
                {t('rateSubmitButton')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

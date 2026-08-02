import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cropEmoji, cropName } from '../../lib/cropDisplay';
import { getListingById } from '../../features/listings/api';

export default function ListingDetail() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listings', 'detail', id],
    queryFn: () => getListingById(id!),
    enabled: Boolean(id),
  });

  if (isLoading || !listing) {
    return <div className="min-h-screen bg-bg p-6 text-sm text-muted">…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="rounded-b-[26px] bg-gradient-to-br from-brand to-brand-dark px-[22px] pb-[30px] pt-[54px] text-white">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-1.5 text-sm font-semibold"
        >
          ‹ {t('back')}
        </button>
        <div className="flex items-center gap-[18px]">
          <div className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[22px] bg-white/15 text-[46px]">
            {cropEmoji(listing.cropType)}
          </div>
          <div>
            <div className="flex items-center gap-2 text-2xl font-extrabold">
              {cropName(listing.cropType, i18n.language)}
              {listing.coop && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">
                  {listing.coop.name}
                </span>
              )}
            </div>
            <div className="font-num mt-1 text-[15px] text-white/85">
              {listing.quantityKg} kg {t('availableQty')}
            </div>
          </div>
        </div>
      </div>

      <div className="px-[22px] pb-7 pt-[22px]">
        <div className="mb-[22px] flex gap-3">
          <div className="flex-1 rounded-2xl border border-[#ECF0E9] bg-white p-4">
            <div className="font-num text-[22px] font-bold text-brand">₵{listing.pricePerKg}</div>
            <div className="mt-0.5 text-xs text-[#7c887f]">{t('perKgFull')}</div>
          </div>
          <div className="flex-1 rounded-2xl border border-[#ECF0E9] bg-white p-4">
            <div className="text-[15px] font-bold text-ink">📍 {listing.regionLabel}</div>
            <div className="mt-0.5 text-xs text-[#7c887f]">
              {new Date(listing.availableFrom).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="mb-3 text-[15px] font-extrabold text-ink">{t('about')}</div>
        <div className="mb-6 flex items-center gap-3.5 rounded-[18px] border border-[#ECF0E9] bg-white p-4">
          <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-full bg-brand-surface text-[22px]">
            🧑🏾‍🌾
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[15.5px] font-bold text-ink">
              {listing.farmer.name}
              {listing.farmer.isVerified && <span title={t('verifiedBadge')}>✔️</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[15px] font-bold text-ink">⭐ {listing.farmer.trustScore.toFixed(1)}</div>
            <div className="text-[11px] text-[#9aa69d]">
              {t('trustScore')} ({listing.farmer.ratingCount})
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/buyer/checkout/${listing.id}`)}
          disabled={listing.status !== 'ACTIVE'}
          className="h-14 w-full rounded-2xl bg-brand text-base font-bold text-white disabled:bg-gray-300"
        >
          {listing.status === 'ACTIVE' ? t('placeOrder') : listing.status}
        </button>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../components/AppShell';
import { useCrops } from '../../features/crops/useCrops';
import { cropEmoji, cropName } from '../../lib/cropDisplay';
import { StatusBadge } from '../../components/StatusBadge';
import { getMyListings, removeListing } from '../../features/listings/api';

export default function FarmerListings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: crops } = useCrops();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['listings', 'mine'],
    queryFn: getMyListings,
  });

  const removeMutation = useMutation({
    mutationFn: removeListing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] }),
  });

  return (
    <AppShell>
      <div className="px-[18px] pb-6 pt-[58px]">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-ink">{t('myListings')}</h1>
          <button
            onClick={() => navigate('/farmer/listings/new')}
            className="flex items-center gap-1.5 rounded-[13px] bg-brand px-3.5 py-2 text-[13.5px] font-bold text-white"
          >
            + {t('addListing')}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading && <div className="text-sm text-muted">…</div>}
          {!isLoading && listings?.length === 0 && (
            <div className="text-sm text-muted">{t('listingsEmpty')}</div>
          )}
          {listings?.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center gap-3.5 rounded-2xl border border-[#ECF0E9] bg-white p-3.5"
            >
              <div className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-2xl bg-bg text-[28px]">
                {cropEmoji(crops, listing.cropType)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-ink">
                  {cropName(crops, listing.cropType, i18n.language)}
                </div>
                <div className="font-num mt-0.5 text-[13px] text-[#7c887f]">
                  {listing.quantityKg} kg · ₵{listing.pricePerKg}/kg
                </div>
              </div>
              <div className="flex flex-none flex-col items-end gap-2">
                <StatusBadge status={listing.status} />
                {listing.status !== 'REMOVED' && (
                  <button
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(listing.id)}
                    className="text-[11px] font-bold text-red-500 disabled:opacity-50"
                  >
                    {t('removeButton')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

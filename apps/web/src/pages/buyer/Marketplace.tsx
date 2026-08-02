import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CROP_CATEGORY_KEYS, type CropCategory } from '@farmconnect/shared';
import { AppShell } from '../../components/AppShell';
import { cropName } from '../../lib/cropDisplay';
import { searchListings } from '../../features/listings/api';
import { useGeolocation } from '../../lib/useGeolocation';

const CATEGORY_LABEL_KEYS: Record<'all' | CropCategory, string> = {
  all: 'catAll',
  grains: 'catGrains',
  veg: 'catVeg',
  fruits: 'catFruits',
  tubers: 'catTubers',
};

export default function Marketplace() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | CropCategory>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['listings', 'search', { search, category, lat: geo.lat, lng: geo.lng }],
    queryFn: () =>
      searchListings({
        q: search || undefined,
        category: category === 'all' ? undefined : category,
        lat: geo.lat,
        lng: geo.lng,
      }),
  });

  return (
    <AppShell>
      <div className="sticky top-0 z-10 border-b border-[#EEF1EB] bg-white px-[18px] pb-4 pt-[54px]">
        <h1 className="mb-3.5 text-[23px] font-extrabold text-ink">🛒 {t('marketTitle')}</h1>
        <div className="flex h-12 items-center gap-2.5 rounded-2xl bg-bg px-3.5 focus-within:ring-2 focus-within:ring-brand">
          <span className="text-[#9aa69d]">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchAria')}
            className="w-full flex-1 border-none bg-transparent text-[14.5px] text-ink outline-none"
          />
        </div>
      </div>

      <div className="fc-scroll flex gap-2 overflow-x-auto px-[18px] pb-1 pt-3.5">
        {(['all', ...CROP_CATEGORY_KEYS] as const).map((key) => {
          const active = category === key;
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className="flex-none rounded-full border px-4 py-2 text-[13px] font-bold"
              style={{
                background: active ? '#1B7A3D' : '#fff',
                color: active ? '#fff' : '#5C6B61',
                borderColor: active ? '#1B7A3D' : '#E1E8DE',
              }}
            >
              {t(CATEGORY_LABEL_KEYS[key])}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-[18px] pb-6 pt-2">
        {isLoading && <div className="text-sm text-muted">…</div>}
        {!isLoading && data?.results.length === 0 && (
          <div className="text-sm text-muted">{t('marketEmpty')}</div>
        )}
        {data?.results.map((listing) => (
          <button
            key={listing.id}
            onClick={() => navigate(`/buyer/listings/${listing.id}`)}
            className="flex items-center gap-3.5 rounded-[18px] border border-[#ECF0E9] bg-white p-3.5 text-left shadow-sm"
          >
            <div className="flex h-[58px] w-[58px] flex-none items-center justify-center rounded-2xl bg-bg text-3xl">
              {listing.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-base font-bold text-ink">
                {cropName(listing.cropType, i18n.language)}
                {listing.coop && (
                  <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[10px] font-bold text-brand">
                    {listing.coop.name}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[12.5px] text-[#7c887f]">
                {listing.farmer.name} · {listing.regionLabel}
                {listing.farmer.isVerified && <span title={t('verifiedBadge')}>✔️</span>}
              </div>
              <div className="font-num mt-0.5 text-[12.5px] text-[#9aa69d]">
                {listing.quantityKg} kg
                {listing.distanceKm !== null && <> · 📍 {listing.distanceKm.toFixed(0)} km</>}
              </div>
            </div>
            <div className="flex-none text-right">
              <div className="font-num text-[17px] font-bold text-brand">₵{listing.pricePerKg}</div>
              <div className="text-[11px] font-semibold text-[#9aa69d]">{t('perKg')}</div>
            </div>
          </button>
        ))}
        {data && (
          <div className="pt-2 text-center text-xs font-semibold text-[#b3bdb4]">
            {data.total} {t('farmersNearby')}
          </div>
        )}
      </div>
    </AppShell>
  );
}

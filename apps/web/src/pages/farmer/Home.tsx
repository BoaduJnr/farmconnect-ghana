import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/AppShell';
import { ListingCard } from '../../components/ListingCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getMyListings } from '../../features/listings/api';
import { useAuthStore } from '../../store/authStore';

export default function FarmerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: listings, isLoading } = useQuery({
    queryKey: ['listings', 'mine'],
    queryFn: getMyListings,
  });

  const activeCount = listings?.filter((l) => l.status === 'ACTIVE').length ?? 0;
  const recent = listings?.slice(0, 3) ?? [];

  return (
    <AppShell>
      <div className="rounded-b-[26px] bg-gradient-to-br from-brand to-brand-dark px-[22px] pb-[26px] pt-[46px] text-white">
        <div className="text-sm font-medium text-white/80">{t('greeting')} 👋</div>
        <div className="mt-0.5 text-2xl font-extrabold tracking-tight">
          {user?.name ?? `+233 ${user?.phone.replace('+233', '')}`}
        </div>
        <div className="mt-5 flex gap-2.5">
          <div className="flex-1 rounded-2xl bg-white/15 p-3.5">
            <div className="font-num text-2xl font-bold">{activeCount}</div>
            <div className="mt-0.5 text-[11.5px] leading-tight text-white/80">{t('statListings')}</div>
          </div>
        </div>
      </div>

      <div className="px-[18px] py-[22px]">
        <button
          onClick={() => navigate('/advisory')}
          className="mb-[22px] flex w-full items-center gap-3.5 rounded-2xl border border-[#ECF0E9] bg-white p-4 text-left shadow-sm"
        >
          <div className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px] bg-brand-surface text-[22px]">
            🤖
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-ink">{t('quickAdvice')}</div>
            <div className="mt-0.5 text-xs text-[#7c887f]">{t('quickAdviceSub')}</div>
          </div>
          <span className="text-xl text-[#b3bdb4]">›</span>
        </button>

        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[17px] font-extrabold text-ink">{t('myListings')}</div>
          <button onClick={() => navigate('/farmer/listings')} className="text-[13px] font-bold text-brand">
            {t('viewAll')}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading && <div className="text-sm text-muted">…</div>}
          {!isLoading && recent.length === 0 && (
            <div className="text-sm text-muted">{t('homeEmptyListings')}</div>
          )}
          {recent.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => navigate('/farmer/listings')}
            />
          ))}
        </div>

        <div className="mt-5">
          <PrimaryButton onClick={() => navigate('/farmer/listings/new')}>
            + {t('addListing')}
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}

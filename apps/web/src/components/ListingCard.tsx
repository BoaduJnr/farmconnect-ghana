import { useTranslation } from 'react-i18next';
import { cropEmoji, cropName } from '../lib/cropDisplay';
import { StatusBadge } from './StatusBadge';
import type { Listing } from '../features/listings/types';

interface ListingCardProps {
  listing: Listing;
  onClick?: () => void;
  subtitle?: string;
}

export function ListingCard({ listing, onClick, subtitle }: Readonly<ListingCardProps>) {
  const { i18n } = useTranslation();

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-[#ECF0E9] bg-white p-3.5 text-left shadow-sm"
    >
      <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-2xl bg-bg text-2xl">
        {cropEmoji(listing.cropType)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[15.5px] font-bold text-ink">
          {cropName(listing.cropType, i18n.language)}
          {listing.coop && (
            <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[10px] font-bold text-brand">
              {listing.coop.name}
            </span>
          )}
        </div>
        <div className="font-num mt-0.5 text-[13px] text-[#7c887f]">
          {subtitle ?? `${listing.quantityKg} kg · ₵${listing.pricePerKg}/kg`}
        </div>
      </div>
      <StatusBadge status={listing.status} />
    </Wrapper>
  );
}

import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';
import { cropName } from '../lib/cropDisplay';
import { getPrices } from '../features/prices/api';

export default function Prices() {
  const { t, i18n } = useTranslation();

  const { data: prices, isLoading } = useQuery({
    queryKey: ['prices'],
    queryFn: getPrices,
    refetchInterval: 60_000,
  });

  return (
    <AppShell>
      <div className="px-[18px] pb-6 pt-[54px]">
        <h1 className="mb-1 text-2xl font-extrabold text-ink">📈 {t('pricesTitle')}</h1>
        <div className="mb-5 text-xs font-semibold text-muted">{t('pricesSub')}</div>

        <div className="flex flex-col gap-3">
          {isLoading && <div className="text-sm text-muted">…</div>}
          {prices?.map((row) => (
            <div
              key={row.cropType}
              className="flex items-center gap-3.5 rounded-[18px] border border-[#ECF0E9] bg-white p-3.5 shadow-sm"
            >
              <div className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-2xl bg-bg text-2xl">
                {row.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-ink">
                  {cropName(row.cropType, i18n.language)}
                </div>
                <div className="font-num mt-0.5 text-[13px] text-[#9aa69d]">
                  ₵{row.price.toFixed(2)} {t('perKg')}
                </div>
              </div>
              <div
                className="font-num flex-none text-[13.5px] font-bold"
                style={{ color: row.up ? '#1B7A3D' : '#C63A3A' }}
              >
                {row.up ? '▲' : '▼'} {Math.abs(row.changePct)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MomoSetup } from '../../components/MomoSetup';

export default function FarmerMomoSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg px-[22px] pb-8 pt-[58px]">
      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-2xl">
        📱
      </div>
      <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-ink">
        {t('momoSetupForcedTitle')}
      </h1>
      <p className="mb-7 text-[15px] leading-normal text-muted">{t('momoSetupForcedSub')}</p>

      <MomoSetup onSaved={() => navigate('/farmer/home', { replace: true })} />
    </div>
  );
}

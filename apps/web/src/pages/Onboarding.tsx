import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '../components/PrimaryButton';

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-brand to-brand-dark px-7 py-16 text-white">
      <div className="flex flex-1 flex-col items-start justify-center gap-6">
        <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[22px] bg-white/15 text-4xl">
          🌿
        </div>
        <div>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">
            FarmConnect <span className="text-brand-light">Ghana</span>
          </h1>
          <p className="mt-3.5 text-xl font-bold">{t('onboardTagline')}</p>
        </div>
        <p className="max-w-[300px] text-sm leading-relaxed text-white/80">{t('onboardSub')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <PrimaryButton className="!bg-white !text-brand-dark" onClick={() => navigate('/login')}>
          {t('getStarted')}
        </PrimaryButton>
        <PrimaryButton
          variant="ghost"
          className="!h-[50px] !bg-white/10 !text-sm !text-white"
          onClick={() => navigate('/login')}
        >
          {t('haveAccount')}
        </PrimaryButton>
      </div>
    </div>
  );
}

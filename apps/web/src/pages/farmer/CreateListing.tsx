import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CROPS, type CropType } from '@farmconnect/shared';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getMyCoop } from '../../features/coops/api';
import { createListing, uploadPhoto } from '../../features/listings/api';
import { useGeolocation } from '../../lib/useGeolocation';

const CROP_OPTIONS = Object.keys(CROPS) as CropType[];

export default function CreateListing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const geo = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropType, setCropType] = useState<CropType>('maize');
  const [quantityKg, setQuantityKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [regionLabel, setRegionLabel] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sellAsCoop, setSellAsCoop] = useState(false);

  const { data: coop } = useQuery({ queryKey: ['coops', 'mine'], queryFn: getMyCoop });

  const uploadMutation = useMutation({
    mutationFn: uploadPhoto,
    onMutate: () => setUploading(true),
    onSuccess: (data) => setPhotos((p) => [...p, data.url]),
    onSettled: () => setUploading(false),
  });

  const createMutation = useMutation({
    mutationFn: createListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] });
      navigate('/farmer/home', { replace: true });
    },
  });

  const canPublish = Boolean(quantityKg && pricePerKg && regionLabel) && !createMutation.isPending;

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    e.target.value = '';
  }

  function handlePublish() {
    if (!canPublish) return;
    createMutation.mutate({
      cropType,
      quantityKg: Number(quantityKg),
      pricePerKg: Number(pricePerKg),
      photos,
      lat: geo.lat,
      lng: geo.lng,
      regionLabel,
      sellAsCoop: coop ? sellAsCoop : undefined,
    });
  }

  return (
    <div className="min-h-screen bg-bg px-[22px] pb-8 pt-[58px]">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label={t('backAria')} className="text-2xl leading-none text-ink">
          ‹
        </button>
        <h1 className="text-[22px] font-extrabold text-ink">{t('createTitle')}</h1>
      </div>

      <label htmlFor="listing-crop-type" className="mb-1.5 block text-[13px] font-bold text-muted">
        {t('cropType')}
      </label>
      <select
        id="listing-crop-type"
        value={cropType}
        onChange={(e) => setCropType(e.target.value as CropType)}
        className="mb-[18px] h-[54px] w-full appearance-none rounded-2xl border-[1.5px] border-[#E1E8DE] bg-white px-3.5 text-[15px] font-semibold text-ink outline-none focus:border-brand"
      >
        {CROP_OPTIONS.map((key) => (
          <option key={key} value={key}>
            {CROPS[key][i18n.language === 'tw' ? 'tw' : 'en']}
          </option>
        ))}
      </select>

      <div className="mb-[18px] flex gap-3">
        <div className="flex-1">
          <label htmlFor="listing-quantity" className="mb-1.5 block text-[13px] font-bold text-muted">
            {t('quantity')}
          </label>
          <div className="flex h-[54px] items-center rounded-2xl border-[1.5px] border-[#E1E8DE] bg-white px-3.5 focus-within:border-brand">
            <input
              id="listing-quantity"
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="0"
              className="w-full flex-1 border-none text-[15px] font-semibold text-ink outline-none"
            />
            <span className="text-[13px] font-semibold text-[#9aa69d]">kg</span>
          </div>
        </div>
        <div className="flex-1">
          <label htmlFor="listing-price" className="mb-1.5 block text-[13px] font-bold text-muted">
            {t('pricePerKg')}
          </label>
          <div className="flex h-[54px] items-center rounded-2xl border-[1.5px] border-[#E1E8DE] bg-white px-3.5 focus-within:border-brand">
            <span className="text-[13px] font-semibold text-[#9aa69d]">₵</span>
            <input
              id="listing-price"
              value={pricePerKg}
              onChange={(e) => setPricePerKg(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="0.00"
              className="ml-1 w-full flex-1 border-none text-[15px] font-semibold text-ink outline-none"
            />
          </div>
        </div>
      </div>

      <label className="mb-1.5 block text-[13px] font-bold text-muted">{t('photos')}</label>
      <div className="mb-[18px] flex gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-[#C2CFC4] bg-white text-[#7c887f] disabled:opacity-50"
        >
          <span className="text-2xl">📷</span>
          <span className="text-[11px] font-semibold">{uploading ? '…' : t('addPhoto')}</span>
        </button>
        {photos.map((url) => (
          <img key={url} src={url} alt={t('uploadedPhotoAlt')} className="h-20 w-20 rounded-2xl object-cover" />
        ))}
      </div>

      <label htmlFor="listing-location" className="mb-1.5 block text-[13px] font-bold text-muted">
        {t('location')}
      </label>
      <div className="mb-7 flex items-center gap-2.5 rounded-2xl bg-brand-surface px-4 py-3.5 focus-within:ring-2 focus-within:ring-brand">
        <span className="text-lg">📍</span>
        <input
          id="listing-location"
          value={regionLabel}
          onChange={(e) => setRegionLabel(e.target.value)}
          placeholder={t('locationPlaceholder')}
          className="flex-1 border-none bg-transparent text-[14.5px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-[#9aa69d]"
        />
      </div>

      {coop && (
        <label className="mb-[18px] flex items-center gap-2.5 rounded-2xl bg-brand-surface px-4 py-3.5">
          <input
            type="checkbox"
            checked={sellAsCoop}
            onChange={(e) => setSellAsCoop(e.target.checked)}
            className="h-5 w-5 accent-brand"
          />
          <span className="text-[13.5px] font-semibold text-ink">
            {t('sellAsCoopPrefix')} {coop.name}
          </span>
        </label>
      )}

      <PrimaryButton disabled={!canPublish} onClick={handlePublish}>
        {createMutation.isPending ? '…' : t('publish')}
      </PrimaryButton>
    </div>
  );
}

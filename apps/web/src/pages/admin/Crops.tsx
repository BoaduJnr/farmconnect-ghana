import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CROP_CATEGORY_KEYS, type CropCategory } from '@farmconnect/shared';
import { AdminLayout } from '../../components/AdminLayout';
import { createCrop, listAllCropsAdmin, setCropActive } from '../../features/crops/api';

const CATEGORY_LABELS: Record<CropCategory, string> = {
  grains: 'Grains',
  legumes: 'Legumes',
  tubers: 'Tubers',
  veg: 'Vegetables',
  leafygreens: 'Leafy Greens',
  fruits: 'Fruits',
  cashcrops: 'Cash Crops',
};

const EMPTY_FORM = {
  key: '',
  emoji: '',
  category: CROP_CATEGORY_KEYS[0] as CropCategory,
  labelEn: '',
  labelTw: '',
  basePrice: '',
};

export default function AdminCrops() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: crops, isLoading } = useQuery({
    queryKey: ['admin', 'crops'],
    queryFn: listAllCropsAdmin,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'crops'] });
    // The public crop list (used across listings/prices/search) changes too.
    queryClient.invalidateQueries({ queryKey: ['crops'] });
  }

  const createMutation = useMutation({
    mutationFn: createCrop,
    onSuccess: () => {
      invalidate();
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: () => setFormError('Could not add crop — check the key isn’t already taken.'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, isActive }: { key: string; isActive: boolean }) => setCropActive(key, isActive),
    onSuccess: invalidate,
  });

  const canSubmit =
    form.emoji.trim().length > 0 &&
    form.labelEn.trim().length > 0 &&
    form.labelTw.trim().length > 0 &&
    Number(form.basePrice) > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    createMutation.mutate({
      key: form.key.trim() || undefined,
      emoji: form.emoji.trim(),
      category: form.category,
      labelEn: form.labelEn.trim(),
      labelTw: form.labelTw.trim(),
      basePrice: Number(form.basePrice),
    });
  }

  return (
    <AdminLayout>
      <div className="mb-5 rounded-2xl border border-[#ECF0E9] bg-white p-4">
        <div className="mb-3 text-sm font-bold text-ink">Add a crop</div>
        <div className="mb-2.5 flex gap-2">
          <input
            value={form.emoji}
            onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
            placeholder="🍈"
            aria-label="Emoji"
            className="h-11 w-16 rounded-xl border border-[#E1E8DE] px-2 text-center text-lg outline-none focus:border-brand"
          />
          <input
            value={form.labelEn}
            onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))}
            placeholder="English name (e.g. Durian)"
            aria-label="English name"
            className="h-11 flex-1 rounded-xl border border-[#E1E8DE] px-3 text-[13.5px] outline-none focus:border-brand"
          />
        </div>
        <div className="mb-2.5 flex gap-2">
          <input
            value={form.labelTw}
            onChange={(e) => setForm((f) => ({ ...f, labelTw: e.target.value }))}
            placeholder="Twi name"
            aria-label="Twi name"
            className="h-11 flex-1 rounded-xl border border-[#E1E8DE] px-3 text-[13.5px] outline-none focus:border-brand"
          />
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CropCategory }))}
            aria-label="Category"
            className="h-11 w-40 rounded-xl border border-[#E1E8DE] bg-white px-2 text-[13.5px] outline-none focus:border-brand"
          >
            {CROP_CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2.5 flex gap-2">
          <input
            value={form.basePrice}
            onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value.replace(/[^\d.]/g, '') }))}
            placeholder="Starting price, GH₵/kg"
            aria-label="Starting price per kg"
            inputMode="decimal"
            className="h-11 flex-1 rounded-xl border border-[#E1E8DE] px-3 text-[13.5px] outline-none focus:border-brand"
          />
          <input
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase() }))}
            placeholder="Key (optional — auto from name)"
            aria-label="Key (optional)"
            className="h-11 flex-1 rounded-xl border border-[#E1E8DE] px-3 text-[13.5px] outline-none focus:border-brand"
          />
        </div>
        {formError && <div className="mb-2 text-[12px] font-semibold text-[#C0413A]">{formError}</div>}
        <button
          type="button"
          disabled={!canSubmit || createMutation.isPending}
          onClick={handleSubmit}
          className="h-11 w-full rounded-xl bg-brand text-[13.5px] font-bold text-white disabled:opacity-50"
        >
          {createMutation.isPending ? '…' : 'Add crop'}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {isLoading && <div className="text-sm text-muted">…</div>}
        {crops?.map((crop) => (
          <div
            key={crop.key}
            className="flex items-center gap-3 rounded-2xl border border-[#ECF0E9] bg-white p-3.5"
          >
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-bg text-xl">
              {crop.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-ink">{crop.labelEn}</div>
              <div className="mt-0.5 text-[12px] text-muted">
                {crop.labelTw} · {CATEGORY_LABELS[crop.category]} · {crop.key}
              </div>
            </div>
            <button
              type="button"
              disabled={toggleMutation.isPending}
              onClick={() => toggleMutation.mutate({ key: crop.key, isActive: !crop.isActive })}
              className="h-9 flex-none rounded-xl px-3 text-[12.5px] font-bold disabled:opacity-50"
              style={{
                background: crop.isActive ? '#F7E5E5' : '#EAF4EC',
                color: crop.isActive ? '#C0413A' : '#1B7A3D',
              }}
            >
              {crop.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

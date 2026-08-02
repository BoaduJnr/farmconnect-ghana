import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCoop, getMyCoop, joinCoop, leaveCoop } from '../features/coops/api';
import { PrimaryButton } from './PrimaryButton';

/** Lets a farmer create or join a co-op (aggregated listings/joint negotiation, FR-10) — kept
 * simple: one co-op per farmer at a time, joined via a short shareable code. */
export function CoopManager() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const { data: coop, isLoading } = useQuery({ queryKey: ['coops', 'mine'], queryFn: getMyCoop });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['coops', 'mine'] });
  }

  const createMutation = useMutation({ mutationFn: () => createCoop(name), onSuccess: invalidate });
  const joinMutation = useMutation({ mutationFn: () => joinCoop(joinCode), onSuccess: invalidate });
  const leaveMutation = useMutation({ mutationFn: leaveCoop, onSuccess: invalidate });

  if (isLoading) {
    return <div className="text-sm text-muted">…</div>;
  }

  if (coop) {
    return (
      <div>
        <div className="mb-1 text-[15.5px] font-bold text-ink">{coop.name}</div>
        <div className="mb-3 text-xs text-muted">
          {t('coopJoinCodeLabel')} <span className="font-num font-bold text-ink">{coop.joinCode}</span> —{' '}
          {t('coopShareHint')}
        </div>
        <div className="mb-3 flex flex-col gap-1.5">
          {coop.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between text-[13px]">
              <span className="text-ink">{m.name}</span>
              <span className="font-bold text-muted">
                {m.role === 'LEADER' ? t('roleLeader') : t('roleMember')}
              </span>
            </div>
          ))}
        </div>
        <button
          disabled={leaveMutation.isPending}
          onClick={() => leaveMutation.mutate()}
          className="h-11 w-full rounded-xl bg-[#F7E5E5] text-[13px] font-bold text-[#C0413A] disabled:opacity-50"
        >
          {t('coopLeaveButton')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setMode('create')}
          className="flex-1 rounded-xl border-[1.5px] py-2 text-[13px] font-bold"
          style={{
            borderColor: mode === 'create' ? '#1B7A3D' : '#E1E8DE',
            color: mode === 'create' ? '#1B7A3D' : '#5C6B61',
            background: mode === 'create' ? '#EAF4EC' : '#fff',
          }}
        >
          {t('coopCreateTab')}
        </button>
        <button
          onClick={() => setMode('join')}
          className="flex-1 rounded-xl border-[1.5px] py-2 text-[13px] font-bold"
          style={{
            borderColor: mode === 'join' ? '#1B7A3D' : '#E1E8DE',
            color: mode === 'join' ? '#1B7A3D' : '#5C6B61',
            background: mode === 'join' ? '#EAF4EC' : '#fff',
          }}
        >
          {t('coopJoinTab')}
        </button>
      </div>

      {mode === 'create' ? (
        <div className="flex flex-col gap-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('coopNamePlaceholder')}
            aria-label={t('coopNamePlaceholder')}
            className="h-12 w-full rounded-xl border-[1.5px] border-[#E1E8DE] bg-white px-3.5 text-[14px] font-semibold text-ink outline-none focus:border-brand placeholder:font-normal placeholder:text-[#9aa69d]"
          />
          <PrimaryButton disabled={name.trim().length < 2 || createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? '…' : t('coopCreateButton')}
          </PrimaryButton>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t('coopJoinCodePlaceholder')}
            aria-label={t('coopJoinCodePlaceholder')}
            className="h-12 w-full rounded-xl border-[1.5px] border-[#E1E8DE] bg-white px-3.5 text-[14px] font-semibold uppercase tracking-widest text-ink outline-none focus:border-brand placeholder:font-normal placeholder:normal-case placeholder:text-[#9aa69d]"
          />
          <PrimaryButton disabled={joinCode.trim().length < 4 || joinMutation.isPending} onClick={() => joinMutation.mutate()}>
            {joinMutation.isPending ? '…' : t('coopJoinButton')}
          </PrimaryButton>
        </div>
      )}

      {(createMutation.isError || joinMutation.isError) && (
        <div className="mt-2 text-center text-xs font-semibold text-[#C0413A]">
          {t('coopGenericError')}
        </div>
      )}
    </div>
  );
}

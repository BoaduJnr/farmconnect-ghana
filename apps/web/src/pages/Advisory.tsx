import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/apiClient';
import { useGeolocation } from '../lib/useGeolocation';
import { getHistory, sendMessage, sendPhoto } from '../features/advisory/api';
import type { ChatMessage } from '../features/advisory/types';

const SUGGESTION_KEYS = ['q1', 'q2', 'q3', 'q4'] as const;

export default function Advisory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const geo = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['advisory', 'history'],
    queryFn: getHistory,
  });

  const messageMutation = useMutation({
    mutationFn: (text: string) => sendMessage(text, geo.lat, geo.lng),
    onSuccess: (result) => {
      queryClient.setQueryData<ChatMessage[]>(['advisory', 'history'], (prev = []) => [
        ...prev,
        result.userMessage,
        result.assistantMessage,
      ]);
      setInput('');
      setError(null);
    },
    onError: () => setError(t('advisoryErrorText')),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => sendPhoto(file, undefined, geo.lat, geo.lng),
    onSuccess: (result) => {
      queryClient.setQueryData<ChatMessage[]>(['advisory', 'history'], (prev = []) => [
        ...prev,
        result.userMessage,
        result.assistantMessage,
      ]);
      setError(null);
    },
    onError: () => setError(t('advisoryPhotoErrorText')),
  });

  const busy = messageMutation.isPending || photoMutation.isPending;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, busy]);

  function handleSend(text: string) {
    if (!text.trim() || busy) return;
    messageMutation.mutate(text.trim());
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      photoMutation.mutate(file);
    }
    e.target.value = '';
  }

  const showSuggestions = !isLoading && (history?.length ?? 0) === 0 && !busy;

  return (
    <div className="flex h-screen flex-col bg-bg">
      <div className="flex flex-none items-center gap-3 border-b border-[#EEF1EB] bg-white px-[18px] pb-3.5 pt-[50px]">
        <button onClick={() => navigate(-1)} aria-label={t('backAria')} className="text-2xl leading-none text-ink">
          ‹
        </button>
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-brand-surface text-[22px]">
          🤖
        </div>
        <div className="flex-1">
          <div className="text-base font-extrabold text-ink">{t('advisoryTitle')}</div>
          <div className="text-xs font-semibold text-brand">● {t('advisorySub')}</div>
        </div>
      </div>

      <div ref={scrollRef} className="fc-scroll flex-1 overflow-y-auto p-[18px]">
        <div className="flex flex-col gap-2.5">
          <div className="max-w-[80%] self-start rounded-[16px_16px_16px_4px] bg-white px-[15px] py-3 text-sm leading-relaxed text-ink shadow-sm">
            {t('botGreeting')}
          </div>

          {history?.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] px-[15px] py-3 text-sm leading-relaxed shadow-sm ${
                message.role === 'user'
                  ? 'self-end rounded-[16px_16px_4px_16px] bg-brand text-white'
                  : 'self-start rounded-[16px_16px_16px_4px] bg-white text-ink'
              }`}
            >
              {message.imageUrl && (
                <img
                  src={`${API_BASE_URL}${message.imageUrl}`}
                  alt={t('attachedPhotoAlt')}
                  className="mb-2 max-h-48 w-full rounded-xl object-cover"
                />
              )}
              {message.content}
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-1.5 self-start rounded-2xl bg-white px-4 py-3.5 shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:0.4s]" />
            </div>
          )}

          {error && <p className="self-center text-xs font-medium text-red-600">{error}</p>}

          {showSuggestions && (
            <div className="mt-1.5">
              <div className="mb-2 text-xs font-bold text-[#9aa69d]">{t('suggested')}</div>
              <div className="flex flex-col items-start gap-2">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleSend(t(key))}
                    className="rounded-2xl border border-[#d7e8da] bg-brand-surface px-3.5 py-2.5 text-left text-[13px] font-semibold text-brand"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-none items-center gap-2.5 border-t border-[#EEF1EB] bg-white px-4 py-3">
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
          disabled={busy}
          aria-label={t('attachPhotoAria')}
          className="text-2xl disabled:opacity-40"
        >
          📷
        </button>
        <div className="flex h-[46px] flex-1 items-center rounded-[22px] bg-bg px-4 focus-within:ring-2 focus-within:ring-brand">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder={t('askPlaceholder')}
            aria-label={t('chatInputAria')}
            className="w-full flex-1 border-none bg-transparent text-sm text-ink outline-none"
          />
        </div>
        <button
          onClick={() => handleSend(input)}
          disabled={busy || !input.trim()}
          aria-label={t('sendMessageAria')}
          className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full bg-brand text-lg text-white disabled:bg-gray-300"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

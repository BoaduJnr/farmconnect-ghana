import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyThread, sendMessage } from '../features/support/api';
import type { SupportMessage } from '../features/support/types';

export default function Support() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? undefined;
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['support', 'mine'],
    queryFn: getMyThread,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(content, orderId),
    onSuccess: (message) => {
      queryClient.setQueryData<SupportMessage[]>(['support', 'mine'], (prev = []) => [...prev, message]);
      setInput('');
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      <div className="flex flex-none items-center gap-3 border-b border-[#EEF1EB] bg-white px-[18px] pb-3.5 pt-[50px]">
        <button onClick={() => navigate(-1)} aria-label={t('backAria')} className="text-2xl leading-none text-ink">
          ‹
        </button>
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-brand-surface text-[22px]">
          💬
        </div>
        <div className="flex-1">
          <div className="text-base font-extrabold text-ink">{t('supportTitle')}</div>
          <div className="text-xs font-semibold text-brand">{t('supportSub')}</div>
        </div>
      </div>

      {orderId && (
        <div className="flex-none border-b border-[#EEF1EB] bg-brand-surface px-[18px] py-2 text-center text-[12px] font-bold text-brand">
          {t('supportOrderContext')} #{orderId.slice(-6)}
        </div>
      )}

      <div ref={scrollRef} className="fc-scroll flex-1 overflow-y-auto p-[18px]">
        <div className="flex flex-col gap-2.5">
          <div className="max-w-[80%] self-start rounded-[16px_16px_16px_4px] bg-white px-[15px] py-3 text-sm leading-relaxed text-ink shadow-sm">
            {t('supportGreeting')}
          </div>

          {isLoading && <div className="self-center text-sm text-muted">…</div>}

          {messages?.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] px-[15px] py-3 text-sm leading-relaxed shadow-sm ${
                message.sender === 'USER'
                  ? 'self-end rounded-[16px_16px_4px_16px] bg-brand text-white'
                  : 'self-start rounded-[16px_16px_16px_4px] bg-white text-ink'
              }`}
            >
              {message.orderId && (
                <div
                  className={`mb-1 text-[10.5px] font-bold ${
                    message.sender === 'USER' ? 'text-white/70' : 'text-muted'
                  }`}
                >
                  {t('supportOrderContext')} #{message.orderId.slice(-6)}
                </div>
              )}
              {message.content}
            </div>
          ))}

          {!isLoading && messages?.length === 0 && (
            <div className="self-center text-xs text-muted">{t('supportEmpty')}</div>
          )}
        </div>
      </div>

      <div className="flex flex-none items-center gap-2.5 border-t border-[#EEF1EB] bg-white px-4 py-3">
        <div className="flex h-[46px] flex-1 items-center rounded-[22px] bg-bg px-4 focus-within:ring-2 focus-within:ring-brand">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('supportPlaceholder')}
            aria-label={t('chatInputAria')}
            className="w-full flex-1 border-none bg-transparent text-sm text-ink outline-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sendMutation.isPending || !input.trim()}
          aria-label={t('sendMessageAria')}
          className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full bg-brand text-lg text-white disabled:bg-gray-300"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

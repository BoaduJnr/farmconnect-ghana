import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getThreadAdmin, sendMessageAdmin } from '../../features/support/api';
import type { SupportMessage } from '../../features/support/types';

export default function AdminSupportThread() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useParams<{ userId: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin', 'support', userId],
    queryFn: () => getThreadAdmin(userId!),
    enabled: Boolean(userId),
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessageAdmin(userId!, content),
    onSuccess: (message) => {
      queryClient.setQueryData<SupportMessage[]>(['admin', 'support', userId], (prev = []) => [
        ...prev,
        message,
      ]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
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
        <button
          onClick={() => navigate('/admin/support')}
          aria-label="Back"
          className="text-2xl leading-none text-ink"
        >
          ‹
        </button>
        <div className="text-base font-extrabold text-ink">Support thread</div>
      </div>

      <div ref={scrollRef} className="fc-scroll flex-1 overflow-y-auto p-[18px]">
        <div className="flex flex-col gap-2.5">
          {isLoading && <div className="self-center text-sm text-muted">…</div>}

          {messages?.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] px-[15px] py-3 text-sm leading-relaxed shadow-sm ${
                message.sender === 'ADMIN'
                  ? 'self-end rounded-[16px_16px_4px_16px] bg-brand text-white'
                  : 'self-start rounded-[16px_16px_16px_4px] bg-white text-ink'
              }`}
            >
              {message.orderId && (
                <div
                  className={`mb-1 text-[10.5px] font-bold ${
                    message.sender === 'ADMIN' ? 'text-white/70' : 'text-muted'
                  }`}
                >
                  Re: Order #{message.orderId.slice(-6)}
                </div>
              )}
              {message.content}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-none items-center gap-2.5 border-t border-[#EEF1EB] bg-white px-4 py-3">
        <div className="flex h-[46px] flex-1 items-center rounded-[22px] bg-bg px-4 focus-within:ring-2 focus-within:ring-brand">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Reply to this user…"
            aria-label="Reply message"
            className="w-full flex-1 border-none bg-transparent text-sm text-ink outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sendMutation.isPending || !input.trim()}
          aria-label="Send reply"
          className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full bg-brand text-lg text-white disabled:bg-gray-300"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

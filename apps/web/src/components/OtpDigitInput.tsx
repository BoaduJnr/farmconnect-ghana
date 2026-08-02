import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface OtpDigitInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export function OtpDigitInput({ value, onChange, length = 6 }: OtpDigitInputProps) {
  const { t } = useTranslation();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function setDigit(index: number, digit: string) {
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    onChange(nextDigits.join(''));
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          value={digit}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          inputMode="numeric"
          maxLength={1}
          aria-label={t('otpDigitAria', { position: i + 1, total: length })}
          className="h-16 w-full min-w-0 flex-1 rounded-2xl border-[1.5px] border-[#E1E8DE] bg-white text-center font-num text-2xl font-bold text-brand outline-none focus:border-brand"
        />
      ))}
    </div>
  );
}

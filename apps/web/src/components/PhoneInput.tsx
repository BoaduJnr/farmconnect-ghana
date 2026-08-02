interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
}

/** Local-format entry (no +233 prefix needed — @farmconnect/shared's phoneSchema normalizes it). */
export function PhoneInput({ value, onChange, placeholder = '24 123 4567', id, ariaLabel }: Readonly<PhoneInputProps>) {
  return (
    <div className="flex h-14 items-center gap-2.5 rounded-2xl border border-[#E1E8DE] bg-white px-4 focus-within:border-brand">
      <span className="text-base font-semibold text-ink">🇬🇭 +233</span>
      <div className="h-6 w-px bg-[#E1E8DE]" />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ''))}
        inputMode="numeric"
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full flex-1 border-none bg-transparent text-base font-semibold tracking-wide text-ink outline-none"
      />
    </div>
  );
}

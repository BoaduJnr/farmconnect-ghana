interface StarRatingInputProps {
  value: number;
  onChange: (stars: number) => void;
}

export function StarRatingInput({ value, onChange }: Readonly<StarRatingInputProps>) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-2xl leading-none"
          style={{ color: n <= value ? '#F0A63C' : '#DDE3D9' }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

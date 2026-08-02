import type { ButtonHTMLAttributes } from 'react';

type Variant = 'solid' | 'ghost';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  solid: 'bg-brand text-white disabled:bg-gray-300',
  ghost: 'bg-brand-surface text-brand disabled:text-gray-400 disabled:bg-gray-100',
};

/** 56px tall, full-width — meets the SRS's 48dp minimum tap target with room to spare. */
export function PrimaryButton({ variant = 'solid', className = '', ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`h-14 w-full rounded-2xl text-base font-bold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}

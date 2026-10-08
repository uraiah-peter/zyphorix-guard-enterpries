'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-px hover:shadow-blue-500/40 active:scale-[0.98] active:translate-y-0',
  secondary:
    'bg-[var(--card2)] text-[var(--text-primary)] border border-[var(--border2)] hover:border-blue-500/50 hover:bg-[var(--bg4)] hover:-translate-y-px active:scale-[0.98] active:translate-y-0',
  ghost:
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card2)] active:scale-[0.98]',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 active:scale-[0.98]',
  outline:
    'border border-[var(--border2)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm:   'h-7 px-3 text-xs gap-1.5 rounded-md',
  md:   'h-9 px-4 text-sm gap-2 rounded-lg',
  lg:   'h-11 px-6 text-sm gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
        {iconRight && !loading && (
          <span className="shrink-0">{iconRight}</span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

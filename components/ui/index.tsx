'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';
import { RISK_COLORS } from '@/lib/utils';

// ─── Badge ─────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default:  'bg-blue-500/10 text-blue-400 border border-blue-500/25',
  success:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  warning:  'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  danger:   'bg-red-500/10 text-red-400 border border-red-500/25',
  info:     'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
  outline:  'border border-[var(--border2)] text-[var(--text-secondary)]',
};

export function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        badgeVariants[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', {
          'bg-blue-400': variant === 'default',
          'bg-emerald-400': variant === 'success',
          'bg-amber-400': variant === 'warning',
          'bg-red-400': variant === 'danger',
          'bg-cyan-400': variant === 'info',
        })} />
      )}
      {children}
    </span>
  );
}

// ─── Risk Badge ────────────────────────────────────────────────────────────

export function RiskBadge({ level }: { level: RiskLevel }) {
  const colors = RISK_COLORS[level];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border',
      colors.bg, colors.text, colors.border
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
      {level}
    </span>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
}

export function Card({ children, className, padding = true, hover = false }: CardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-[var(--border)] bg-[var(--card)]',
      padding && 'p-5',
      hover && 'transition-all duration-150 hover:border-blue-500/35 hover:bg-[var(--card2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(59,130,246,0.08)] cursor-pointer',
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-sm font-semibold text-[var(--text-primary)]', className)}>
      {children}
    </h3>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 px-3 rounded-lg text-sm',
              'bg-[var(--bg3)] border border-[var(--border2)]',
              'text-[var(--text-primary)] placeholder:text-[var(--text-faint)]',
              'transition-colors outline-none',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ─── Textarea ──────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm resize-y min-h-[80px]',
            'bg-[var(--bg3)] border border-[var(--border2)]',
            'text-[var(--text-primary)] placeholder:text-[var(--text-faint)]',
            'transition-colors outline-none',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            error && 'border-red-500/60',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ─── Select ────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-9 px-3 rounded-lg text-sm cursor-pointer',
            'bg-[var(--bg3)] border border-[var(--border2)]',
            'text-[var(--text-primary)]',
            'transition-colors outline-none',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            error && 'border-red-500/60',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ─── Avatar ────────────────────────────────────────────────────────────────

interface AvatarProps {
  name?: string | null;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };

export function Avatar({ name, image, size = 'md', className }: AvatarProps) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (image) {
    return (
      <img
        src={image}
        alt={name ?? 'User'}
        className={cn('rounded-full object-cover border border-[var(--border)]', avatarSizes[size], className)}
      />
    );
  }

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
      'bg-gradient-to-br from-blue-600 to-indigo-600 text-white',
      avatarSizes[size],
      className
    )}>
      {initials}
    </div>
  );
}

// ─── Spinner ───────────────────────────────────────────────────────────────

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-2' };
  return (
    <div className={cn(
      'rounded-full border-[var(--border2)] border-t-blue-400',
      sizes[size],
      'animate-spin',
      className
    )} />
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'animate-pulse rounded-lg bg-[var(--card2)]',
      className
    )} />
  );
}

// ─── Section Header ────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-[var(--text-faint)] opacity-60">{icon}</div>
      <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
      {description && <p className="text-xs text-[var(--text-muted)] max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-[var(--border)]', className)} />;
}

// ─── Error Banner ──────────────────────────────────────────────────────────
// Inline, dismissible error message for failed mutations (e.g. permission
// denied, network errors). Use instead of silently swallowing fetch failures.

export function ErrorBanner({ message, onDismiss, className }: {
  message: string; onDismiss?: () => void; className?: string;
}) {
  return (
    <div
      className={cn('flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm', className)}
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 hover:text-white transition-colors" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  accentColor?: string;
}

export function StatCard({ label, value, sub, icon, trend, accentColor = '#3b82f6' }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
          {trend && (
            <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)} {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-[var(--text-faint)] opacity-40 text-2xl">{icon}</div>
        )}
      </div>
    </Card>
  );
}

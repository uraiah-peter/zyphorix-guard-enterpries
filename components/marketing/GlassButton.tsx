import Link from 'next/link';
import type { ReactNode } from 'react';

interface GlassButtonProps {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
  className?: string;
}

export function GlassButton({ href, children, variant = 'secondary', icon, className = '' }: GlassButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Link
      href={href}
      className={`glow-btn ${isPrimary ? 'marketing-button-primary' : 'marketing-button-secondary'} inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm transition-all ${className}`}
      style={
        isPrimary
          ? { background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', boxShadow: '0 0 24px rgba(59,130,246,0.35)' }
          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.18)', color: '#cbd5e1' }
      }
    >
      {children}
      {icon}
    </Link>
  );
}

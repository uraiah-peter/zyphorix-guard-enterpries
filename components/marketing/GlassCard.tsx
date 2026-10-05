import type { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  lift?: boolean;
}

/**
 * Restrained by default — a dark surface with a thin, cool border. No glow.
 * Glow is reserved for a small, deliberate set of elements (CTAs, the
 * popular pricing plan, the product showcase) applied explicitly where
 * needed, not baked into every card as a default.
 */
export function GlassCard({ children, className = '', style, lift = false }: GlassCardProps) {
  return (
    <div
      className={`marketing-glass ${lift ? 'card-lift' : ''} rounded-2xl ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgba(19,32,58,0.62), rgba(7,13,27,0.48))',
        border: '1px solid rgba(147,197,253,0.18)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

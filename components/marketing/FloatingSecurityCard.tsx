import type { ReactNode, CSSProperties } from 'react';

interface FloatingSecurityCardProps {
  icon: ReactNode;
  label: string;
  detail: string;
  accentColor: string;
  position: CSSProperties;
  delay: string;
}

/**
 * Positioned only from lg (1024px) upward — below that, the surrounding
 * margin around the product showcase isn't wide enough for an
 * absolutely-positioned card to sit outside the panel without either
 * clipping past the viewport edge or colliding with the page's own
 * horizontal padding. That's what was causing the collision/overlap
 * problem at tablet widths. Below lg, these don't render at all — the
 * showcase stands on its own rather than something breaking.
 */
export function FloatingSecurityCard({ icon, label, detail, accentColor, position, delay }: FloatingSecurityCardProps) {
  return (
    <div
      className="hidden lg:flex items-start gap-2.5 rounded-xl px-4 py-3 animate-fade-up"
      style={{
        position: 'absolute',
        maxWidth: 200,
        background: 'linear-gradient(145deg, rgba(19,32,58,0.78), rgba(7,13,27,0.66))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(147,197,253,0.2)',
        boxShadow: '0 16px 38px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        animationDelay: delay,
        ...position,
      }}
    >
      <span className="flex-shrink-0 mt-0.5" style={{ color: accentColor }}>{icon}</span>
      <div>
        <p className="text-xs font-semibold" style={{ color: accentColor }}>{label}</p>
        <p className="text-xs" style={{ color: '#94a3b8' }}>{detail}</p>
      </div>
    </div>
  );
}

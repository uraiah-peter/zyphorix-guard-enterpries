import { Check } from 'lucide-react';
import { GlassButton } from './GlassButton';

interface Plan {
  id: string; name: string; price: number | null; period: string | null;
  description: string; features: string[]; cta: string; popular: boolean;
}

export function PricingCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`marketing-glass card-lift rounded-2xl p-6 flex flex-col h-full ${plan.popular ? 'xl:scale-[1.04]' : ''}`}
      style={
        plan.popular
          ? {
              background: 'linear-gradient(165deg, rgba(37,99,235,0.28), rgba(15,23,42,0.58))',
              border: '1px solid rgba(96,165,250,0.5)',
              boxShadow: '0 18px 56px rgba(37,99,235,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
            }
          : {
              background: 'rgba(15,23,42,0.42)',
              border: '1px solid rgba(147,197,253,0.16)',
            }
      }
    >
      {plan.popular ? (
        <span className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold mb-4 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(59,130,246,0.18)', color: '#93c5fd' }}>
          Most popular
        </span>
      ) : (
        <div className="mb-4 h-[26px]" /> // reserves the same vertical space so every card's price line starts at an identical height
      )}

      <p className="text-base font-semibold mb-1">{plan.name}</p>
      <p className="text-xs mb-5" style={{ color: '#94a3b8', minHeight: 32 }}>{plan.description}</p>

      <div className="mb-5 pb-5" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
        {plan.price === null ? (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>Custom</span>
        ) : (
          <>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>${plan.price}</span>
            {plan.period && <span className="text-sm ml-1" style={{ color: '#94a3b8' }}>{plan.period}</span>}
          </>
        )}
      </div>

      <ul className="space-y-3 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs leading-relaxed">
            <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: plan.popular ? '#60a5fa' : '#64748b' }} />
            <span style={{ color: '#cbd5e1' }}>{f}</span>
          </li>
        ))}
      </ul>

      <GlassButton
        href="/register"
        variant={plan.popular ? 'primary' : 'secondary'}
        className="w-full !px-4 !py-2.5 text-xs"
      >
        {plan.cta}
      </GlassButton>
    </div>
  );
}

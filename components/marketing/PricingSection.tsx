import { PLANS } from '@/lib/marketing-content';
import { PricingCard } from './PricingCard';

export function PricingSection() {
  return (
    <section id="pricing" className="marketing-section relative max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24" style={{ zIndex: 1, borderTop: '1px solid rgba(148,163,184,0.08)' }}>
      <div className="text-center max-w-lg mx-auto mb-14 animate-fade-up">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }} className="mb-2">
          Simple pricing, every tier
        </h2>
        <p className="text-sm" style={{ color: '#94a3b8' }}>No setup fees. No annual lock-in required.</p>
      </div>

      {/* 1 col (mobile) → 2 col (sm, 640px) → 3 col (lg, 1024px) → 5 col
          (xl, 1280px). The previous md:grid-cols-5 crammed all five cards
          into ~700px of space at tablet widths — this steps through
          properly across the full range instead. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 xl:gap-4 animate-stagger items-stretch">
        {PLANS.map((plan) => (
          <PricingCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}

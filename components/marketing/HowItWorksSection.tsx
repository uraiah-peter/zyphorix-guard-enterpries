import { HOW_IT_WORKS } from '@/lib/marketing-content';
import { GlassCard } from './GlassCard';

export function HowItWorksSection() {
  return (
    <section className="marketing-section relative max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24" style={{ zIndex: 1, borderTop: '1px solid rgba(148,163,184,0.08)' }}>
      <div className="text-center max-w-lg mx-auto mb-14 animate-fade-up">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>How it works</h2>
        <p className="mt-3 text-sm" style={{ color: '#94a3b8' }}>From signup to your first scan result in under five minutes.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
        {HOW_IT_WORKS.map((s) => (
          <GlassCard key={s.step} lift className="p-6">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'rgba(96,165,250,0.35)' }}>{s.step}</span>
            <h3 className="text-base font-semibold mt-3 mb-2">{s.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{s.body}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
